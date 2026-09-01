import { useStore } from '../store'
import { ROUTE_COLORS, Tool } from '../types'

const TOOLS: Array<{ id: Tool; label: string; icon: string; key: string; hint: string }> = [
  { id: 'select', label: 'Select', icon: '↖', key: 'V', hint: 'Move players, edit routes' },
  { id: 'route', label: 'Route', icon: '→', key: 'R', hint: 'Click a player, then click points' },
  { id: 'block', label: 'Block', icon: '⊤', key: 'B', hint: 'Draw a blocking assignment' },
  { id: 'motion', label: 'Motion', icon: '⇢', key: 'M', hint: 'Draw pre-snap motion (dashed)' },
]

export function Toolbar() {
  const tool = useStore((s) => s.tool)
  const routeColor = useStore((s) => s.routeColor)
  const s = useStore.getState

  return (
    <div className="toolbar">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => s().setTool(t.id)}
            title={`${t.hint} (${t.key})`}
          >
            <span className="tool-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tool-group colors">
        {ROUTE_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${routeColor === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => s().setRouteColor(c)}
            title="Route color"
          />
        ))}
      </div>
    </div>
  )
}
