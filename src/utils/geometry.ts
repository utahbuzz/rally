import { Point } from '../types'

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Move point a toward b by d (clamped to the segment). */
export function toward(a: Point, b: Point, d: number): Point {
  const len = dist(a, b)
  if (len === 0) return { ...a }
  const t = Math.min(d / len, 1)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** SVG path through points with rounded corners; start trimmed by startTrim. */
export function roundedPath(points: Point[], radius = 9, startTrim = 0): string {
  if (points.length < 2) return ''
  const pts = [...points]
  if (startTrim > 0) pts[0] = toward(pts[0], pts[1], startTrim)
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const next = pts[i + 1]
    const r = Math.min(radius, dist(prev, cur) / 2, dist(cur, next) / 2)
    const a = toward(cur, prev, r)
    const b = toward(cur, next, r)
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

/** Arrowhead polygon points ("x,y x,y x,y") at the end of a segment. */
export function arrowHead(from: Point, to: Point, size = 11): string {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  const spread = 0.46
  const p1 = { x: to.x - size * Math.cos(ang - spread), y: to.y - size * Math.sin(ang - spread) }
  const p2 = { x: to.x - size * Math.cos(ang + spread), y: to.y - size * Math.sin(ang + spread) }
  return `${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`
}

/** Perpendicular T-bar segment at the end of a segment (block ending). */
export function blockBar(from: Point, to: Point, half = 8): { x1: number; y1: number; x2: number; y2: number } {
  const ang = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2
  return {
    x1: to.x + half * Math.cos(ang),
    y1: to.y + half * Math.sin(ang),
    x2: to.x - half * Math.cos(ang),
    y2: to.y - half * Math.sin(ang),
  }
}

/** Snap the segment last->p to the nearest 45 degrees. */
export function snap45(last: Point, p: Point): Point {
  const dx = p.x - last.x
  const dy = p.y - last.y
  const len = Math.hypot(dx, dy)
  if (len < 2) return p
  const ang = Math.atan2(dy, dx)
  const snapped = (Math.round(ang / (Math.PI / 4)) * Math.PI) / 4
  return { x: last.x + len * Math.cos(snapped), y: last.y + len * Math.sin(snapped) }
}

export function clampToField(p: Point, w: number, h: number, pad = 4): Point {
  return {
    x: Math.min(Math.max(p.x, pad), w - pad),
    y: Math.min(Math.max(p.y, pad), h - pad),
  }
}
