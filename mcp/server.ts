/**
 * Playcaller MCP server.
 *
 * Exposes play-design tools to any MCP client (Claude Desktop, Claude Code,
 * claude.ai). Plays are written to a playbook JSON file in the app's backup
 * format — open Playcaller and use "Restore" to load it.
 *
 * Run: npx tsx mcp/server.ts
 * Playbook file: $PLAYCALLER_PLAYBOOK or ./playcaller-playbook.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { FIELD, Play, Player, Point, Route, ROUTE_COLORS, uid } from '../src/types'
import { DEFENSE_FORMATIONS, OFFENSE_FORMATIONS, findFormation } from '../src/data/formations'
import { QUICK_ROUTES, QUICK_ASSIGNMENTS, materializeQuickRoute } from '../src/data/routeTree'

const PLAYBOOK_PATH = resolve(process.env.PLAYCALLER_PLAYBOOK ?? 'playcaller-playbook.json')

// Cloud mode: set PLAYCALLER_PLAYBOOK_ID (the uuid from the app's share link)
// and plays go straight to the coach's cloud playbook — the open app updates
// live. Without it, plays are written to the local JSON file above.
const PLAYBOOK_ID = process.env.PLAYCALLER_PLAYBOOK_ID ?? ''
const SUPA_URL = process.env.SUPABASE_URL ?? 'https://vxvsmmpriqkkkshgnqhh.supabase.co'
const SUPA_KEY = process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_WRhDxUgk24aB6-JF-dMLfw_GV3noVnx'
const CLOUD = /^[0-9a-f-]{36}$/i.test(PLAYBOOK_ID)

let sb: SupabaseClient | null = null
let syncChannel: RealtimeChannel | null = null

function cloud(): SupabaseClient {
  if (!sb) sb = createClient(SUPA_URL, SUPA_KEY)
  return sb
}

/** Nudge any open Playcaller app on this playbook to re-pull. Best-effort. */
async function pingApps(): Promise<void> {
  try {
    if (!syncChannel) {
      const ch = cloud().channel(`pb:${PLAYBOOK_ID}`)
      await new Promise<void>((res) => {
        const timer = setTimeout(res, 3000)
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer)
            res()
          }
        })
      })
      syncChannel = ch
    }
    await syncChannel.send({ type: 'broadcast', event: 'sync', payload: { from: 'mcp' } })
  } catch {
    // the app's fallback poll picks the change up anyway
  }
}

const COLOR_NAMES: Record<string, string> = {
  red: ROUTE_COLORS[0],
  blue: ROUTE_COLORS[1],
  green: ROUTE_COLORS[2],
  orange: ROUTE_COLORS[3],
  purple: ROUTE_COLORS[4],
  black: ROUTE_COLORS[5],
}

const ALL_TEMPLATES = [...QUICK_ROUTES, ...QUICK_ASSIGNMENTS]

const storeLabel = CLOUD ? `cloud playbook ${PLAYBOOK_ID}` : PLAYBOOK_PATH

async function loadPlaybook(): Promise<Play[]> {
  if (CLOUD) {
    const { data, error } = await cloud().rpc('playcaller_get_plays', { pbid: PLAYBOOK_ID })
    if (error) throw new Error(`cloud read failed: ${error.message}`)
    return (data ?? []) as Play[]
  }
  if (!existsSync(PLAYBOOK_PATH)) return []
  try {
    const data = JSON.parse(readFileSync(PLAYBOOK_PATH, 'utf8'))
    return Array.isArray(data) ? data : (data.plays ?? [])
  } catch {
    return []
  }
}

/** Add one play; returns the new playbook size. */
async function addPlay(play: Play): Promise<number> {
  if (CLOUD) {
    const { error } = await cloud().rpc('playcaller_put_play', { pbid: PLAYBOOK_ID, play })
    if (error) throw new Error(`cloud write failed: ${error.message}`)
    await pingApps()
    return (await loadPlaybook()).length
  }
  const plays = await loadPlaybook()
  plays.unshift(play)
  savePlaybookFile(plays)
  return plays.length
}

/** Remove a play by name; returns remaining count, or null if not found. */
async function removePlay(name: string): Promise<number | null> {
  const plays = await loadPlaybook()
  const target = plays.find((p) => p.name === name)
  if (!target) return null
  if (CLOUD) {
    const { error } = await cloud().rpc('playcaller_delete_play', { pbid: PLAYBOOK_ID, play_id: target.id })
    if (error) throw new Error(`cloud delete failed: ${error.message}`)
    await pingApps()
    return plays.length - 1
  }
  const next = plays.filter((p) => p.id !== target.id)
  savePlaybookFile(next)
  return next.length
}

function savePlaybookFile(plays: Play[]): void {
  const payload = { app: 'playcaller', version: 1, exportedAt: new Date().toISOString(), plays }
  writeFileSync(PLAYBOOK_PATH, JSON.stringify(payload, null, 2))
}

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] }
}

const COVERAGE_GUIDE: Record<string, string> = {
  'cover 0': 'All-out man, no deep help. Beat it with: quick game (Slant, Hitch) before the blitz arrives, Go routes to your best matchup, RB Swing as a hot outlet, max protect + double moves. Suggested pairing: Gun Spread with Slants + RB Swing; keep 6 in protection on shot plays.',
  'cover 1': 'Man free — one deep safety. Beat it with: crossers and Drags (rubs beat man), Wheel from the backfield, Post to occupy the free safety while a Corner wins outside, Bunch alignments to create natural picks. Suggested: Gun Bunch Rt with a mesh of Drag + Corner + Flat.',
  'cover 2': 'Two deep safeties, corners squat in the flats. Weak spots: the honey hole (deep outside behind the corner, in front of the safety), the deep middle seam, and the flats stretched vertically. Best concepts: Smash (Hitch under + Corner over), Flood (Corner/Out/Flat three-level), 4 Verts (seams split the safeties), and Dig behind the LBs. Suggested: Trips Rt Flood; Gun Spread 4 Verts with seams by H and Y.',
  'cover 3': 'Three deep, four under. Weak spots: the flats and the seams between curl defenders. Best concepts: Curl-Flat combos, Out routes under the deep third, Drive/Dig concepts, Flood to the boundary, RB Swing to stretch the flat defender. Four verts also stresses the middle-third safety with two seams.',
  'cover 4': 'Quarters — four deep, safeties read #2. Weak spots: the flats (only 3 under defenders) and play-action to freeze safeties reading run. Best concepts: Out + Flat combinations, Curl-Flat, deep Post off play-action when safeties bite, Drag series underneath.',
  'cover 6': 'Quarter-quarter-half — treat the half-field side like Cover 2 (attack the honey hole with Smash/Corner) and the quarters side like Cover 4 (attack the flat).',
  '2-man': 'Two deep, man under with trail technique. Beat it with: Wheel and crossing routes that outrun trailers, back-shoulder Go balls, RB matchups on LBs, rub concepts from Bunch. Avoid: comeback routes into trail leverage.',
  'man press': 'Press man at the line. Beat it with: Slants off a quick release, Fade/Go when you win off the line, rub/pick concepts from stacked or Bunch alignments, Drag mesh underneath, motion to identify man and create a running start. Short yardage: Slant + Flat rub from Bunch is near-automatic.',
  'blitz': 'Extra rushers, thin coverage behind. Beat it with: hot routes (Slant, quick Flat, RB Swing), screens into the vacated area, max protection with a two-man route of Go + Post at your best matchup.',
}

const server = new McpServer({ name: 'playcaller', version: '0.1.0' })

server.registerTool(
  'list_formations',
  {
    title: 'List formations',
    description:
      'List every offensive formation and defensive front Playcaller knows, with the player labels each one provides. Use these exact names in create_play.',
  },
  async () => {
    const off = OFFENSE_FORMATIONS.map(
      (f) => `- "${f.name}" — players: ${f.players().map((p) => p.label).join(', ')}`,
    ).join('\n')
    const def = DEFENSE_FORMATIONS.map(
      (f) => `- "${f.name}" — players: ${f.players().map((p) => p.label).join(', ')}`,
    ).join('\n')
    return text(`OFFENSE:\n${off}\n\nDEFENSE (optional, for scout looks):\n${def}`)
  },
)

server.registerTool(
  'get_route_library',
  {
    title: 'Get route library',
    description:
      'List the route and blocking assignment names Playcaller can draw. Routes are auto-mirrored by which side of the ball the player lines up on ("Out" always breaks toward the sideline, "Dig" toward the middle).',
  },
  async () => {
    const routes = QUICK_ROUTES.map((r) => `- ${r.name}`).join('\n')
    const blocks = QUICK_ASSIGNMENTS.map((r) => `- ${r.name} (${r.kind})`).join('\n')
    return text(
      `ROUTES (arrow ending):\n${routes}\n\nBLOCKS & SPECIAL (T-bar ending for blocks):\n${blocks}\n\nColors: red, blue, green, orange, purple, black.\nCustom paths are also supported via create_play's custom_path (yards relative to the player, +y = upfield, +x = toward the right sideline).`,
    )
  },
)

server.registerTool(
  'coverage_guide',
  {
    title: 'Coverage guide',
    description:
      'Get coaching notes on how to attack a defensive coverage or situation (cover 0/1/2/3/4/6, 2-man, man press, blitz). Use this before designing plays against a named coverage.',
    inputSchema: { coverage: z.string().describe('e.g. "cover 2", "man press", "blitz"') },
  },
  async ({ coverage }) => {
    const key = coverage.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
    const match = Object.keys(COVERAGE_GUIDE).find((k) => key.includes(k))
    if (!match) {
      return text(
        `No specific guide for "${coverage}". Available: ${Object.keys(COVERAGE_GUIDE).join(', ')}.`,
      )
    }
    return text(COVERAGE_GUIDE[match])
  },
)

type AssignmentInput = {
  player: string
  route?: string
  custom_path?: { x: number; y: number }[]
  kind?: Route['kind']
  color?: string
}

/** Materialize route assignments against a set of players (shared by both play tools). */
function buildRoutes(players: Player[], assignments: AssignmentInput[]): { routes: Route[]; problems: string[] } {
  const routes: Route[] = []
  const problems: string[] = []
  for (const a of assignments) {
    const player =
      players.find((p) => p.team === 'O' && p.label === a.player) ??
      players.find((p) => p.label === a.player)
    if (!player) {
      problems.push(`no player labeled "${a.player}" in this play`)
      continue
    }
    const color = COLOR_NAMES[(a.color ?? 'red').toLowerCase()] ?? ROUTE_COLORS[0]
    let points: Point[]
    let kind: Route['kind']
    if (a.custom_path && a.custom_path.length > 0) {
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
        problems.push(`unknown route "${a.route}" for ${a.player} (see get_route_library)`)
        continue
      }
      points = materializeQuickRoute(player, template)
      kind = a.kind ?? template.kind
    } else {
      problems.push(`assignment for ${a.player} needs a route or custom_path`)
      continue
    }
    routes.push({ id: uid(), playerId: player.id, kind, color, points })
  }
  return { routes, problems }
}

const assignmentSchema = z.object({
  player: z.string().describe('Player label from the formation, e.g. "X", "Z", "RB", "LT"'),
  route: z
    .string()
    .optional()
    .describe('Route or assignment name from get_route_library, e.g. "Corner", "Pass Pro"'),
  custom_path: z
    .array(z.object({ x: z.number(), y: z.number() }))
    .optional()
    .describe(
      'Custom path in yards relative to the player: +y is upfield (toward the defense), +x is toward the right sideline. Overrides route.',
    ),
  kind: z
    .enum(['route', 'block', 'motion'])
    .optional()
    .describe('Line style for custom paths: route = arrow, block = T-bar, motion = dashed'),
  color: z.string().optional().describe('red, blue, green, orange, purple, or black'),
})

server.registerTool(
  'create_play',
  {
    title: 'Create a play',
    description:
      'Create a football play and save it to the Playcaller playbook file. Uses exact formation names from list_formations and route names from get_route_library. Unassigned OL should usually get "Pass Pro" on pass plays or "Drive Blk" on runs. The coach loads the file in Playcaller via Restore.',
    inputSchema: {
      name: z.string().describe('Play name, e.g. "Trips Rt — Smash"'),
      offense_formation: z.string().describe('Exact name from list_formations'),
      defense_formation: z
        .string()
        .optional()
        .describe('Optional defensive front to show as a scout look'),
      tags: z.array(z.string()).optional().describe('e.g. ["Pass", "3rd Down", "vs Cover 2"]'),
      notes: z.string().optional().describe('Coaching notes: read progression, protection, keys'),
      assignments: z.array(assignmentSchema).describe('One entry per player who gets a route/block'),
    },
  },
  async ({ name, offense_formation, defense_formation, tags, notes, assignments }) => {
    const off = findFormation('O', offense_formation)
    if (!off) {
      return text(
        `Unknown offensive formation "${offense_formation}". Valid: ${OFFENSE_FORMATIONS.map((f) => f.name).join(', ')}`,
      )
    }
    const def = defense_formation ? findFormation('D', defense_formation) : undefined
    if (defense_formation && !def) {
      return text(
        `Unknown defensive formation "${defense_formation}". Valid: ${DEFENSE_FORMATIONS.map((f) => f.name).join(', ')}`,
      )
    }

    const players = [...off.players(), ...(def ? def.players() : [])]
    const { routes, problems } = buildRoutes(players, assignments)

    const play: Play = {
      id: uid(),
      name,
      offFormation: off.name,
      defFormation: def?.name ?? '',
      tags: tags ?? [],
      notes: notes ?? '',
      players,
      routes,
      updatedAt: Date.now(),
    }

    const count = await addPlay(play)

    const warn = problems.length ? `\nWarnings: ${problems.join('; ')}` : ''
    return text(
      `Created "${name}" (${off.name}${def ? ` vs ${def.name}` : ''}) with ${routes.length} assignments. Playbook now has ${count} play(s) in ${storeLabel}.${warn}`,
    )
  },
)

server.registerTool(
  'create_custom_play',
  {
    title: 'Create a play with custom player placement',
    description:
      'Create a play placing every player yourself — for opponent scout cards and schemes the formation library does not cover (Wing-T, double wing, flexbone, unbalanced lines, odd fronts…). Place 11 players per side you use. The ball is at x 26.65 yd; the field is 53.3 yd wide. Typical offensive line: C at x 26.65, guards ±2.4 yd, tackles ±4.8 yd, all at depth 1.2. Assignments work exactly like create_play (route names or custom_path), so you can draw run schemes with blocks and ball-carrier paths.',
    inputSchema: {
      name: z.string(),
      tags: z.array(z.string()).optional().describe('e.g. ["Scout", "Opponent Run Game"]'),
      notes: z.string().optional(),
      players: z
        .array(
          z.object({
            label: z.string().max(3).describe('1-3 chars shown on the diagram, e.g. "QB", "WB", "E"'),
            team: z.enum(['O', 'D']),
            x_yards: z.number().min(0).max(53.3).describe('Distance from the LEFT sideline in yards (ball is at 26.65)'),
            depth_yards: z
              .number()
              .min(0)
              .max(13)
              .describe('Distance from the line of scrimmage in yards — offense sets up behind it, defense in front'),
          }),
        )
        .describe('Every player to draw, both teams as needed'),
      assignments: z.array(assignmentSchema).optional().describe('Routes/blocks, same format as create_play'),
    },
  },
  async ({ name, tags, notes, players: placed, assignments }) => {
    const players: Player[] = placed.map((p) => ({
      id: uid(),
      team: p.team,
      label: p.label.toUpperCase(),
      x: Math.min(Math.max(p.x_yards * 10, 8), FIELD.W - 8),
      y:
        p.team === 'O'
          ? Math.min(FIELD.LOS + 10 + p.depth_yards * 10, FIELD.H - 10)
          : Math.max(FIELD.LOS - 12 - p.depth_yards * 10, 10),
      shape: p.team === 'D' ? 'text' : p.label.toUpperCase() === 'C' ? 'square' : 'circle',
    }))
    const { routes, problems } = buildRoutes(players, assignments ?? [])
    const play: Play = {
      id: uid(),
      name,
      offFormation: 'Custom',
      defFormation: '',
      tags: tags ?? [],
      notes: notes ?? '',
      players,
      routes,
      updatedAt: Date.now(),
    }
    const count = await addPlay(play)
    const warn = problems.length ? `\nWarnings: ${problems.join('; ')}` : ''
    return text(
      `Created custom play "${name}" with ${players.length} players and ${routes.length} assignments. Playbook now has ${count} play(s) in ${storeLabel}.${warn}`,
    )
  },
)

server.registerTool(
  'list_plays',
  {
    title: 'List plays',
    description: 'List the plays currently in the Playcaller playbook file.',
  },
  async () => {
    const plays = await loadPlaybook()
    if (!plays.length) return text(`Playbook is empty (${storeLabel}).`)
    const lines = plays.map(
      (p, i) =>
        `${i + 1}. ${p.name} — ${p.offFormation || 'Custom'}${p.defFormation ? ` vs ${p.defFormation}` : ''}${p.tags.length ? ` [${p.tags.join(', ')}]` : ''}`,
    )
    return text(`${plays.length} play(s) in ${storeLabel}:\n${lines.join('\n')}`)
  },
)

server.registerTool(
  'delete_play',
  {
    title: 'Delete a play',
    description: 'Delete a play from the playbook file by its exact name.',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const remaining = await removePlay(name)
    if (remaining === null) return text(`No play named "${name}" found.`)
    return text(`Deleted "${name}". ${remaining} play(s) remain.`)
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error(`Playcaller MCP server running (${CLOUD ? 'cloud' : 'file'} mode, playbook: ${storeLabel})`)
