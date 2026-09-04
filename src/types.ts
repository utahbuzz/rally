export interface Point {
  x: number
  y: number
}

export type Team = 'O' | 'D'

/** circle = standard offense, square = center, text = defense letter */
export type PlayerShape = 'circle' | 'square' | 'triangle' | 'text'

export interface Player {
  id: string
  team: Team
  label: string
  x: number
  y: number
  shape: PlayerShape
  /** Marker colour for this one player; overrides the display setting. */
  fill?: string
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
  /**
   * Where the ball is spotted down the field, as yards to the opponent's goal
   * line (1-99, so 8 = the +8 and 95 = your own 5). Undefined is open field,
   * where neither end zone is in view.
   */
  yardsToGoal?: number
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

/** Field units per yard, and the depth of an end zone. */
export const YARD = 10
export const END_ZONE = 10 * YARD

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

/**
 * Where the ball is spotted down the field. Coaches call these off a call
 * sheet by situation, so the list is situations rather than every yard line.
 */
export const FIELD_SPOTS: Array<{ label: string; yardsToGoal?: number }> = [
  { label: 'Open field', yardsToGoal: undefined },
  { label: '+25 — red zone', yardsToGoal: 25 },
  { label: '+20', yardsToGoal: 20 },
  { label: '+15', yardsToGoal: 15 },
  { label: '+12', yardsToGoal: 12 },
  { label: '+10', yardsToGoal: 10 },
  { label: '+7', yardsToGoal: 7 },
  { label: '+5', yardsToGoal: 5 },
  { label: '+3', yardsToGoal: 3 },
  { label: '+1 — goal line', yardsToGoal: 1 },
  { label: 'Own 10', yardsToGoal: 90 },
  { label: 'Own 5 — coming out', yardsToGoal: 95 },
  { label: 'Own 2', yardsToGoal: 98 },
]

/** How player markers are drawn. A view preference, not part of a play. */
export type LabelMode = 'position' | 'number' | 'none'
export type FillMode = 'white' | 'team' | 'group'
export type ShapeMode = 'auto' | PlayerShape

export interface DisplaySettings {
  labels: LabelMode
  fill: FillMode
  offShape: ShapeMode
  defShape: ShapeMode
  offColor: string
  defColor: string
}

export const DEFAULT_DISPLAY: DisplaySettings = {
  labels: 'position',
  fill: 'white',
  offShape: 'auto',
  defShape: 'auto',
  offColor: '#2563eb',
  defColor: '#e11d48',
}

export const ROUTE_COLORS = [
  '#e11d48', // rose
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#0f172a', // ink
]

/** Marker fills. White first so a player can be put back to the default look. */
export const MARKER_COLORS = [
  '#ffffff',
  '#0f172a',
  '#2563eb',
  '#e11d48',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
]

export type PositionGroup = 'OL' | 'QB' | 'RB' | 'WR' | 'DL' | 'LB' | 'DB'

export const GROUP_COLORS: Record<PositionGroup, string> = {
  OL: '#64748b',
  QB: '#7c3aed',
  RB: '#059669',
  WR: '#2563eb',
  DL: '#b91c1c',
  LB: '#e11d48',
  DB: '#d97706',
}

export const GROUP_LABELS: Record<PositionGroup, string> = {
  OL: 'O-line',
  QB: 'QB',
  RB: 'Backs',
  WR: 'WR / TE',
  DL: 'D-line',
  LB: 'Linebackers',
  DB: 'Secondary',
}

const OL_LABELS = new Set(['C', 'LT', 'LG', 'RG', 'RT', 'T', 'G', 'FST', 'FSG', 'BST', 'BSG'])
const QB_LABELS = new Set(['QB', 'Q'])
const RB_LABELS = new Set(['RB', 'FB', 'HB', 'TB', 'A', 'B', 'F'])
const DL_LABELS = new Set(['E', 'T', 'DE', 'DT', 'NT', 'NG', 'R'])
const LB_LABELS = new Set(['M', 'W', 'S', 'J', 'B', 'LB', 'ROV', 'MIKE', 'WILL', 'SAM'])

/** Which position group a player belongs to, for colour-coding. */
export function positionGroup(p: Player): PositionGroup {
  const label = p.label.toUpperCase()
  if (p.team === 'O') {
    if (OL_LABELS.has(label)) return 'OL'
    if (QB_LABELS.has(label)) return 'QB'
    if (RB_LABELS.has(label)) return 'RB'
    return 'WR'
  }
  // "N" is a nose on the line but a nickel in the secondary — depth tells them apart
  if (label === 'N') return p.y > FIELD.LOS - 30 ? 'DL' : 'DB'
  if (DL_LABELS.has(label)) return 'DL'
  if (LB_LABELS.has(label)) return 'LB'
  return 'DB'
}

/** Readable ink for a label sitting on `fill`. */
export function textOn(fill: string): string {
  const hex = fill.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return '#0f172a'
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  // relative luminance, sRGB weights
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0f172a' : '#ffffff'
}

/** The fill a player's marker should get under these display settings. */
export function markerFill(p: Player, d: DisplaySettings): string {
  if (p.fill) return p.fill
  if (d.fill === 'team') return p.team === 'O' ? d.offColor : d.defColor
  if (d.fill === 'group') return GROUP_COLORS[positionGroup(p)]
  return '#ffffff'
}

/** The shape a player's marker should take under these display settings. */
export function markerShape(p: Player, d: DisplaySettings): PlayerShape {
  const mode = p.team === 'O' ? d.offShape : d.defShape
  return mode === 'auto' ? p.shape : mode
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
