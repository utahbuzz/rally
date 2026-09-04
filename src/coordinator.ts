/**
 * The in-app AI coordinator.
 *
 * The Supabase edge function is only a thin proxy that holds the Anthropic
 * key; the tool loop runs here in the browser so the AI draws plays through
 * the exact same formation, route, hash and spotting code as the canvas.
 * Plays it creates go into the store, which syncs them to the cloud like any
 * other edit.
 */
import { useStore } from './store'
import { SUPABASE_KEY, SUPABASE_URL } from './sync'
import { COVERAGE_NAMES, coverageGuide } from './data/coverages'
import {
  BLOCK_NAMES,
  buildPlay,
  DEFENSE_NAMES,
  OFFENSE_NAMES,
  PlaySpec,
  ROUTE_NAMES,
} from './utils/buildPlay'
import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from './data/formations'

const PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`
const KEY_STORAGE = 'playcaller-anthropic-key'
const WORKSPACE_STORAGE = 'playcaller-anthropic-workspace'
const MODEL = 'claude-opus-5'

export function getApiKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key)
    else window.localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* private browsing — the key just won't persist */
  }
}

/**
 * Identity-linked API keys must name the workspace each request acts in.
 * Standard keys don't need this, so it stays optional.
 */
export function getWorkspaceId(): string {
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setWorkspaceId(id: string): void {
  try {
    if (id) window.localStorage.setItem(WORKSPACE_STORAGE, id)
    else window.localStorage.removeItem(WORKSPACE_STORAGE)
  } catch {
    /* not persisted in private browsing */
  }
}

const TOOLS = [
  {
    name: 'list_formations',
    description:
      'List the offensive formations and defensive fronts available, with the player labels each provides. Call this before creating plays so you use exact names and labels.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'coverage_guide',
    description:
      `Coaching notes on how to attack a coverage or situation. Known: ${COVERAGE_NAMES.join(', ')}.`,
    input_schema: {
      type: 'object',
      properties: { coverage: { type: 'string', description: 'e.g. "cover 2", "man press"' } },
      required: ['coverage'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_play',
    description:
      'Draw a play and add it to the coach\'s playbook. Give every skill player an assignment, and put the offensive line on "Pass Pro" for passes or "Drive Blk" for runs. Always write coaching notes with the read progression.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Play name a coach would call, e.g. "Trips Rt — Smash"' },
        offense_formation: { type: 'string', enum: OFFENSE_NAMES },
        defense_formation: {
          type: 'string',
          enum: DEFENSE_NAMES,
          description: 'Optional look to draw the play against',
        },
        hash: {
          type: 'string',
          enum: ['L', 'LM', 'MOF', 'RM', 'R'],
          description: 'Ball spot: L/R = hash, MOF = middle (default)',
        },
        field_position: {
          type: 'number',
          description:
            'Yards to the opponent goal line, for red-zone and goal-line work: 8 draws the play from the +8 with the end zone on screen and every route compressed to fit. Use 90-99 for backed-up plays from your own end. Omit for open field.',
        },
        tags: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string', description: 'Read progression, protection, coaching points' },
        assignments: {
          type: 'array',
          description: 'One entry per player with a job',
          items: {
            type: 'object',
            properties: {
              player: { type: 'string', description: 'Player label from the formation, e.g. "Z", "RB", "LT"' },
              route: { type: 'string', description: `One of: ${[...ROUTE_NAMES, ...BLOCK_NAMES].join(', ')}` },
              color: { type: 'string', enum: ['red', 'blue', 'green', 'orange', 'purple', 'black'] },
            },
            required: ['player'],
            additionalProperties: false,
          },
        },
      },
      required: ['name', 'offense_formation', 'assignments'],
      additionalProperties: false,
    },
  },
] as const

function systemPrompt(): string {
  const plays = useStore.getState().plays
  const existing = plays.slice(0, 40).map((p) => p.name).join('; ') || 'empty'
  return [
    'You are the offensive coordinator assistant inside Playcaller, a football play-design app.',
    'The coach talks to you in a side panel while looking at the field.',
    '',
    'How to work:',
    '- When asked for plays, actually draw them with create_play — do not just describe them.',
    '- Check coverage_guide first when a coverage or situation is named, and use what it says.',
    '- Vary formations and concepts across a set; do not draw the same play five times.',
    '- In the red zone set field_position and pick concepts that live in that space (fade, slant, spot, snag, pick) — the field is short, so deep route trees do not belong there.',
    '- Name plays the way a coach calls them, and always fill in notes with the read.',
    '- Keep your replies to the coach short: a sentence or two on the plan, then the plays.',
    '',
    `Plays already in this playbook: ${existing}.`,
  ].join('\n')
}

type Content = Array<Record<string, unknown>>
interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | Content
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  plays?: string[]
}

function runTool(name: string, input: Record<string, never>): { text: string; created?: string } {
  if (name === 'list_formations') {
    const off = OFFENSE_FORMATIONS.map(
      (f) => `- "${f.name}": ${f.players().map((p) => p.label).join(', ')}`,
    ).join('\n')
    const def = DEFENSE_FORMATIONS.map((f) => `- "${f.name}"`).join('\n')
    return { text: `OFFENSE\n${off}\n\nDEFENSE\n${def}` }
  }
  if (name === 'coverage_guide') {
    const guide = coverageGuide(String((input as Record<string, unknown>).coverage ?? ''))
    return { text: guide ?? `No guide for that. Known: ${COVERAGE_NAMES.join(', ')}` }
  }
  if (name === 'create_play') {
    const { play, problems } = buildPlay(input as unknown as PlaySpec)
    if (!play) return { text: `Could not draw it: ${problems.join('; ')}` }
    useStore.setState((s) => ({ plays: [play, ...s.plays], currentId: play.id }))
    const warn = problems.length ? ` Warnings: ${problems.join('; ')}` : ''
    return {
      text: `Drew "${play.name}" (${play.offFormation}, ${play.routes.length} assignments).${warn}`,
      created: play.name,
    }
  }
  return { text: `Unknown tool ${name}` }
}

async function callClaude(messages: ApiMessage[]): Promise<Record<string, unknown>> {
  const key = getApiKey()
  const workspace = getWorkspaceId()
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      ...(key ? { 'x-anthropic-key': key } : {}),
      ...(workspace ? { 'x-anthropic-workspace': workspace } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt(),
      tools: TOOLS,
      messages,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      (data as { error?: { message?: string } })?.error?.message ??
      (data as { message?: string })?.message ??
      `request failed (${res.status})`
    throw new Error(detail)
  }
  return data as Record<string, unknown>
}

/**
 * Run one coach question to completion, executing any tool calls the model
 * makes. `onProgress` reports what it is doing so the panel can show it.
 */
export async function askCoordinator(
  history: ChatTurn[],
  question: string,
  onProgress: (note: string) => void,
): Promise<ChatTurn> {
  const messages: ApiMessage[] = history
    .filter((t) => t.text)
    .map((t) => ({ role: t.role, content: t.text }))
  messages.push({ role: 'user', content: question })

  const created: string[] = []
  for (let turn = 0; turn < 12; turn++) {
    const reply = await callClaude(messages)
    const content = (reply.content ?? []) as Content
    messages.push({ role: 'assistant', content })

    const toolUses = content.filter((b) => b.type === 'tool_use')
    const said = content
      .filter((b) => b.type === 'text')
      .map((b) => String(b.text ?? ''))
      .join('\n')
      .trim()

    if (!toolUses.length) {
      return { role: 'assistant', text: said, plays: created }
    }

    if (said) onProgress(said)
    const results: Content = []
    for (const use of toolUses) {
      const out = runTool(String(use.name), use.input as Record<string, never>)
      if (out.created) {
        created.push(out.created)
        onProgress(`Drew ${out.created}`)
      }
      results.push({ type: 'tool_result', tool_use_id: use.id, content: out.text })
    }
    messages.push({ role: 'user', content: results })
  }
  return { role: 'assistant', text: 'That took too many steps — try narrowing the request.', plays: created }
}
