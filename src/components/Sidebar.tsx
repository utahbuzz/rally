import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { PlaySVG } from './PlayGraphics'

export function Sidebar() {
  const display = useStore((s) => s.display)
  const plays = useStore((s) => s.plays)
  const currentId = useStore((s) => s.currentId)
  const s = useStore.getState
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    plays.forEach((p) => p.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [plays])

  const filtered = plays.filter((p) => {
    if (tag && !p.tags.includes(tag)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.offFormation.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-title-row">
          <h2>Playbook</h2>
          <span className="count">{plays.length}</span>
        </div>
        <button className="btn primary block" onClick={() => s().newPlay('Gun Spread (2x2)')}>
          + New Play
        </button>
        <input
          className="search"
          placeholder="Search plays…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {allTags.length > 0 && (
          <div className="tag-row">
            {allTags.map((t) => (
              <button
                key={t}
                className={`tag ${tag === t ? 'active' : ''}`}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="play-list">
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`play-card ${p.id === currentId ? 'active' : ''}`}
            onClick={() => s().selectPlay(p.id)}
          >
            <div className="thumb">
              <PlaySVG play={p} display={display} />
            </div>
            <div className="play-meta">
              <div className="play-title">{p.name}</div>
              <div className="play-sub">
                {p.offFormation || 'Custom'}
                {p.tags.length > 0 && <span className="dot">·</span>}
                {p.tags.join(', ')}
              </div>
            </div>
            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
              <button title="Duplicate play" onClick={() => s().duplicatePlay(p.id)}>
                ⧉
              </button>
              <button
                title="Delete play"
                className="danger"
                onClick={() => {
                  if (confirm(`Delete "${p.name}"?`)) s().deletePlay(p.id)
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty">No plays match.</div>}
      </div>
    </aside>
  )
}
