import { FIELD, Player, Point, RouteKind } from '../types'

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

/** Build absolute route points for a player from a quick-route template. */
export function materializeQuickRoute(player: Player, template: QuickRoute): Point[] {
  const onRight = player.x >= FIELD.BALL_X
  // Defenders attack downward (+y is toward the offense for them already,
  // since templates use -y = upfield); flip y for defense so routes go toward the LOS.
  const flipY = player.team === 'D' ? -1 : 1
  const flipX = onRight ? 1 : -1
  const pts = template.points.map((p) => ({
    x: player.x + p.x * flipX,
    y: player.y + p.y * flipY,
  }))
  return [{ x: player.x, y: player.y }, ...pts]
}
