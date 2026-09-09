/**
 * Reading a Hudl breakdown export.
 *
 * Coaches tag film in Hudl and export the result as a spreadsheet — one row
 * per play, with the situation and what each side did. Column headers vary by
 * program and by how the staff set their template up, so nothing here matches
 * on an exact name: every field has a list of aliases, and the report says
 * which headers were understood and which were ignored, so an unfamiliar
 * export tells us what to add rather than failing silently.
 */

export interface BreakdownRow {
  raw: Record<string, string>
  odk?: string
  down?: number
  distance?: number
  hash?: string
  yardLine?: string
  offForm?: string
  offPlay?: string
  playType?: string
  gain?: number
  defFront?: string
  coverage?: string
  blitz?: string
}

const ALIASES: Record<keyof Omit<BreakdownRow, 'raw'>, string[]> = {
  odk: ['odk', 'o/d/k', 'odk?', 'unit'],
  down: ['dn', 'down', 'd'],
  distance: ['dist', 'distance', 'dis', 'togo', 'to go'],
  hash: ['hash', 'hash mark', 'ha'],
  yardLine: ['yard ln', 'yardline', 'yard line', 'yd ln', 'ydln', 'spot', 'yard'],
  offForm: ['off form', 'formation', 'off formation', 'form', 'offensive formation'],
  offPlay: ['off play', 'play', 'play name', 'play call', 'offensive play'],
  playType: ['play type', 'type', 'r/p', 'run/pass'],
  gain: ['gn/ls', 'gain', 'yards', 'gn ls', 'gnls', 'yds', 'result yards'],
  defFront: ['def front', 'front', 'def', 'defensive front', 'd front'],
  coverage: ['coverage', 'cov', 'def coverage', 'secondary'],
  blitz: ['blitz', 'pressure', 'blitz?', 'stunt'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Split a CSV/TSV line, honouring quoted fields. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === sep) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

export interface ParseResult {
  rows: BreakdownRow[]
  headers: string[]
  mapped: Partial<Record<keyof BreakdownRow, string>>
  ignored: string[]
}

export function parseBreakdown(text: string): ParseResult {
  const clean = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!clean.length) return { rows: [], headers: [], mapped: {}, ignored: [] }

  const sep = (clean[0].match(/\t/g)?.length ?? 0) > (clean[0].match(/,/g)?.length ?? 0) ? '\t' : ','

  // the header is the first line that names something we recognise — Hudl
  // exports often carry a title row above it
  let headerIdx = 0
  let best = -1
  for (let i = 0; i < Math.min(clean.length, 8); i++) {
    const cells = splitLine(clean[i], sep).map(norm)
    const hits = Object.values(ALIASES).filter((al) => cells.some((c) => al.includes(c))).length
    if (hits > best) {
      best = hits
      headerIdx = i
    }
  }

  const headers = splitLine(clean[headerIdx], sep)
  const mapped: Partial<Record<keyof BreakdownRow, string>> = {}
  const used = new Set<string>()
  for (const [field, aliases] of Object.entries(ALIASES) as Array<[keyof typeof ALIASES, string[]]>) {
    const found = headers.find((h) => aliases.includes(norm(h)) && !used.has(h))
    if (found) {
      mapped[field] = found
      used.add(found)
    }
  }

  const num = (v?: string) => {
    if (v == null || v === '') return undefined
    const n = Number(String(v).replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  const str = (v?: string) => (v && v.trim() ? v.trim() : undefined)

  const rows: BreakdownRow[] = []
  for (let i = headerIdx + 1; i < clean.length; i++) {
    const cells = splitLine(clean[i], sep)
    if (cells.every((c) => !c)) continue
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => (raw[h] = cells[j] ?? ''))
    const get = (f: keyof typeof ALIASES) => (mapped[f] ? raw[mapped[f]!] : undefined)
    rows.push({
      raw,
      odk: str(get('odk')),
      down: num(get('down')),
      distance: num(get('distance')),
      hash: str(get('hash'))?.toUpperCase(),
      yardLine: str(get('yardLine')),
      offForm: str(get('offForm')),
      offPlay: str(get('offPlay')),
      playType: str(get('playType')),
      gain: num(get('gain')),
      defFront: str(get('defFront')),
      coverage: str(get('coverage')),
      blitz: str(get('blitz')),
    })
  }

  return {
    rows,
    headers,
    mapped,
    ignored: headers.filter((h) => h && !used.has(h)),
  }
}

/* ------------------------------------------------------------------ *
 * Tendencies
 * ------------------------------------------------------------------ */

/** The situations a game plan is actually built around. */
export function situationOf(r: BreakdownRow): string {
  if (r.down == null) return 'Unknown'
  const d = r.distance ?? 10
  if (r.down === 1) return '1st down'
  if (r.down === 2) return d >= 7 ? '2nd & long' : d <= 3 ? '2nd & short' : '2nd & medium'
  if (r.down === 3) return d >= 7 ? '3rd & long' : d <= 3 ? '3rd & short' : '3rd & medium'
  return '4th down'
}

export interface Tally {
  label: string
  count: number
  pct: number
}

function tally(values: Array<string | undefined>): Tally[] {
  const counts = new Map<string, number>()
  let total = 0
  for (const v of values) {
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
    total++
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
}

const bar = (pct: number) => '█'.repeat(Math.max(1, Math.round(pct / 10)))

function section(title: string, rows: Tally[], min = 1): string {
  const keep = rows.filter((r) => r.count >= min).slice(0, 6)
  if (!keep.length) return ''
  return (
    `${title}\n` +
    keep.map((t) => `    ${String(t.pct).padStart(3)}%  ${bar(t.pct).padEnd(10)} ${t.label} (${t.count})`).join('\n')
  )
}

export interface ReportOptions {
  /** 'defense' scouts what they line up in; 'offense' scouts what they run. */
  perspective?: 'defense' | 'offense'
  label?: string
}

/**
 * Is this actually a breakdown? Pointed at the wrong file we would otherwise
 * report confidently on nothing, which is worse than refusing.
 */
export function looksLikeBreakdown(parsed: ParseResult): boolean {
  const m = parsed.mapped
  const hasSituation = m.down != null || m.distance != null
  const hasScout = m.coverage != null || m.defFront != null || m.offForm != null || m.offPlay != null
  return parsed.rows.length > 0 && hasSituation && hasScout
}

export function tendencyReport(parsed: ParseResult, opts: ReportOptions = {}): string {
  const { rows, mapped, ignored } = parsed
  if (!rows.length) return 'No rows found in that file.'

  const perspective =
    opts.perspective ?? (mapped.coverage || mapped.defFront ? 'defense' : 'offense')
  const dim = (r: BreakdownRow) =>
    perspective === 'defense' ? r.coverage ?? r.defFront : r.offForm ?? r.offPlay
  const dimName = perspective === 'defense' ? 'coverage / front' : 'formation'

  const out: string[] = []
  out.push(`${opts.label ?? 'Breakdown'} — ${rows.length} plays, scouting their ${perspective}`)
  out.push('')
  out.push(`Columns understood: ${Object.entries(mapped).map(([k, v]) => `${k}="${v}"`).join(', ') || 'none'}`)
  if (ignored.length) out.push(`Columns ignored: ${ignored.join(', ')}`)
  out.push('')

  const overall = section(`OVERALL ${dimName.toUpperCase()}`, tally(rows.map(dim)))
  if (overall) out.push(overall, '')

  // by situation — the part a call sheet is built from
  const situations = ['1st down', '2nd & short', '2nd & medium', '2nd & long', '3rd & short', '3rd & medium', '3rd & long', '4th down']
  for (const sit of situations) {
    const inSit = rows.filter((r) => situationOf(r) === sit)
    if (inSit.length < 3) continue
    const s = section(`${sit.toUpperCase()}  (${inSit.length} plays)`, tally(inSit.map(dim)))
    if (s) out.push(s)
    if (mapped.blitz) {
      const blitzed = inSit.filter((r) => /^(y|yes|1|true)/i.test(r.blitz ?? '')).length
      if (blitzed) out.push(`    pressure on ${Math.round((blitzed / inSit.length) * 100)}% (${blitzed}/${inSit.length})`)
    }
    out.push('')
  }

  if (mapped.hash) {
    for (const h of ['L', 'M', 'R']) {
      const onHash = rows.filter((r) => (r.hash ?? '').startsWith(h))
      if (onHash.length < 3) continue
      const s = section(`BALL ON ${h === 'M' ? 'THE MIDDLE' : `THE ${h} HASH`}  (${onHash.length} plays)`, tally(onHash.map(dim)))
      if (s) out.push(s, '')
    }
  }

  if (perspective === 'offense' && mapped.playType) {
    const s = section('RUN / PASS', tally(rows.map((r) => r.playType)))
    if (s) out.push(s, '')
  }

  out.push('Use create_custom_play to draw their most common looks as scout cards,')
  out.push('and create_game_plan_sheet to put the week\'s answers on paper.')
  return out.join('\n')
}
