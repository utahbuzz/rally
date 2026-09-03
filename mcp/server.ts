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
import { FIELD, HASH_SPOTS, hashIdForX, Play, Player, Point, Route, ROUTE_COLORS, uid } from '../src/types'
import { DEFENSE_FORMATIONS, OFFENSE_FORMATIONS, findFormation } from '../src/data/formations'
import { QUICK_ROUTES, QUICK_ASSIGNMENTS, materializeQuickRoute } from '../src/data/routeTree'
import { spotFromMid } from '../src/utils/field'
import { COVERAGE_GUIDE, coverageGuide } from '../src/data/coverages'
import { playToSvg } from './renderSvg'
import { findPackFormation, loadTeamPack, packFormationPlayers } from './teamPack'

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

const HASH_IDS = ['L', 'LM', 'MOF', 'RM', 'R'] as const

/** Field x for a hash id, and the shift needed to move a play there. */
function hashSpot(hash?: string): { x: number; dx: number } {
  const spot = HASH_SPOTS.find((h) => h.id === (hash ?? 'MOF')) ?? HASH_SPOTS[2]
  return { x: spot.x, dx: spot.x - FIELD.BALL_X }
}

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

    const pack = loadTeamPack()
    let packSection = ''
    if (pack) {
      const lines = pack.formations
        .map(
          (f) =>
            `- "${f.name}"${f.confirmed === false ? ' (alignment inferred — confirm with staff)' : ''} — players: ${f.players.map((p) => p.label.toUpperCase()).join(', ')}`,
        )
        .join('\n')
      packSection = `\n\n${pack.team.toUpperCase()} TEAM PACK — prefer these when working for this program:\n${lines}`
      if (pack.needs_alignment?.length) {
        packSection += `\n\nNamed in their playbook but no alignment on file yet (ask the staff, or build with create_custom_play): ${pack.needs_alignment.join(', ')}`
      }
    }

    return text(`OFFENSE:\n${off}\n\nDEFENSE (optional, for scout looks):\n${def}${packSection}`)
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
    const guide = coverageGuide(coverage)
    if (!guide) {
      return text(
        `No specific guide for "${coverage}". Available: ${Object.keys(COVERAGE_GUIDE).join(', ')}.`,
      )
    }
    return text(guide)
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
function buildRoutes(
  players: Player[],
  assignments: AssignmentInput[],
  ballX: number = FIELD.BALL_X,
): { routes: Route[]; problems: string[] } {
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
      points = materializeQuickRoute(player, template, ballX)
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
      hash: z
        .enum(HASH_IDS)
        .optional()
        .describe(
          'Ball spot across the field, using practice-script notation: L or R = hash, LM/RM = between hash and middle, MOF = middle (default). Moves the ball and the whole formation.',
        ),
      tags: z.array(z.string()).optional().describe('e.g. ["Pass", "3rd Down", "vs Cover 2"]'),
      notes: z.string().optional().describe('Coaching notes: read progression, protection, keys'),
      assignments: z.array(assignmentSchema).describe('One entry per player who gets a route/block'),
    },
  },
  async ({ name, offense_formation, defense_formation, hash, tags, notes, assignments }) => {
    const spot0 = hashSpot(hash)
    const packForm = findPackFormation(offense_formation)
    const off = packForm ? undefined : findFormation('O', offense_formation)
    if (!off && !packForm) {
      const pack = loadTeamPack()
      const packNames = pack ? `, or from the ${pack.team} pack: ${pack.formations.map((f) => f.name).join(', ')}` : ''
      return text(
        `Unknown offensive formation "${offense_formation}". Valid: ${OFFENSE_FORMATIONS.map((f) => f.name).join(', ')}${packNames}`,
      )
    }
    const def = defense_formation ? findFormation('D', defense_formation) : undefined
    if (defense_formation && !def) {
      return text(
        `Unknown defensive formation "${defense_formation}". Valid: ${DEFENSE_FORMATIONS.map((f) => f.name).join(', ')}`,
      )
    }

    const spot = spot0
    const offPlayers = packForm
      ? packFormationPlayers(packForm, spot.x)
      : off!.players().map((p) => ({ ...p, x: spotFromMid(p.x, spot.x) }))
    const players = [
      ...offPlayers,
      ...(def ? def.players().map((p) => ({ ...p, x: spotFromMid(p.x, spot.x) })) : []),
    ]
    const { routes, problems } = buildRoutes(players, assignments, spot.x)

    const play: Play = {
      id: uid(),
      name,
      ballX: spot.x,
      offFormation: packForm ? packForm.name : off!.name,
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
      `Created "${name}" (${packForm ? packForm.name : off!.name}${def ? ` vs ${def.name}` : ''}${hash && hash !== 'MOF' ? `, ${hash} hash` : ''}) with ${routes.length} assignments. Playbook now has ${count} play(s) in ${storeLabel}.${warn}`,
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
      hash: z
        .enum(HASH_IDS)
        .optional()
        .describe(
          'Ball spot: L or R = hash, LM/RM = between hash and middle, MOF = middle (default). Place the players as if the ball were at midfield; the hash then shifts the whole picture.',
        ),
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
  async ({ name, hash, tags, notes, players: placed, assignments }) => {
    const spot = hashSpot(hash)
    const players: Player[] = placed.map((p) => ({
      id: uid(),
      team: p.team,
      label: p.label.toUpperCase(),
      x: Math.min(Math.max(spotFromMid(p.x_yards * 10, spot.x), 8), FIELD.W - 8),
      y:
        p.team === 'O'
          ? Math.min(FIELD.LOS + 10 + p.depth_yards * 10, FIELD.H - 10)
          : Math.max(FIELD.LOS - 12 - p.depth_yards * 10, 10),
      shape: p.team === 'D' ? 'text' : p.label.toUpperCase() === 'C' ? 'square' : 'circle',
    }))
    const { routes, problems } = buildRoutes(players, assignments ?? [], spot.x)
    const play: Play = {
      id: uid(),
      name,
      ballX: spot.x,
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
        `${i + 1}. ${p.name} — ${p.offFormation || 'Custom'}${p.defFormation ? ` vs ${p.defFormation}` : ''}${p.tags.length ? ` [${p.tags.join(', ')}]` : ''}${p.notes ? ` — ${p.notes.slice(0, 90)}` : ''}`,
    )
    return text(`${plays.length} play(s) in ${storeLabel}:\n${lines.join('\n')}`)
  },
)

server.registerTool(
  'team_terminology',
  {
    title: 'Team terminology',
    description:
      "Get the loaded program's call grammar and vocabulary — how their calls are worded, their protections, run series and pass concepts. Read this before naming or designing plays for that program so the output matches their playbook instead of generic football language.",
  },
  async () => {
    const pack = loadTeamPack()
    if (!pack) {
      return text(
        'No team pack loaded. Set PLAYCALLER_TEAM_PACK to a pack file to teach this server a program\'s formations and terminology.',
      )
    }
    const parts = [`TEAM: ${pack.team}`]
    if (pack.call_grammar) parts.push(`\nCALL GRAMMAR:\n${pack.call_grammar}`)
    if (pack.notes) parts.push(`\nNOTES:\n${pack.notes}`)
    for (const [heading, items] of Object.entries(pack.terminology ?? {})) {
      parts.push(`\n${heading.toUpperCase()}:\n${items.join(', ')}`)
    }
    parts.push(`\nFORMATIONS: ${pack.formations.map((f) => f.name).join(', ')}`)
    return text(parts.join('\n'))
  },
)

server.registerTool(
  'create_game_plan_sheet',
  {
    title: 'Create a game-plan sheet',
    description:
      'Generate a printable game-plan document (call sheet, install sheet, or scout card pack) as a self-contained HTML file from plays already in the playbook. Sections group plays by situation ("1st Down", "3rd & Long", "Red Zone"), install day, or opponent series. Every play renders with its full diagram and coaching notes. The coach opens the file in a browser and prints it (Ctrl+P) — sections break cleanly across pages.',
    inputSchema: {
      title: z.string().describe('Sheet title, e.g. "Week 4 vs Central — Offensive Installs"'),
      subtitle: z.string().optional().describe('Optional second line, e.g. "Install Wednesday · Cover 2 heavy opponent"'),
      sections: z
        .array(
          z.object({
            label: z.string().describe('Section heading, e.g. "3rd & Long" or "Install Day 1"'),
            plays: z.array(z.string()).describe('Exact play names from list_plays'),
            note: z.string().optional().describe('Optional coaching note shown under the heading'),
          }),
        )
        .min(1),
      output_path: z.string().optional().describe('Where to write the HTML file (default ./game-plan.html)'),
    },
  },
  async ({ title, subtitle, sections, output_path }) => {
    const plays = await loadPlaybook()
    const byName = new Map(plays.map((p) => [p.name, p]))
    const missing: string[] = []
    let used = 0

    const sectionHtml = sections
      .map((s) => {
        const cards = s.plays
          .map((name) => {
            const play = byName.get(name)
            if (!play) {
              missing.push(name)
              return ''
            }
            used++
            const hashId = hashIdForX(play.ballX)
            const hashTag = hashId === 'MOF' ? '' : ` · ${hashId}`
            return `<div class="card"><div class="card-head"><span class="card-name">${escapeHtml(play.name)}</span><span class="card-form">${escapeHtml((play.offFormation || 'Custom') + hashTag)}</span></div>${playToSvg(play)}${play.notes ? `<div class="card-notes">${escapeHtml(play.notes)}</div>` : ''}</div>`
          })
          .join('')
        return `<section><h2>${escapeHtml(s.label)}</h2>${s.note ? `<p class="section-note">${escapeHtml(s.note)}</p>` : ''}<div class="grid">${cards}</div></section>`
      })
      .join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
body{font-family:Inter,system-ui,-apple-system,sans-serif;color:#1b1b22;margin:24px;background:#fff}
header{border-bottom:3px solid #6965db;padding-bottom:10px;margin-bottom:18px}
h1{margin:0;font-size:22px}
.subtitle{color:#717080;margin-top:4px;font-size:13px}
section{margin-bottom:22px;break-inside:avoid-page}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#6965db;border-bottom:1px solid #e6e5ee;padding-bottom:4px;margin:0 0 4px}
.section-note{color:#717080;font-size:12px;margin:2px 0 8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
.card{border:1.5px solid #d5d3e0;border-radius:8px;overflow:hidden;break-inside:avoid}
.card svg{display:block;width:100%}
.card-head{display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:5px 8px 4px;border-bottom:1px solid #e6e5ee}
.card-name{font-weight:800;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-form{color:#717080;font-size:10px;white-space:nowrap}
.card-notes{padding:4px 8px 6px;font-size:10.5px;color:#4b4a58;border-top:1px solid #e6e5ee}
footer{color:#a5a3b5;font-size:10px;margin-top:16px}
@media print{body{margin:8mm}}
</style></head><body>
<header><h1>${escapeHtml(title)}</h1><div class="subtitle">${subtitle ? escapeHtml(subtitle) + ' · ' : ''}${new Date().toLocaleDateString()} · Playcaller</div></header>
${sectionHtml}
<footer>Generated with Playcaller — open in a browser and print for the laminated sheet.</footer>
</body></html>`

    const out = resolve(output_path ?? 'game-plan.html')
    writeFileSync(out, html)
    const warn = missing.length ? `\nNot found in playbook (skipped): ${missing.join(', ')}` : ''
    return text(`Wrote "${title}" — ${sections.length} section(s), ${used} play card(s) → ${out}${warn}`)
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
const loadedPack = loadTeamPack()
console.error(
  `Playcaller MCP server running (${CLOUD ? 'cloud' : 'file'} mode, playbook: ${storeLabel}${loadedPack ? `, team pack: ${loadedPack.team}` : ''})`,
)
