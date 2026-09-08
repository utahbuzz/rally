import { useEffect, useRef, useState } from 'react'
import { PASS_CONCEPTS, RUN_CONCEPTS } from '../data/concepts'
import { useStore } from '../store'

/**
 * The whole-play picker. A coach calls "Smash", not six separate routes, so
 * this is the front door to drawing a play — one click lays down every job,
 * numbers the progression and blocks the line.
 */
export function ConceptMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const apply = (name: string) => {
    useStore.getState().applyConcept(name)
    setOpen(false)
  }

  return (
    <div className="display-wrap" ref={wrapRef}>
      <button
        className={`tool-btn concept-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Draw a whole concept in one click"
      >
        <span className="tool-icon">✨</span>
        Concepts
      </button>

      {open && (
        <div className="popover concept-pop">
          <h4>🎯 Pass concepts</h4>
          <div className="concept-grid">
            {PASS_CONCEPTS.map((c) => (
              <button key={c.name} className="concept-btn-item" onClick={() => apply(c.name)} title={c.notes}>
                <span className="concept-name">{c.name}</span>
                <span className="concept-note">{c.notes.split('.')[0]}</span>
              </button>
            ))}
          </div>

          <h4>🏈 Run concepts</h4>
          <div className="concept-grid">
            {RUN_CONCEPTS.map((c) => (
              <button key={c.name} className="concept-btn-item" onClick={() => apply(c.name)} title={c.notes}>
                <span className="concept-name">{c.name}</span>
                <span className="concept-note">{c.notes.split('.')[0]}</span>
              </button>
            ))}
          </div>

          <p className="hint">
            Applies to the formation you have up, replacing whatever is drawn. The line blocks itself
            and the reads come numbered — then tweak anything by hand.
          </p>
        </div>
      )}
    </div>
  )
}
