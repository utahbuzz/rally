import { Play, Player, Point } from '../types'

/** Where a player's pre-snap motion puts him, if he has one. */
export function motionEnd(routes: Play['routes'], playerId: string): Point | null {
  const m = routes.find((r) => r.playerId === playerId && r.kind === 'motion')
  return m && m.points.length > 1 ? m.points[m.points.length - 1] : null
}

/**
 * Where a player's route should begin.
 *
 * A receiver who motions across the formation runs his route from where the
 * motion put him, not from where he lined up — so the two lines join instead
 * of both trailing back to his original alignment. It also decides which way
 * the route mirrors: motion across the ball flips the side he is on.
 */
export function routeOrigin(routes: Play['routes'], player: Player): Point {
  return motionEnd(routes, player.id) ?? { x: player.x, y: player.y }
}

/** True when a route continues on from this player's motion. */
export function motionLeadsToRoute(routes: Play['routes'], playerId: string): boolean {
  return routes.some((r) => r.playerId === playerId && r.kind !== 'motion' && r.points.length > 1)
}
