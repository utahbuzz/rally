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
import { FIELD } from '../types'

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
