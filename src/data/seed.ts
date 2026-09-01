import { Play, Route, ROUTE_COLORS, uid } from '../types'
import { findFormation } from './formations'
import { materializeQuickRoute, QUICK_ROUTES, QUICK_ASSIGNMENTS } from './routeTree'

function quick(name: string) {
  const t = [...QUICK_ROUTES, ...QUICK_ASSIGNMENTS].find((q) => q.name === name)
  if (!t) throw new Error(`unknown quick route ${name}`)
  return t
}

interface SeedSpec {
  name: string
  off: string
  def?: string
  tags: string[]
  notes: string
  /** player label -> quick route name (+ optional color index) */
  assignments: Array<[string, string, number?]>
}

const SPECS: SeedSpec[] = [
  {
    name: 'Gun Spread — 4 Verts',
    off: 'Gun Spread (2x2)',
    def: 'Nickel 4-2-5',
    tags: ['Pass', 'Shot'],
    notes: 'Seams read the safety. RB checks Mike, then swings.',
    assignments: [
      ['X', 'Go', 0],
      ['H', 'Go', 1],
      ['Y', 'Go', 1],
      ['Z', 'Go', 0],
      ['RB', 'Swing', 3],
      ['LT', 'Pass Pro', 5],
      ['LG', 'Pass Pro', 5],
      ['C', 'Pass Pro', 5],
      ['RG', 'Pass Pro', 5],
      ['RT', 'Pass Pro', 5],
    ],
  },
  {
    name: 'Trips Rt — Flood',
    off: 'Gun Trips Rt',
    tags: ['Pass', '3rd Down'],
    notes: 'Three-level stretch to the right. Read Corner > Out > Flat.',
    assignments: [
      ['Z', 'Corner', 0],
      ['Y', 'Out', 1],
      ['H', 'Flat', 2],
      ['X', 'Dig', 4],
      ['RB', 'Pass Pro', 5],
      ['LT', 'Pass Pro', 5],
      ['LG', 'Pass Pro', 5],
      ['C', 'Pass Pro', 5],
      ['RG', 'Pass Pro', 5],
      ['RT', 'Pass Pro', 5],
    ],
  },
  {
    name: 'I-Form — Power Rt',
    off: 'I-Form 21',
    def: '4-3 Over',
    tags: ['Run', 'Short Yardage'],
    notes: 'Backside guard pulls. FB kicks out the end, RB follows through B-gap.',
    assignments: [
      ['LG', 'Pull Rt', 5],
      ['FB', 'Lead', 5],
      ['RB', 'Lead', 0],
      ['LT', 'Drive Blk', 5],
      ['C', 'Drive Blk', 5],
      ['RG', 'Drive Blk', 5],
      ['RT', 'Drive Blk', 5],
      ['Y', 'Drive Blk', 5],
      ['X', 'Go', 1],
      ['Z', 'Slant', 1],
    ],
  },
]

export function seedPlays(): Play[] {
  return SPECS.map((spec, i) => {
    const off = findFormation('O', spec.off)!
    const def = spec.def ? findFormation('D', spec.def) : undefined
    const players = [...off.players(), ...(def ? def.players() : [])]
    const routes: Route[] = []
    for (const [label, routeName, colorIdx] of spec.assignments) {
      const player = players.find((p) => p.team === 'O' && p.label === label)
      if (!player) continue
      const t = quick(routeName)
      routes.push({
        id: uid(),
        playerId: player.id,
        kind: t.kind,
        color: ROUTE_COLORS[colorIdx ?? 0],
        points: materializeQuickRoute(player, t),
      })
    }
    return {
      id: uid(),
      name: spec.name,
      offFormation: spec.off,
      defFormation: spec.def ?? '',
      tags: spec.tags,
      notes: spec.notes,
      players,
      routes,
      updatedAt: Date.now() - i * 60_000,
    }
  })
}
