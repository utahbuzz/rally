import { FIELD, Play, Player, Route } from '../types'
import { arrowHead, blockBar, roundedPath } from '../utils/geometry'

export const PLAYER_R = 9.5

export function FieldBackground() {
  const yardLines = []
  for (let y = 10; y <= FIELD.H - 10; y += 50) {
    if (y === FIELD.LOS) continue
    yardLines.push(y)
  }
  const ticks = []
  for (let y = 15; y < FIELD.H - 10; y += 10) {
    ticks.push(y)
  }
  return (
    <g>
      <rect x={0} y={0} width={FIELD.W} height={FIELD.H} fill="#ffffff" />
      {/* sidelines */}
      <line x1={2.5} y1={0} x2={2.5} y2={FIELD.H} stroke="#c7ced6" strokeWidth={4} />
      <line x1={FIELD.W - 2.5} y1={0} x2={FIELD.W - 2.5} y2={FIELD.H} stroke="#c7ced6" strokeWidth={4} />
      {/* 5-yard lines */}
      {yardLines.map((y) => (
        <line key={y} x1={4} y1={y} x2={FIELD.W - 4} y2={y} stroke="#e8ebee" strokeWidth={1.6} />
      ))}
      {/* hash + sideline yard ticks */}
      {ticks.map((y) => (
        <g key={y} stroke="#dde2e7" strokeWidth={1.4}>
          <line x1={FIELD.HASH_L - 4} y1={y} x2={FIELD.HASH_L + 4} y2={y} />
          <line x1={FIELD.HASH_R - 4} y1={y} x2={FIELD.HASH_R + 4} y2={y} />
          <line x1={7} y1={y} x2={15} y2={y} />
          <line x1={FIELD.W - 15} y1={y} x2={FIELD.W - 7} y2={y} />
        </g>
      ))}
      {/* first-down marker */}
      <line
        x1={4}
        y1={FIELD.FIRST_DOWN}
        x2={FIELD.W - 4}
        y2={FIELD.FIRST_DOWN}
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="10 7"
        opacity={0.75}
      />
      {/* line of scrimmage */}
      <line x1={4} y1={FIELD.LOS} x2={FIELD.W - 4} y2={FIELD.LOS} stroke="#94a3b8" strokeWidth={2.2} />
      {/* ball */}
      <ellipse cx={FIELD.BALL_X} cy={FIELD.LOS} rx={5.5} ry={3.6} fill="#92400e" stroke="#78350f" strokeWidth={1} />
    </g>
  )
}

export function RouteGlyph({
  route,
  selected,
  faded,
}: {
  route: Route
  selected?: boolean
  faded?: boolean
}) {
  const pts = route.points
  if (pts.length < 2) return null
  const d = roundedPath(pts, 9, PLAYER_R + 2.5)
  const from = pts[pts.length - 2]
  const to = pts[pts.length - 1]
  const dash = route.kind === 'motion' ? '7 6' : undefined
  const opacity = faded ? 0.35 : 1
  return (
    <g opacity={opacity}>
      {selected && (
        <path d={d} fill="none" stroke="#34d399" strokeWidth={7} strokeLinecap="round" opacity={0.45} />
      )}
      <path
        d={d}
        fill="none"
        stroke={route.color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
      {route.kind === 'block' ? (
        (() => {
          const b = blockBar(from, to, 8.5)
          return <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={route.color} strokeWidth={3.4} strokeLinecap="round" />
        })()
      ) : (
        <polygon points={arrowHead(from, to, 11)} fill={route.color} />
      )}
    </g>
  )
}

export function PlayerGlyph({ player, selected }: { player: Player; selected?: boolean }) {
  const sel = selected ? (
    <circle cx={player.x} cy={player.y} r={PLAYER_R + 4.5} fill="none" stroke="#10b981" strokeWidth={2.4} opacity={0.9} />
  ) : null

  if (player.shape === 'text') {
    return (
      <g>
        {sel}
        <text
          x={player.x}
          y={player.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={player.label.length > 1 ? 11 : 14}
          fontWeight={800}
          fill="#475569"
          style={{ fontFamily: 'inherit' }}
        >
          {player.label}
        </text>
      </g>
    )
  }
  if (player.shape === 'square') {
    const s = PLAYER_R * 1.8
    return (
      <g>
        {sel}
        <rect
          x={player.x - s / 2}
          y={player.y - s / 2}
          width={s}
          height={s}
          rx={2.5}
          fill="#fff"
          stroke="#0f172a"
          strokeWidth={2.2}
        />
        <text x={player.x} y={player.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill="#0f172a">
          {player.label}
        </text>
      </g>
    )
  }
  return (
    <g>
      {sel}
      <circle cx={player.x} cy={player.y} r={PLAYER_R} fill="#fff" stroke="#0f172a" strokeWidth={2.2} />
      <text x={player.x} y={player.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill="#0f172a">
        {player.label}
      </text>
    </g>
  )
}

/** Non-interactive rendering of a play — thumbnails and print cards. */
export function PlaySVG({ play, className }: { play: Play; className?: string }) {
  return (
    <svg viewBox={`0 0 ${FIELD.W} ${FIELD.H}`} className={className} style={{ display: 'block', pointerEvents: 'none' }}>
      <FieldBackground />
      {play.routes.map((r) => (
        <RouteGlyph key={r.id} route={r} />
      ))}
      {play.players.map((p) => (
        <PlayerGlyph key={p.id} player={p} />
      ))}
    </svg>
  )
}
