import {
  DEFAULT_DISPLAY,
  DisplaySettings,
  END_ZONE,
  FIELD,
  markerFill,
  markerShape,
  Play,
  Player,
  Route,
  textOn,
} from '../types'
import { goalLineY, isGoalToGo, ownGoalLineY } from '../utils/field'
import { arrowHead, blockBar, roundedPath } from '../utils/geometry'

export const PLAYER_R = 9.5

/** An end zone band, clipped to the canvas, with its goal line and back line. */
function EndZone({ goalY, dir }: { goalY: number; dir: -1 | 1 }) {
  const backY = goalY + dir * END_ZONE
  const top = Math.min(goalY, backY)
  const bottom = Math.max(goalY, backY)
  const vTop = Math.max(top, 0)
  const vBottom = Math.min(bottom, FIELD.H)
  if (vBottom - vTop < 4) return null
  return (
    <g>
      <rect x={4} y={vTop} width={FIELD.W - 8} height={vBottom - vTop} fill="#eeeaff" />
      <line x1={4} y1={goalY} x2={FIELD.W - 4} y2={goalY} stroke="#6965db" strokeWidth={3} />
      {backY > 0 && backY < FIELD.H && (
        <line x1={4} y1={backY} x2={FIELD.W - 4} y2={backY} stroke="#b6b1e8" strokeWidth={2.4} />
      )}
      {vBottom - vTop > 44 && (
        <text
          x={FIELD.W / 2}
          y={dir === -1 ? vTop + (vBottom - vTop) * 0.26 : vBottom - (vBottom - vTop) * 0.26}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={17}
          fontWeight={800}
          letterSpacing={7}
          fill="#c9c4ee"
        >
          END ZONE
        </text>
      )}
    </g>
  )
}

export function FieldBackground({
  ballX = FIELD.BALL_X,
  yardsToGoal,
}: {
  ballX?: number
  yardsToGoal?: number
}) {
  const goalY = goalLineY(yardsToGoal)
  const ownGoalY = ownGoalLineY(yardsToGoal)
  // nothing is drawn beyond a goal line — that ground is the end zone
  const inPlay = (y: number) =>
    (goalY == null || y > goalY) && (ownGoalY == null || y < ownGoalY)

  const yardLines = []
  for (let y = 10; y <= FIELD.H - 10; y += 50) {
    if (y === FIELD.LOS || !inPlay(y)) continue
    yardLines.push(y)
  }
  const ticks = []
  for (let y = 15; y < FIELD.H - 10; y += 10) {
    if (inPlay(y)) ticks.push(y)
  }
  return (
    <g>
      <rect x={0} y={0} width={FIELD.W} height={FIELD.H} fill="#ffffff" />
      {goalY != null && goalY > 12 && <EndZone goalY={goalY} dir={-1} />}
      {ownGoalY != null && ownGoalY < FIELD.H - 12 && <EndZone goalY={ownGoalY} dir={1} />}
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
      {/* first-down marker — none when it is goal to go */}
      {!isGoalToGo(yardsToGoal) && (
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
      )}
      {/* line of scrimmage */}
      <line x1={4} y1={FIELD.LOS} x2={FIELD.W - 4} y2={FIELD.LOS} stroke="#94a3b8" strokeWidth={2.2} />
      {/* ball */}
      <ellipse cx={ballX} cy={FIELD.LOS} rx={5.5} ry={3.6} fill="#92400e" stroke="#78350f" strokeWidth={1} />
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
        <path d={d} fill="none" stroke="#a5a2f0" strokeWidth={7} strokeLinecap="round" opacity={0.55} />
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

/** Triangle marker points, centred on (x, y) and pointing upfield. */
function trianglePoints(x: number, y: number, r: number): string {
  const pts = [-90, 30, 150].map((deg) => {
    const a = (deg * Math.PI) / 180
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
  })
  return pts.join(' ')
}

/**
 * Jersey numbers for the "Number" label mode, counted per side in the order
 * the formation lists them, so they stay stable as a play is edited.
 */
export function playerNumbers(players: Player[]): Record<string, number> {
  const next = { O: 0, D: 0 }
  const out: Record<string, number> = {}
  for (const p of players) out[p.id] = ++next[p.team]
  return out
}

export function PlayerGlyph({
  player,
  selected,
  display = DEFAULT_DISPLAY,
  number,
}: {
  player: Player
  selected?: boolean
  display?: DisplaySettings
  number?: number
}) {
  const sel = selected ? (
    <circle cx={player.x} cy={player.y} r={PLAYER_R + 4.5} fill="none" stroke="#6965db" strokeWidth={2.4} opacity={0.9} />
  ) : null

  const shape = markerShape(player, display)
  const fill = markerFill(player, display)
  const label =
    display.labels === 'none'
      ? ''
      : display.labels === 'number'
        ? String(number ?? '')
        : player.label

  if (shape === 'text') {
    // no marker to fill, so the colour goes on the letters themselves
    return (
      <g>
        {sel}
        <text
          x={player.x}
          y={player.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={label.length > 1 ? 11 : 14}
          fontWeight={800}
          fill={fill === '#ffffff' ? '#475569' : fill}
          style={{ fontFamily: 'inherit' }}
        >
          {label || '•'}
        </text>
      </g>
    )
  }

  const ink = textOn(fill)
  const text = label ? (
    <text
      x={player.x}
      y={player.y + (shape === 'triangle' ? 3 : 0.5)}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={shape === 'triangle' ? 7.5 : 8}
      fontWeight={700}
      fill={ink}
    >
      {label}
    </text>
  ) : null

  if (shape === 'square') {
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
          fill={fill}
          stroke="#0f172a"
          strokeWidth={2.2}
        />
        {text}
      </g>
    )
  }
  if (shape === 'triangle') {
    return (
      <g>
        {sel}
        <polygon
          points={trianglePoints(player.x, player.y, PLAYER_R * 1.28)}
          fill={fill}
          stroke="#0f172a"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        {text}
      </g>
    )
  }
  return (
    <g>
      {sel}
      <circle cx={player.x} cy={player.y} r={PLAYER_R} fill={fill} stroke="#0f172a" strokeWidth={2.2} />
      {text}
    </g>
  )
}

/** Non-interactive rendering of a play — thumbnails and print cards. */
export function PlaySVG({
  play,
  className,
  display = DEFAULT_DISPLAY,
}: {
  play: Play
  className?: string
  display?: DisplaySettings
}) {
  const numbers = playerNumbers(play.players)
  return (
    <svg viewBox={`0 0 ${FIELD.W} ${FIELD.H}`} className={className} style={{ display: 'block', pointerEvents: 'none' }}>
      <FieldBackground ballX={play.ballX} yardsToGoal={play.yardsToGoal} />
      {play.routes.map((r) => (
        <RouteGlyph key={r.id} route={r} />
      ))}
      {play.players.map((p) => (
        <PlayerGlyph key={p.id} player={p} display={display} number={numbers[p.id]} />
      ))}
    </svg>
  )
}
