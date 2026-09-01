import { useStore } from '../store'
import { Play, ROUTE_COLORS, RouteKind } from '../types'
import { QUICK_ASSIGNMENTS, QUICK_ROUTES } from '../data/routeTree'

const KIND_LABEL: Record<RouteKind, string> = { route: 'Route', block: 'Block', motion: 'Motion' }

export function Inspector({ play }: { play: Play }) {
  const selectedPlayerId = useStore((s) => s.selectedPlayerId)
  const selectedRouteId = useStore((s) => s.selectedRouteId)
  const s = useStore.getState

  const player = play.players.find((p) => p.id === selectedPlayerId)
  const route = play.routes.find((r) => r.id === selectedRouteId)

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
        <li>Drag players to tweak alignment — routes follow.</li>
        <li><b>Flip</b> mirrors the play; <b>Ctrl+Z</b> undoes anything.</li>
      </ul>
    </aside>
  )
}
