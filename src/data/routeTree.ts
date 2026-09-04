import { FIELD, Player, Point, RouteKind } from '../types'
import { compressDepth, expandDepth } from '../utils/field'

/**
 * Quick routes are defined for a player on the RIGHT side of the ball,
 * where +x runs toward that player's sideline and -y is upfield.
 * For players left of the ball the x offsets are mirrored automatically.
 */
export interface QuickRoute {
  name: string
  kind: RouteKind
  points: Point[]
}

export const QUICK_ROUTES: QuickRoute[] = [
  { name: 'Go', kind: 'route', points: [{ x: 0, y: -150 }] },
  { name: 'Post', kind: 'route', points: [{ x: 0, y: -90 }, { x: -55, y: -150 }] },
  { name: 'Corner', kind: 'route', points: [{ x: 0, y: -90 }, { x: 50, y: -145 }] },
  { name: 'Out', kind: 'route', points: [{ x: 0, y: -60 }, { x: 62, y: -62 }] },
  { name: 'Dig', kind: 'route', points: [{ x: 0, y: -60 }, { x: -85, y: -62 }] },
  { name: 'Curl', kind: 'route', points: [{ x: 0, y: -65 }, { x: -14, y: -48 }] },
  { name: 'Slant', kind: 'route', points: [{ x: 0, y: -18 }, { x: -60, y: -70 }] },
  { name: 'Hitch', kind: 'route', points: [{ x: 0, y: -50 }, { x: 12, y: -38 }] },
  { name: 'Flat', kind: 'route', points: [{ x: 12, y: -6 }, { x: 62, y: -16 }] },
  { name: 'Drag', kind: 'route', points: [{ x: 0, y: -16 }, { x: -130, y: -30 }] },
  { name: 'Wheel', kind: 'route', points: [{ x: 45, y: -8 }, { x: 68, y: -45 }, { x: 68, y: -140 }] },
  { name: 'Swing', kind: 'route', points: [{ x: 45, y: 8 }, { x: 80, y: -4 }] },
]

export const QUICK_ASSIGNMENTS: QuickRoute[] = [
  { name: 'Pass Pro', kind: 'block', points: [{ x: 0, y: -9 }] },
  { name: 'Drive Blk', kind: 'block', points: [{ x: 6, y: -16 }] },
  { name: 'Pull Rt', kind: 'block', points: [{ x: 0, y: 12 }, { x: 55, y: 10 }, { x: 72, y: -12 }] },
  { name: 'Pull Lt', kind: 'block', points: [{ x: 0, y: 12 }, { x: -55, y: 10 }, { x: -72, y: -12 }] },
  { name: 'Lead', kind: 'block', points: [{ x: 0, y: -30 }, { x: 14, y: -52 }] },
  { name: 'Blitz', kind: 'route', points: [{ x: 0, y: -46 }] },
]

/**
 * Build absolute route points for a player from a quick-route template.
 * `ballX` is where the ball is spotted: routes mirror by which side of the
 * BALL the player is on, not the middle of the field, so the library still
 * reads correctly when a play is spotted on a hash.
 *
 * `yardsToGoal` is where the ball sits down the field. The route is built at
 * its full open-field depth and then compressed into the space in front of
 * the ball, so clicking "Go" at the +7 draws a fade that finishes in the end
 * zone instead of one drawn off the top of the canvas.
 */
export function materializeQuickRoute(
  player: Player,
  template: QuickRoute,
  ballX: number = FIELD.BALL_X,
  yardsToGoal?: number,
): Point[] {
  const onRight = player.x >= ballX
  // Defenders attack downward (+y is toward the offense for them already,
  // since templates use -y = upfield); flip y for defense so routes go toward the LOS.
  const flipY = player.team === 'D' ? -1 : 1
  const flipX = onRight ? 1 : -1
  // keep routes on the canvas — a wide receiver spotted on the boundary hash
  // would otherwise run its break clean off the field
  // the template is drawn against open-field depth, so start from where this
  // player would be standing there and compress the finished route back down
  const baseY = expandDepth(player.y, yardsToGoal)
  const pts = template.points.map((p) => ({
    x: Math.min(Math.max(player.x + p.x * flipX, 6), FIELD.W - 6),
    y: baseY + p.y * flipY,
  }))
  return [{ x: baseY, y: baseY }, ...pts].map((p, i) => ({
    x: i === 0 ? player.x : p.x,
    y: compressDepth(p.y, yardsToGoal),
  }))
}
