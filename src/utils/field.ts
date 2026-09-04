/**
 * Spotting a formation across the field.
 *
 * Sliding every player rigidly with the ball is wrong: a receiver aligned 8
 * yards off the boundary cannot move another 6.6 yards toward that sideline
 * when the ball goes to the hash. In reality the box (line and backs) travels
 * with the ball while detached players align off the sideline, so their splits
 * compress into the boundary and open up to the field.
 *
 * These helpers model that: everything within BOX of the ball shifts rigidly,
 * and the part of a player's split beyond the box scales with the space
 * actually available on that side. The transform is monotonic and invertible,
 * so re-spotting a play from hash to hash round-trips cleanly.
 */
import { END_ZONE, FIELD, YARD } from '../types'

/** Half-width of the rigid box either side of the ball, in 0.1yd units. */
const BOX = 60
/** Keep players this far off the sideline. */
const MARGIN = 20

function spaces(ballX: number): { left: number; right: number } {
  return {
    left: Math.max(ballX - BOX - MARGIN, 1),
    right: Math.max(FIELD.W - MARGIN - (ballX + BOX), 1),
  }
}

/** Place a midfield-referenced x at a ball spot. */
export function spotFromMid(xMid: number, ballX: number): number {
  const offset = xMid - FIELD.BALL_X
  const inside = Math.max(-BOX, Math.min(BOX, offset))
  const excess = offset - inside
  if (excess === 0) return ballX + inside
  const from = spaces(FIELD.BALL_X)
  const to = spaces(ballX)
  const scale = excess > 0 ? to.right / from.right : to.left / from.left
  return ballX + inside + excess * scale
}

/** Inverse of spotFromMid: what midfield x does this spotted x correspond to. */
export function midFromSpot(x: number, ballX: number): number {
  const offset = x - ballX
  const inside = Math.max(-BOX, Math.min(BOX, offset))
  const excess = offset - inside
  if (excess === 0) return FIELD.BALL_X + inside
  const from = spaces(FIELD.BALL_X)
  const to = spaces(ballX)
  const scale = excess > 0 ? to.right / from.right : to.left / from.left
  return FIELD.BALL_X + inside + excess / scale
}

/** Move an x from one ball spot to another, compressing into the boundary. */
export function respot(x: number, fromBallX: number, toBallX: number): number {
  if (fromBallX === toBallX) return x
  return spotFromMid(midFromSpot(x, fromBallX), toBallX)
}

/* ------------------------------------------------------------------ *
 * Spotting a play down the field.
 *
 * The canvas shows 26 yards downfield of the LOS and 14 behind it. Once the
 * ball is inside the 26 the opponent's goal line is really on screen, and the
 * play has to fit the space that is left: at the +8 there is no 15-yard dig,
 * because the back line of the end zone is 18 yards away.
 *
 * Depth compresses the same way splits do at a hash. The front — everything
 * within RIGID_DEPTH of the LOS — does not move, because a defensive end and
 * a linebacker line up where they line up whatever the yard line. Beyond
 * that, the space downfield scales to what is actually in front of the ball,
 * so deep safeties walk down and vertical routes shorten into the end zone.
 * The transform is anchored to open-field depth rather than to the play's own
 * contents, which makes it invertible: moving the ball out of the red zone
 * gives back the play you drew.
 * ------------------------------------------------------------------ */

/** Depth either side of which alignment stops moving, in 0.1yd units. */
const RIGID_DEPTH = 50
/** Deepest drawable point in the open field. */
const OPEN_DEPTH = FIELD.LOS - 6

/** y of the opponent's goal line for a ball spot (may be off-canvas). */
export function goalLineY(yardsToGoal?: number): number | null {
  if (yardsToGoal == null) return null
  return FIELD.LOS - yardsToGoal * YARD
}

/** y of your own goal line, behind the offense (may be off-canvas). */
export function ownGoalLineY(yardsToGoal?: number): number | null {
  if (yardsToGoal == null) return null
  return FIELD.LOS + (100 - yardsToGoal) * YARD
}

/** The deepest y anything can reach: the back line of the end zone. */
export function depthCapY(yardsToGoal?: number): number {
  const goal = goalLineY(yardsToGoal)
  return goal == null ? 6 : Math.max(6, goal - END_ZONE)
}

/** The deepest y behind the offense: the back of its own end zone. */
function backCapY(yardsToGoal?: number): number {
  const own = ownGoalLineY(yardsToGoal)
  return own == null ? FIELD.H - 6 : Math.min(FIELD.H - 6, own + END_ZONE)
}

/** Goal to go — no first down to be had, so no marker is drawn. */
export function isGoalToGo(yardsToGoal?: number): boolean {
  return yardsToGoal != null && yardsToGoal <= 10
}

function depthScale(yardsToGoal?: number): number {
  const capD = FIELD.LOS - depthCapY(yardsToGoal)
  return Math.min(1, (capD - RIGID_DEPTH) / (OPEN_DEPTH - RIGID_DEPTH))
}

/** Put an open-field y into the space available at this field position. */
export function compressDepth(y: number, yardsToGoal?: number): number {
  if (y >= FIELD.LOS) return Math.min(y, backCapY(yardsToGoal))
  const d = FIELD.LOS - y
  if (d <= RIGID_DEPTH) return y
  return FIELD.LOS - (RIGID_DEPTH + (d - RIGID_DEPTH) * depthScale(yardsToGoal))
}

/** Inverse of compressDepth: what open-field y does this y correspond to. */
export function expandDepth(y: number, yardsToGoal?: number): number {
  if (y >= FIELD.LOS) return y
  const d = FIELD.LOS - y
  if (d <= RIGID_DEPTH) return y
  const k = depthScale(yardsToGoal)
  if (k === 0) return y
  return FIELD.LOS - (RIGID_DEPTH + (d - RIGID_DEPTH) / k)
}

/** Move a y from one field position to another. */
export function redepth(y: number, from?: number, to?: number): number {
  if (from === to) return y
  return compressDepth(expandDepth(y, from), to)
}
