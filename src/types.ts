export interface Point {
  x: number
  y: number
}

export type Team = 'O' | 'D'

/** circle = standard offense, square = center, text = defense letter */
export type PlayerShape = 'circle' | 'square' | 'text'

export interface Player {
  id: string
  team: Team
  label: string
  x: number
  y: number
  shape: PlayerShape
}

export type RouteKind = 'route' | 'block' | 'motion'

export interface Route {
  id: string
  playerId: string
  kind: RouteKind
  color: string
  /** absolute field coords; first point is the player's center at draw time */
  points: Point[]
}

export interface Play {
  id: string
  name: string
  /** Where the ball is spotted across the field. Defaults to FIELD.BALL_X. */
  ballX?: number
  offFormation: string
  defFormation: string
  tags: string[]
  notes: string
  players: Player[]
  routes: Route[]
  updatedAt: number
}

export type Tool = 'select' | 'route' | 'block' | 'motion'

/** Field geometry, in units of 0.1 yard */
export const FIELD = {
  W: 533, // 53.3 yards wide
  H: 400, // 40 yards shown: 26 downfield + 14 backfield
  LOS: 260, // line of scrimmage y
  BALL_X: 266.5,
  FIRST_DOWN: 160, // 10 yards downfield
  HASH_L: 200,
  HASH_R: 333,
}

/**
 * Ball spots across the width of the field, matching the hash notation
 * coaches use on practice scripts (L / LM / RM / R plus middle of field).
 * Hash marks sit 40 feet apart, i.e. 20 yards in from each sideline.
 */
export const HASH_SPOTS: Array<{ id: string; label: string; x: number }> = [
  { id: 'L', label: 'L', x: FIELD.HASH_L },
  { id: 'LM', label: 'LM', x: (FIELD.HASH_L + FIELD.BALL_X) / 2 },
  { id: 'MOF', label: 'Mid', x: FIELD.BALL_X },
  { id: 'RM', label: 'RM', x: (FIELD.BALL_X + FIELD.HASH_R) / 2 },
  { id: 'R', label: 'R', x: FIELD.HASH_R },
]

/** Nearest named spot for a ball x (used to highlight the active hash). */
export function hashIdForX(x: number | undefined): string {
  const bx = x ?? FIELD.BALL_X
  let best = HASH_SPOTS[2]
  for (const spot of HASH_SPOTS) {
    if (Math.abs(spot.x - bx) < Math.abs(best.x - bx)) best = spot
  }
  return best.id
}

export const ROUTE_COLORS = [
  '#e11d48', // rose
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#0f172a', // ink
]

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
