/**
 * Build a complete play from a high-level spec (formation + assignments).
 * Used by the in-app AI coordinator so it draws plays through exactly the
 * same formation, route and hash code as the canvas.
 */
import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS, findFormation } from '../data/formations'
import { materializeQuickRoute, QUICK_ASSIGNMENTS, QUICK_ROUTES } from '../data/routeTree'
import { FIELD, HASH_SPOTS, Play, Player, Point, Route, RouteKind, ROUTE_COLORS, uid } from '../types'
import { spotFromMid } from './field'

const COLOR_NAMES: Record<string, string> = {
  red: ROUTE_COLORS[0],
  blue: ROUTE_COLORS[1],
  green: ROUTE_COLORS[2],
  orange: ROUTE_COLORS[3],
  purple: ROUTE_COLORS[4],
  black: ROUTE_COLORS[5],
}

const ALL_TEMPLATES = [...QUICK_ROUTES, ...QUICK_ASSIGNMENTS]

export interface AssignmentSpec {
  player: string
  route?: string
  custom_path?: Point[]
  kind?: RouteKind
  color?: string
}

export interface PlaySpec {
  name: string
  offense_formation: string
  defense_formation?: string
  hash?: string
  tags?: string[]
  notes?: string
  assignments?: AssignmentSpec[]
}

export const OFFENSE_NAMES = OFFENSE_FORMATIONS.map((f) => f.name)
export const DEFENSE_NAMES = DEFENSE_FORMATIONS.map((f) => f.name)
export const ROUTE_NAMES = QUICK_ROUTES.map((r) => r.name)
export const BLOCK_NAMES = QUICK_ASSIGNMENTS.map((r) => r.name)

export function buildPlay(spec: PlaySpec): { play?: Play; problems: string[] } {
  const problems: string[] = []
  const off = findFormation('O', spec.offense_formation)
  if (!off) {
    return { problems: [`Unknown offensive formation "${spec.offense_formation}". Valid: ${OFFENSE_NAMES.join(', ')}`] }
  }
  const def = spec.defense_formation ? findFormation('D', spec.defense_formation) : undefined
  if (spec.defense_formation && !def) {
    problems.push(`Unknown defensive front "${spec.defense_formation}" — drew offense only.`)
  }

  const spot = HASH_SPOTS.find((h) => h.id === (spec.hash ?? 'MOF')) ?? HASH_SPOTS[2]
  const players: Player[] = [...off.players(), ...(def ? def.players() : [])].map((p) => ({
    ...p,
    x: spotFromMid(p.x, spot.x),
  }))

  const routes: Route[] = []
  for (const a of spec.assignments ?? []) {
    const player =
      players.find((p) => p.team === 'O' && p.label === a.player) ??
      players.find((p) => p.label === a.player)
    if (!player) {
      problems.push(`no player labelled "${a.player}" in ${off.name}`)
      continue
    }
    const color = COLOR_NAMES[(a.color ?? 'red').toLowerCase()] ?? ROUTE_COLORS[0]
    let points: Point[]
    let kind: RouteKind
    if (a.custom_path?.length) {
      const dir = player.team === 'O' ? -1 : 1
      points = [
        { x: player.x, y: player.y },
        ...a.custom_path.map((p) => ({
          x: Math.min(Math.max(player.x + p.x * 10, 6), FIELD.W - 6),
          y: Math.min(Math.max(player.y + p.y * 10 * dir, 6), FIELD.H - 6),
        })),
      ]
      kind = a.kind ?? 'route'
    } else if (a.route) {
      const template = ALL_TEMPLATES.find((t) => t.name.toLowerCase() === a.route!.toLowerCase())
      if (!template) {
        problems.push(`unknown route "${a.route}" for ${a.player}`)
        continue
      }
      points = materializeQuickRoute(player, template, spot.x)
      kind = a.kind ?? template.kind
    } else {
      problems.push(`${a.player} needs a route or custom_path`)
      continue
    }
    routes.push({ id: uid(), playerId: player.id, kind, color, points })
  }

  return {
    play: {
      id: uid(),
      name: spec.name,
      ballX: spot.x,
      offFormation: off.name,
      defFormation: def?.name ?? '',
      tags: spec.tags ?? [],
      notes: spec.notes ?? '',
      players,
      routes,
      updatedAt: Date.now(),
    },
    problems,
  }
}
