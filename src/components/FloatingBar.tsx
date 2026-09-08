import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { QUICK_ASSIGNMENTS, QUICK_ROUTES } from '../data/routeTree'
import { useStore } from '../store'
import { Annotation, MARKER_COLORS, Play, PlayerShape, READ_OPTIONS, ROUTE_COLORS, RouteKind } from '../types'

/** The routes worth a single click; the rest live behind More. */
const TOP_ROUTES = ['Go', 'Slant', 'Out', 'Curl', 'Corner', 'Drag']

const SHAPES: Array<{ id: PlayerShape; label: string; title: string }> = [
  { id: 'circle', label: '○', title: 'Circle' },
  { id: 'square', label: '□', title: 'Square' },
  { id: 'triangle', label: '△', title: 'Triangle' },
  { id: 'text', label: 'A', title: 'Letter only' },
]

const KIND_LABEL: Record<RouteKind, string> = { route: 'Route', block: 'Block', motion: 'Motion' }

/**
 * A contextual toolbar that follows the thing you selected, instead of a
 * permanent panel down the side. What you want after clicking a receiver is a
 * route, so the common ones sit right under your cursor.
 */
export function FloatingBar({ play, anchor }: { play: Play; anchor: { x: number; y: number } | null }) {
  const s = useStore.getState
  const selectedPlayerId = useStore((st) => st.selectedPlayerId)
  const selectedRouteId = useStore((st) => st.selectedRouteId)
  const selectedAnnotationId = useStore((st) => st.selectedAnnotationId)
  const [panel, setPanel] = useState<'routes' | 'marker' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const player = play.players.find((p) => p.id === selectedPlayerId)
  const route = play.routes.find((r) => r.id === selectedRouteId)
  const note = (play.annotations ?? []).find((a) => a.id === selectedAnnotationId)

  useEffect(() => setPanel(null), [selectedPlayerId, selectedRouteId, selectedAnnotationId])

  // keep the bar inside the field: a receiver on the boundary would otherwise
  // push half of it off the edge. The arrow stays pointed at the player.
  const [left, setLeft] = useState(0)
  const [arrowX, setArrowX] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host || !anchor) return
    const half = el.offsetWidth / 2
    const clamped = Math.min(Math.max(anchor.x, half + 6), Math.max(host.clientWidth - half - 6, half + 6))
    setLeft(clamped)
    setArrowX(Math.min(Math.max(anchor.x - clamped + half, 12), el.offsetWidth - 12))
  }, [anchor?.x, anchor?.y, selectedPlayerId, selectedRouteId, selectedAnnotationId, panel])

  useEffect(() => {
    if (!panel) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPanel(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [panel])

  if (!anchor || (!player && !route && !note)) return null

  // Pin the bar's own edge a fixed gap from the marker rather than guessing
  // its height — the bar changes size with what is selected.
  const below = anchor.y < 110
  const style = {
    left: left || anchor.x,
    top: below ? anchor.y + 26 : anchor.y - 24,
    transform: below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    ['--arrow-x' as string]: `${arrowX}px`,
  }

  return (
    <div className={`float-bar ${below ? 'below' : ''}`} style={style} ref={ref} onPointerDown={(e) => e.stopPropagation()}>
      {player && (
        <>
          <input
            className="float-label"
            value={player.label}
            maxLength={3}
            onChange={(e) => s().relabelPlayer(player.id, e.target.value.toUpperCase())}
            title="Player label"
          />
          <span className="float-sep" />
          {TOP_ROUTES.map((name) => {
            const t = QUICK_ROUTES.find((q) => q.name === name)!
            return (
              <button key={name} className="float-btn" onClick={() => s().applyQuickRoute(player.id, t)}>
                {name}
              </button>
            )
          })}
          <button
            className={`float-btn more ${panel === 'routes' ? 'on' : ''}`}
            onClick={() => setPanel(panel === 'routes' ? null : 'routes')}
          >
            More ▾
          </button>
          <span className="float-sep" />
          <button
            className={`float-icon ${panel === 'marker' ? 'on' : ''}`}
            title="Marker shape and colour"
            onClick={() => setPanel(panel === 'marker' ? null : 'marker')}
          >
            🎨
          </button>
          <button className="float-icon danger" title="Remove player" onClick={() => s().deleteSelection()}>
            ✕
          </button>
        </>
      )}

      {route && (
        <>
          <div className="seg float-seg">
            {(['route', 'block', 'motion'] as RouteKind[]).map((k) => (
              <button
                key={k}
                className={`seg-btn ${route.kind === k ? 'active' : ''}`}
                onClick={() => s().setRouteKind(route.id, k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <span className="float-sep" />
          <span className="float-tag">Read</span>
          <div className="seg float-seg read">
            <button className={`seg-btn ${route.read ? '' : 'active'}`} onClick={() => s().setRouteRead(route.id, undefined)}>
              —
            </button>
            {READ_OPTIONS.map((r) => (
              <button
                key={r}
                className={`seg-btn ${route.read === r ? 'active' : ''}`}
                onClick={() => s().setRouteRead(route.id, r)}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="float-sep" />
          {ROUTE_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${route.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => s().recolorRoute(route.id, c)}
            />
          ))}
          <button className="float-icon danger" title="Delete assignment" onClick={() => s().deleteSelection()}>
            ✕
          </button>
        </>
      )}

      {note && <NoteBar note={note} />}

      {panel === 'routes' && player && (
        <div className="float-panel">
          <h4>Routes</h4>
          <div className="quick-grid">
            {QUICK_ROUTES.map((q) => (
              <button key={q.name} className="quick-btn" onClick={() => s().applyQuickRoute(player.id, q)}>
                {q.name}
              </button>
            ))}
          </div>
          <h4>Blocks &amp; more</h4>
          <div className="quick-grid">
            {QUICK_ASSIGNMENTS.map((q) => (
              <button key={q.name} className="quick-btn" onClick={() => s().applyQuickRoute(player.id, q)}>
                {q.name}
              </button>
            ))}
          </div>
          <button className="btn ghost block" onClick={() => s().clearPlayerRoute(player.id)}>
            Clear assignment
          </button>
        </div>
      )}

      {panel === 'marker' && player && (
        <div className="float-panel narrow">
          <h4>Marker</h4>
          <div className="seg">
            {SHAPES.map((sh) => (
              <button
                key={sh.id}
                className={`seg-btn ${player.shape === sh.id ? 'active' : ''}`}
                onClick={() => s().setPlayerShape(player.id, sh.id)}
                title={sh.title}
              >
                {sh.label}
              </button>
            ))}
          </div>
          <div className="swatch-row">
            {MARKER_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${player.fill?.toLowerCase() === c ? 'active' : ''}`}
                style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #d5d3e0' : undefined }}
                onClick={() => s().setPlayerFill(player.id, c)}
              />
            ))}
            <button
              className={`swatch reset ${player.fill ? '' : 'active'}`}
              onClick={() => s().setPlayerFill(player.id, undefined)}
              title="Back to the Display setting"
            >
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteBar({ note }: { note: Annotation }) {
  const s = useStore.getState
  return (
    <>
      <input
        className="float-note"
        autoFocus
        value={note.text}
        placeholder="vs 2-high: work the seam"
        onChange={(e) => s().updateAnnotation(note.id, { text: e.target.value })}
      />
      <span className="float-sep" />
      {ROUTE_COLORS.map((c) => (
        <button
          key={c}
          className={`swatch ${note.color === c ? 'active' : ''}`}
          style={{ background: c }}
          onClick={() => s().updateAnnotation(note.id, { color: c })}
        />
      ))}
      <button className="float-icon danger" title="Delete note" onClick={() => s().deleteSelection()}>
        ✕
      </button>
    </>
  )
}
