import { useStore } from '../store'
import { MARKER_COLORS, Play, PlayerShape, READ_OPTIONS, ROUTE_COLORS, RouteKind } from '../types'
import { QUICK_ASSIGNMENTS, QUICK_ROUTES } from '../data/routeTree'

const KIND_LABEL: Record<RouteKind, string> = { route: 'Route', block: 'Block', motion: 'Motion' }

const SHAPES: Array<{ id: PlayerShape; label: string; title: string }> = [
  { id: 'circle', label: '○', title: 'Circle' },
  { id: 'square', label: '□', title: 'Square' },
  { id: 'triangle', label: '△', title: 'Triangle' },
  { id: 'text', label: 'A', title: 'Letter only' },
]

export function Inspector({ play }: { play: Play }) {
  const selectedPlayerId = useStore((s) => s.selectedPlayerId)
  const selectedRouteId = useStore((s) => s.selectedRouteId)
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId)
  const s = useStore.getState

  const player = play.players.find((p) => p.id === selectedPlayerId)
  const route = play.routes.find((r) => r.id === selectedRouteId)
  const note = (play.annotations ?? []).find((a) => a.id === selectedAnnotationId)

  if (note) {
    return (
      <aside className="inspector">
        <div className="insp-head">
          <span className="chip chip-o">Note</span>
        </div>
        <p className="hint">
          Anything the player needs to see on the card — a coverage beater, a check, an alert.
          Drag it anywhere on the field.
        </p>
        <textarea
          className="text-area"
          rows={3}
          autoFocus
          value={note.text}
          placeholder="e.g. vs 2-high: work the seam"
          onChange={(e) => s().updateAnnotation(note.id, { text: e.target.value })}
        />
        <h3>Color</h3>
        <div className="swatch-row">
          {ROUTE_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${note.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => s().updateAnnotation(note.id, { color: c })}
            />
          ))}
        </div>
        <button className="btn danger block" onClick={() => s().deleteSelection()}>
          Delete note
        </button>
      </aside>
    )
  }

  if (player) {
    const playerRoutes = play.routes.filter((r) => r.playerId === player.id)
    return (
      <aside className="inspector">
        <div className="insp-head">
          <span className={`chip ${player.team === 'O' ? 'chip-o' : 'chip-d'}`}>
            {player.team === 'O' ? 'Offense' : 'Defense'}
          </span>
          <input
            className="label-input"
            value={player.label}
            maxLength={3}
            onChange={(e) => s().relabelPlayer(player.id, e.target.value.toUpperCase())}
            title="Player label"
          />
        </div>

        <h3>Marker</h3>
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
              title="Fill this player's marker"
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

        <h3>Quick routes</h3>
        <p className="hint">One click assigns the route — mirrored automatically by side of field.</p>
        <div className="quick-grid">
          {QUICK_ROUTES.map((q) => (
            <button key={q.name} className="quick-btn" onClick={() => s().applyQuickRoute(player.id, q)}>
              {q.name}
            </button>
          ))}
        </div>

        <h3>Blocks &amp; more</h3>
        <div className="quick-grid">
          {QUICK_ASSIGNMENTS.map((q) => (
            <button key={q.name} className="quick-btn" onClick={() => s().applyQuickRoute(player.id, q)}>
              {q.name}
            </button>
          ))}
        </div>

        {playerRoutes.length > 0 && (
          <button className="btn ghost block" onClick={() => s().clearPlayerRoute(player.id)}>
            Clear assignment
          </button>
        )}
        <button className="btn danger block" onClick={() => s().deleteSelection()}>
          Remove player
        </button>
        <p className="hint">
          Or pick the <b>Route</b> tool and draw it yourself: click the player, click each break point,
          double-click to finish.
        </p>
      </aside>
    )
  }

  if (route) {
    const owner = play.players.find((p) => p.id === route.playerId)
    return (
      <aside className="inspector">
        <div className="insp-head">
          <span className="chip chip-o">{owner?.label ?? '?'} — {KIND_LABEL[route.kind]}</span>
        </div>
        <h3>Type</h3>
        <div className="seg">
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
        <h3>Read</h3>
        <p className="hint">
          Numbers the progression on the diagram, so a quarterback can see the order off the card.
        </p>
        <div className="seg read-seg">
          <button
            className={`seg-btn ${route.read ? '' : 'active'}`}
            onClick={() => s().setRouteRead(route.id, undefined)}
            title="No read number"
          >
            —
          </button>
          {READ_OPTIONS.map((r) => (
            <button
              key={r}
              className={`seg-btn ${route.read === r ? 'active' : ''}`}
              onClick={() => s().setRouteRead(route.id, r)}
              title={r === 'C' ? 'Checkdown' : `Read ${r}`}
            >
              {r}
            </button>
          ))}
        </div>

        <h3>Color</h3>
        <div className="swatch-row">
          {ROUTE_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${route.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => s().recolorRoute(route.id, c)}
            />
          ))}
        </div>
        <p className="hint">Drag the green handles on the field to reshape the {KIND_LABEL[route.kind].toLowerCase()}.</p>
        <button className="btn danger block" onClick={() => s().deleteSelection()}>
          Delete {KIND_LABEL[route.kind].toLowerCase()}
        </button>
      </aside>
    )
  }

  return (
    <aside className="inspector">
      <h3>Play details</h3>
      <label className="field-label">Tags</label>
      <input
        className="text-input"
        value={play.tags.join(', ')}
        placeholder="Run, 3rd Down, Red Zone…"
        onChange={(e) =>
          s().updatePlay({
            tags: e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          })
        }
      />
      <label className="field-label">Coaching notes</label>
      <textarea
        className="text-area"
        rows={6}
        value={play.notes}
        placeholder="Reads, protections, coaching points…"
        onChange={(e) => s().updatePlay({ notes: e.target.value })}
      />
      <h3>How it works</h3>
      <ul className="help-list">
        <li><b>Click a player</b> for one-click quick routes.</li>
        <li><b>R</b> then click a player to draw a custom route; double-click to finish.</li>
        <li><b>B</b> draws blocks (⊤ ending), <b>M</b> draws motion (dashed).</li>
        <li><b>T</b> drops a note on the field; click a route to number the read.</li>
        <li>Drag players to tweak alignment — routes follow.</li>
        <li><b>Flip</b> mirrors the play; <b>Ctrl+Z</b> undoes anything.</li>
      </ul>
    </aside>
  )
}
