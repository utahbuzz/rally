/**
 * Server-side play rendering: Play -> standalone SVG string.
 * Mirrors src/components/PlayGraphics.tsx so MCP-generated documents
 * (call sheets, install sheets) match what the app draws.
 */
import { DEFAULT_DISPLAY, END_ZONE, FIELD, markerFill, Play, Player, Route, textOn } from '../src/types'
import { goalLineY, isGoalToGo, ownGoalLineY } from '../src/utils/field'
import { arrowHead, blockBar, roundedPath } from '../src/utils/geometry'

const R = 9.5

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function endZone(goalY: number, dir: -1 | 1): string {
  const backY = goalY + dir * END_ZONE
  const vTop = Math.max(Math.min(goalY, backY), 0)
  const vBottom = Math.min(Math.max(goalY, backY), FIELD.H)
  if (vBottom - vTop < 4) return ''
  let out = `<rect x="4" y="${vTop}" width="${FIELD.W - 8}" height="${vBottom - vTop}" fill="#eeeaff"/>`
  out += `<line x1="4" y1="${goalY}" x2="${FIELD.W - 4}" y2="${goalY}" stroke="#6965db" stroke-width="3"/>`
  if (backY > 0 && backY < FIELD.H) {
    out += `<line x1="4" y1="${backY}" x2="${FIELD.W - 4}" y2="${backY}" stroke="#b6b1e8" stroke-width="2.4"/>`
  }
  if (vBottom - vTop > 44) {
    out += `<text x="${FIELD.W / 2}" y="${dir === -1 ? vTop + (vBottom - vTop) * 0.26 : vBottom - (vBottom - vTop) * 0.26}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="800" letter-spacing="7" fill="#c9c4ee">END ZONE</text>`
  }
  return out
}

function fieldBackground(ballX: number, yardsToGoal?: number): string {
  const goalY = goalLineY(yardsToGoal)
  const ownGoalY = ownGoalLineY(yardsToGoal)
  const inPlay = (y: number) => (goalY == null || y > goalY) && (ownGoalY == null || y < ownGoalY)
  const parts: string[] = [`<rect width="${FIELD.W}" height="${FIELD.H}" fill="#ffffff"/>`]
  if (goalY != null && goalY > 12) parts.push(endZone(goalY, -1))
  if (ownGoalY != null && ownGoalY < FIELD.H - 12) parts.push(endZone(ownGoalY, 1))
  parts.push(`<line x1="2.5" y1="0" x2="2.5" y2="${FIELD.H}" stroke="#c7ced6" stroke-width="4"/>`)
  parts.push(`<line x1="${FIELD.W - 2.5}" y1="0" x2="${FIELD.W - 2.5}" y2="${FIELD.H}" stroke="#c7ced6" stroke-width="4"/>`)
  for (let y = 10; y <= FIELD.H - 10; y += 50) {
    if (y === FIELD.LOS || !inPlay(y)) continue
    parts.push(`<line x1="4" y1="${y}" x2="${FIELD.W - 4}" y2="${y}" stroke="#e8ebee" stroke-width="1.6"/>`)
  }
  for (let y = 15; y < FIELD.H - 10; y += 10) {
    if (!inPlay(y)) continue
    for (const [a, b] of [
      [FIELD.HASH_L - 4, FIELD.HASH_L + 4],
      [FIELD.HASH_R - 4, FIELD.HASH_R + 4],
      [7, 15],
      [FIELD.W - 15, FIELD.W - 7],
    ]) {
      parts.push(`<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="#dde2e7" stroke-width="1.4"/>`)
    }
  }
  if (!isGoalToGo(yardsToGoal)) {
    parts.push(
      `<line x1="4" y1="${FIELD.FIRST_DOWN}" x2="${FIELD.W - 4}" y2="${FIELD.FIRST_DOWN}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 7" opacity="0.75"/>`,
    )
  }
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
  const fill = markerFill(p, DEFAULT_DISPLAY)
  if (p.shape === 'text') {
    const size = p.label.length > 1 ? 11 : 14
    const color = fill === '#ffffff' ? '#475569' : fill
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" fill="${color}">${label}</text>`
  }
  const ink = textOn(fill)
  if (p.shape === 'square') {
    const s = R * 1.8
    return (
      `<rect x="${p.x - s / 2}" y="${p.y - s / 2}" width="${s}" height="${s}" rx="2.5" fill="${fill}" stroke="#0f172a" stroke-width="2.2"/>` +
      `<text x="${p.x}" y="${p.y + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="${ink}">${label}</text>`
    )
  }
  if (p.shape === 'triangle') {
    const r = R * 1.28
    const pts = [-90, 30, 150]
      .map((deg) => {
        const a = (deg * Math.PI) / 180
        return `${p.x + r * Math.cos(a)},${p.y + r * Math.sin(a)}`
      })
      .join(' ')
    return (
      `<polygon points="${pts}" fill="${fill}" stroke="#0f172a" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<text x="${p.x}" y="${p.y + 3}" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="700" fill="${ink}">${label}</text>`
    )
  }
  return (
    `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${fill}" stroke="#0f172a" stroke-width="2.2"/>` +
    `<text x="${p.x}" y="${p.y + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="${ink}">${label}</text>`
  )
}

export function playToSvg(play: Play): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD.W} ${FIELD.H}" font-family="Inter, system-ui, sans-serif">` +
    fieldBackground(play.ballX ?? FIELD.BALL_X, play.yardsToGoal) +
    play.routes.map(routeSvg).join('') +
    play.players.map(playerSvg).join('') +
    `</svg>`
  )
}
