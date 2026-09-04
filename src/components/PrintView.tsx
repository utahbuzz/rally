import { useEffect } from 'react'
import { useStore } from '../store'
import { PlaySVG, progressionLine } from './PlayGraphics'

export function PrintView() {
  const plays = useStore((s) => s.plays)
  const printSize = useStore((s) => s.printSize)
  const display = useStore((s) => s.display)
  const s = useStore.getState

  useEffect(() => {
    const onAfter = () => s().setPrintMode(false)
    window.addEventListener('afterprint', onAfter)
    return () => window.removeEventListener('afterprint', onAfter)
  }, [s])

  return (
    <div className="print-overlay">
      <div className="print-controls no-print">
        <div>
          <h2>Print playbook</h2>
          <p>{plays.length} plays — use your browser's print dialog to save as PDF.</p>
        </div>
        <div className="print-actions">
          <div className="seg">
            <button
              className={`seg-btn ${printSize === 'large' ? 'active' : ''}`}
              onClick={() => s().setPrintSize('large')}
            >
              4 / page
            </button>
            <button
              className={`seg-btn ${printSize === 'small' ? 'active' : ''}`}
              onClick={() => s().setPrintSize('small')}
            >
              8 / page (wristband)
            </button>
          </div>
          <button className="btn primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="btn ghost" onClick={() => s().setPrintMode(false)}>
            Close
          </button>
        </div>
      </div>
      <div className={`print-sheet ${printSize}`}>
        {plays.map((p) => (
          <div key={p.id} className="print-card">
            <div className="print-card-head">
              <span className="print-card-name">{p.name}</span>
              <span className="print-card-form">{p.offFormation}</span>
            </div>
            <PlaySVG play={p} display={display} />
            {progressionLine(p) && <div className="print-card-read">{progressionLine(p)}</div>}
            {printSize === 'large' && p.notes && <div className="print-card-notes">{p.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
