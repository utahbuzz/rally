import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { Play } from '../types'

/**
 * Tags and coaching notes. These belong to the play rather than to anything
 * selected on it, so they live here instead of holding a column open down the
 * side of the screen.
 */
export function DetailsMenu({ play }: { play: Play }) {
  const s = useStore.getState
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

  const filled = play.tags.length > 0 || play.notes.trim().length > 0

  return (
    <div className="display-wrap" ref={wrapRef}>
      <button
        className={`tool-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Tags and coaching notes for this play"
      >
        <span className="tool-icon">📝</span>
        Details
        {filled && <span className="dot-mark" aria-hidden="true" />}
      </button>

      {open && (
        <div className="popover details-pop">
          <h4>Tags</h4>
          <input
            className="text-input"
            value={play.tags.join(', ')}
            placeholder="Run, 3rd Down, Red Zone…"
            onChange={(e) =>
              s().updatePlay({
                tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
              })
            }
          />
          <h4>Coaching notes</h4>
          <textarea
            className="text-area"
            rows={5}
            value={play.notes}
            placeholder="Reads, protections, coaching points…"
            onChange={(e) => s().updatePlay({ notes: e.target.value })}
          />
          <h4>Shortcuts</h4>
          <ul className="help-list">
            <li><b>Click a player</b> — its toolbar appears on the field.</li>
            <li><b>R</b> draw a route, <b>B</b> a block, <b>M</b> motion, <b>T</b> a note.</li>
            <li>Click a route to number the read.</li>
            <li><b>Flip</b> mirrors the play; <b>Ctrl+Z</b> undoes anything.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
