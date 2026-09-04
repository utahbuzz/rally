import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import {
  DisplaySettings,
  FillMode,
  GROUP_COLORS,
  GROUP_LABELS,
  LabelMode,
  MARKER_COLORS,
  PositionGroup,
  ShapeMode,
} from '../types'

const LABEL_MODES: Array<{ id: LabelMode; label: string; hint: string }> = [
  { id: 'position', label: 'Position', hint: 'X, Z, H, QB — how your playbook reads' },
  { id: 'number', label: 'Number', hint: '1-11 per side, for scout-team cards' },
  { id: 'none', label: 'Blank', hint: 'Markers only, no text' },
]

const FILL_MODES: Array<{ id: FillMode; label: string; hint: string }> = [
  { id: 'white', label: 'White', hint: 'Classic outlined markers' },
  { id: 'team', label: 'By team', hint: 'One colour for offense, one for defense' },
  { id: 'group', label: 'By group', hint: 'O-line, backs, receivers and each defensive level' },
]

const SHAPES: Array<{ id: ShapeMode; label: string; title: string }> = [
  { id: 'auto', label: 'Auto', title: 'Leave each player as it is drawn (center stays a square)' },
  { id: 'circle', label: '○', title: 'Circle' },
  { id: 'square', label: '□', title: 'Square' },
  { id: 'triangle', label: '△', title: 'Triangle' },
  { id: 'text', label: 'A', title: 'Letter only, no marker' },
]

const OFF_GROUPS: PositionGroup[] = ['OL', 'QB', 'RB', 'WR']
const DEF_GROUPS: PositionGroup[] = ['DL', 'LB', 'DB']

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="swatch-row">
      {MARKER_COLORS.map((c) => (
        <button
          key={c}
          className={`swatch ${value.toLowerCase() === c ? 'active' : ''}`}
          style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #d5d3e0' : undefined }}
          onClick={() => onPick(c)}
          title={c}
        />
      ))}
    </div>
  )
}

export function DisplayMenu() {
  const display = useStore((s) => s.display)
  const set = (patch: Partial<DisplaySettings>) => useStore.getState().setDisplay(patch)
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

  return (
    <div className="display-wrap" ref={wrapRef}>
      <button
        className={`tool-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Change how players are drawn"
      >
        <span className="tool-icon">◑</span>
        Display
      </button>

      {open && (
        <div className="popover">
          <h4>Labels</h4>
          <div className="seg">
            {LABEL_MODES.map((m) => (
              <button
                key={m.id}
                className={`seg-btn ${display.labels === m.id ? 'active' : ''}`}
                onClick={() => set({ labels: m.id })}
                title={m.hint}
              >
                {m.label}
              </button>
            ))}
          </div>

          <h4>Marker fill</h4>
          <div className="seg">
            {FILL_MODES.map((m) => (
              <button
                key={m.id}
                className={`seg-btn ${display.fill === m.id ? 'active' : ''}`}
                onClick={() => set({ fill: m.id })}
                title={m.hint}
              >
                {m.label}
              </button>
            ))}
          </div>

          {display.fill === 'team' && (
            <>
              <label className="field-label">Offense</label>
              <Swatches value={display.offColor} onPick={(c) => set({ offColor: c })} />
              <label className="field-label">Defense</label>
              <Swatches value={display.defColor} onPick={(c) => set({ defColor: c })} />
            </>
          )}

          {display.fill === 'group' && (
            <div className="legend">
              {[...OFF_GROUPS, ...DEF_GROUPS].map((g) => (
                <span key={g} className="legend-item">
                  <i style={{ background: GROUP_COLORS[g] }} />
                  {GROUP_LABELS[g]}
                </span>
              ))}
            </div>
          )}

          <h4>Offense marker</h4>
          <div className="seg">
            {SHAPES.map((sh) => (
              <button
                key={sh.id}
                className={`seg-btn ${display.offShape === sh.id ? 'active' : ''}`}
                onClick={() => set({ offShape: sh.id })}
                title={sh.title}
              >
                {sh.label}
              </button>
            ))}
          </div>

          <h4>Defense marker</h4>
          <div className="seg">
            {SHAPES.map((sh) => (
              <button
                key={sh.id}
                className={`seg-btn ${display.defShape === sh.id ? 'active' : ''}`}
                onClick={() => set({ defShape: sh.id })}
                title={sh.title}
              >
                {sh.label}
              </button>
            ))}
          </div>

          <p className="hint">
            Applies to every play, the thumbnails and anything you print. A single player can be
            given its own shape and colour — click it on the field.
          </p>
        </div>
      )}
    </div>
  )
}
