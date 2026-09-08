import { QuickRoute } from './routeTree'

/**
 * A concept is a whole play in one click.
 *
 * Coaches do not call routes receiver by receiver — they call "Smash" and the
 * five jobs follow from it. Each assignment names the positions it could
 * belong to, in order of preference, so one concept lands correctly whether
 * the formation calls its inside receiver H, W or U.
 */
export interface ConceptAssignment {
  /** First label present in the formation gets the job. */
  labels: string[]
  route: string
  /** Where it sits in the progression. */
  read?: string
  color?: string
}

export interface Concept {
  name: string
  kind: 'pass' | 'run'
  /** How the line blocks when the concept is applied. */
  block: 'Pass Pro' | 'Drive Blk'
  notes: string
  tags: string[]
  assignments: ConceptAssignment[]
  /** Extra jobs defined as raw paths — pulls and ball-carrier tracks. */
  custom?: Array<{ labels: string[]; template: QuickRoute }>
}

const R = 'red'
const B = 'blue'
const G = 'green'
const O = 'orange'
const P = 'purple'

export const CONCEPTS: Concept[] = [
  {
    name: 'Smash',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Quick'],
    notes: 'High-low on the corner. He sinks to the corner, throw the hitch; he squats, throw over him.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Corner', read: '1', color: R },
      { labels: ['Z'], route: 'Hitch', read: '2', color: B },
      { labels: ['X'], route: 'Go', read: '3', color: G },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Swing', read: 'C', color: O },
      { labels: ['H', 'W', 'U'], route: 'Dig', read: '4', color: P },
    ],
  },
  {
    name: 'Four Verts',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Shot'],
    notes: 'Seams read the safety. Single high, bend one seam across his face; two high, work the hash.',
    assignments: [
      { labels: ['H', 'W', 'U'], route: 'Go', read: '1', color: B },
      { labels: ['Y'], route: 'Go', read: '2', color: B },
      { labels: ['Z'], route: 'Go', read: '3', color: R },
      { labels: ['X'], route: 'Go', read: '4', color: R },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Swing', read: 'C', color: O },
    ],
  },
  {
    name: 'Mesh',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Man beater'],
    notes: 'Two crossers rub underneath. Man coverage, take the crosser away from traffic; zone, sit them down.',
    assignments: [
      { labels: ['H', 'W', 'U'], route: 'Drag', read: '1', color: R },
      { labels: ['Y'], route: 'Drag', read: '2', color: B },
      { labels: ['Z'], route: 'Corner', read: '3', color: G },
      { labels: ['X'], route: 'Curl', read: '4', color: P },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Swing', read: 'C', color: O },
    ],
  },
  {
    name: 'Flood',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', '3rd Down'],
    notes: 'Three levels to one side. Read the flat defender high to low: corner, out, flat.',
    assignments: [
      { labels: ['Z'], route: 'Go', read: '1', color: R },
      { labels: ['Y', 'H', 'W', 'U'], route: 'Out', read: '2', color: B },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Flat', read: '3', color: O },
      { labels: ['X'], route: 'Dig', read: '4', color: G },
      { labels: ['H', 'W', 'U'], route: 'Drag', color: P },
    ],
  },
  {
    name: 'Stick',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Quick', '3rd Down'],
    notes: 'Quick game answer to short yardage. Flat defender widens, sit it down; he squats, throw the flat.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Hitch', read: '1', color: R },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Flat', read: '2', color: O },
      { labels: ['Z'], route: 'Out', read: '3', color: B },
      { labels: ['X'], route: 'Slant', read: '4', color: G },
      { labels: ['H', 'W', 'U'], route: 'Drag', color: P },
    ],
  },
  {
    name: 'Snag',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Red Zone'],
    notes: 'Triangle: spot, corner, flat. Works the flat defender both ways in tight space.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Curl', read: '1', color: R },
      { labels: ['Z'], route: 'Corner', read: '2', color: B },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Flat', read: '3', color: O },
      { labels: ['X'], route: 'Slant', read: '4', color: G },
      { labels: ['H', 'W', 'U'], route: 'Drag', color: P },
    ],
  },
  {
    name: 'Dagger',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Shot'],
    notes: 'Seam clears the middle, dig comes in behind it. Best against two-high.',
    assignments: [
      { labels: ['H', 'W', 'U'], route: 'Go', read: '2', color: B },
      { labels: ['Y', 'Z'], route: 'Dig', read: '1', color: R },
      { labels: ['X'], route: 'Curl', read: '3', color: G },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Swing', read: 'C', color: O },
      { labels: ['Z'], route: 'Go', read: '4', color: G },
    ],
  },
  {
    name: 'Levels',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Man beater'],
    notes: 'Two in-breakers at different depths on the same defender. Throw off his depth.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Slant', read: '2', color: B },
      { labels: ['X'], route: 'Dig', read: '1', color: R },
      { labels: ['Z'], route: 'Go', read: '3', color: G },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Flat', read: 'C', color: O },
      { labels: ['H', 'W', 'U'], route: 'Drag', color: P },
    ],
  },
  {
    name: 'Slants',
    kind: 'pass',
    block: 'Pass Pro',
    tags: ['Pass', 'Quick'],
    notes: 'Everybody slants. Beats press and pressure — ball out on three.',
    assignments: [
      { labels: ['X'], route: 'Slant', read: '1', color: R },
      { labels: ['Z'], route: 'Slant', read: '2', color: B },
      { labels: ['Y', 'H', 'W', 'U'], route: 'Slant', read: '3', color: G },
      { labels: ['RB', 'A', 'B', 'F'], route: 'Flat', read: 'C', color: O },
      { labels: ['H', 'W', 'U'], route: 'Slant', color: P },
    ],
  },
  {
    name: 'Inside Zone',
    kind: 'run',
    block: 'Drive Blk',
    tags: ['Run'],
    notes: 'Line steps playside. Back presses the A gap and cuts off the first down lineman.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Drive Blk', color: 'black' },
    ],
    custom: [
      {
        labels: ['RB', 'A', 'B', 'F'],
        template: { name: 'IZ track', kind: 'route', points: [{ x: 8, y: 22 }, { x: 14, y: 62 }] },
      },
    ],
  },
  {
    name: 'Power',
    kind: 'run',
    block: 'Drive Blk',
    tags: ['Run', 'Short Yardage'],
    notes: 'Down block playside, backside guard pulls and kicks. Back follows the guard.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Drive Blk', color: 'black' },
    ],
    custom: [
      { labels: ['LG', 'BSG'], template: { name: 'Pull', kind: 'block', points: [{ x: 0, y: 12 }, { x: 55, y: 10 }, { x: 72, y: -12 }] } },
      { labels: ['RB', 'A', 'B', 'F'], template: { name: 'Power track', kind: 'route', points: [{ x: 4, y: 20 }, { x: 34, y: 64 }] } },
    ],
  },
  {
    name: 'Counter',
    kind: 'run',
    block: 'Drive Blk',
    tags: ['Run'],
    notes: 'Back takes a counter step away, then follows the pullers back the other way.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Drive Blk', color: 'black' },
    ],
    custom: [
      { labels: ['RG', 'FSG'], template: { name: 'Pull', kind: 'block', points: [{ x: 0, y: 12 }, { x: -55, y: 10 }, { x: -72, y: -12 }] } },
      { labels: ['RB', 'A', 'B', 'F'], template: { name: 'Counter track', kind: 'route', points: [{ x: 22, y: 4 }, { x: -18, y: 30 }, { x: -40, y: 64 }] } },
    ],
  },
  {
    name: 'Sweep',
    kind: 'run',
    block: 'Drive Blk',
    tags: ['Run'],
    notes: 'Get the edge. Back presses wide and turns up off the last block.',
    assignments: [
      { labels: ['Y', 'H', 'W', 'U'], route: 'Drive Blk', color: 'black' },
    ],
    custom: [
      {
        labels: ['RB', 'A', 'B', 'F'],
        template: { name: 'Sweep track', kind: 'route', points: [{ x: 40, y: 8 }, { x: 78, y: 18 }, { x: 92, y: 58 }] },
      },
    ],
  },
]

export const PASS_CONCEPTS = CONCEPTS.filter((c) => c.kind === 'pass')
export const RUN_CONCEPTS = CONCEPTS.filter((c) => c.kind === 'run')

export function findConcept(name: string): Concept | undefined {
  return CONCEPTS.find((c) => c.name.toLowerCase() === name.toLowerCase())
}
