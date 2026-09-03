/**
 * Server-side play rendering: Play -> standalone SVG string.
 * Mirrors src/components/PlayGraphics.tsx so MCP-generated documents
 * (call sheets, install sheets) match what the app draws.
 */
import { FIELD, Play, Player, Route } from '../src/types'
import { arrowHead, blockBar, roundedPath } from '../src/utils/geometry'

const R = 9.5

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fieldBackground(ballX: number): string {
  const parts: string[] = [`<rect width="${FIELD.W}" height="${FIELD.H}" fill="#ffffff"/>`]
  parts.push(`<line x1="2.5" y1="0" x2="2.5" y2="${FIELD.H}" stroke="#c7ced6" stroke-width="4"/>`)
  parts.push(`<line x1="${FIELD.W - 2.5}" y1="0" x2="${FIELD.W - 2.5}" y2="${FIELD.H}" stroke="#c7ced6" stroke-width="4"/>`)
  for (let y = 10; y <= FIELD.H - 10; y += 50) {
    if (y === FIELD.LOS) continue
    parts.push(`<line x1="4" y1="${y}" x2="${FIELD.W - 4}" y2="${y}" stroke="#e8ebee" stroke-width="1.6"/>`)
  }
  for (let y = 15; y < FIELD.H - 10; y += 10) {
    for (const [a, b] of [
      [FIELD.HASH_L - 4, FIELD.HASH_L + 4],
      [FIELD.HASH_R - 4, FIELD.HASH_R + 4],
      [7, 15],
      [FIELD.W - 15, FIELD.W - 7],
    ]) {
      parts.push(`<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="#dde2e7" stroke-width="1.4"/>`)
    }
  }
  parts.push(
    `<line x1="4" y1="${FIELD.FIRST_DOWN}" x2="${FIELD.W - 4}" y2="${FIELD.FIRST_DOWN}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 7" opacity="0.75"/>`,
  )
  parts.push(`<line x1="4" y1="${FIELD.LOS}" x2="${FIELD.W - 4}" y2="${FIELD.LOS}" stroke="#94a3b8" stroke-width="2.2"/>`)
  parts.push(`<ellipse cx="${ballX}" cy="${FIELD.LOS}" rx="5.5" ry="3.6" fill="#92400e" stroke="#78350f" stroke-width="1"/>`)
  return parts.join('')
}

function routeSvg(route: Route): string {
  const pts = route.points
  if (pts.length < 2) return ''
  const d = roundedPath(pts, 9, R + 2.5)
  const from = pts[pts.length - 2]
  const to = pts[pts.length - 1]
  const dash = route.kind === 'motion' ? ' stroke-dasharray="7 6"' : ''
  let end: string
  if (route.kind === 'block') {
    const b = blockBar(from, to, 8.5)
    end = `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="${route.color}" stroke-width="3.4" stroke-linecap="round"/>`
  } else {
    end = `<polygon points="${arrowHead(from, to, 11)}" fill="${route.color}"/>`
  }
  return `<path d="${d}" fill="none" stroke="${route.color}" stroke-width="3" stroke-linecap="round"${dash}/>${end}`
}

function playerSvg(p: Player): string {
  const label = esc(p.label)
  if (p.shape === 'text') {
    const size = p.label.length > 1 ? 11 : 14
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" fill="#475569">${label}</text>`
  }
  if (p.shape === 'square') {
    const s = R * 1.8
    return (
      `<rect x="${p.x - s / 2}" y="${p.y - s / 2}" width="${s}" height="${s}" rx="2.5" fill="#fff" stroke="#0f172a" stroke-width="2.2"/>` +
      `<text x="${p.x}" y="${p.y + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="#0f172a">${label}</text>`
    )
  }
  return (
    `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="#fff" stroke="#0f172a" stroke-width="2.2"/>` +
    `<text x="${p.x}" y="${p.y + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="#0f172a">${label}</text>`
  )
}

export function playToSvg(play: Play): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD.W} ${FIELD.H}" font-family="Inter, system-ui, sans-serif">` +
    fieldBackground(play.ballX ?? FIELD.BALL_X) +
    play.routes.map(routeSvg).join('') +
    play.players.map(playerSvg).join('') +
    `</svg>`
  )
}
