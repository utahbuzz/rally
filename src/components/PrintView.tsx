import { useEffect } from 'react'
import { useStore } from '../store'
import { PlaySVG, progressionLine } from './PlayGraphics'

export function PrintView() {
  const plays = useStore((s) => s.plays)
  const printSize = useStore((s) => s.printSize)
  const display = useStore((s) => s.display)
  const cardIn = useStore((s) => s.cardIn)
  const s = useStore.getState
  const wristband = printSize === 'small'

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
          <p>
            {plays.length} plays &mdash; use your browser&rsquo;s print dialog to save as PDF.
            {wristband && ' Set Scale to 100% (not "Fit to page") or the cards print the wrong size.'}
          </p>
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
              Wristband
            </button>
          </div>
          {wristband && (
            <label className="card-size" title="Measure the window on your wristband insert and enter it here">
              Card
              <input
                type="number"
                step="0.05"
                min="0.75"
                max="7.5"
                value={cardIn.w}
                onChange={(e) => s().setCardIn({ w: Number(e.target.value) })}
              />
              &times;
              <input
                type="number"
                step="0.05"
                min="0.75"
                max="7.5"
                value={cardIn.h}
                onChange={(e) => s().setCardIn({ h: Number(e.target.value) })}
              />
              in
            </label>
          )}
          <button className="btn primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="btn ghost" onClick={() => s().setPrintMode(false)}>
            Close
          </button>
        </div>
      </div>
      {wristband && (
        <div className="calibration">
          <div className="cal-box" aria-hidden="true" />
          <p>
            <b>Check the scale before you cut.</b> That square prints at exactly one inch. Measure it
            on the paper &mdash; if it is not 1", your print dialog is scaling the page and every card
            will be the wrong size. Set Scale to 100% and print again.
          </p>
        </div>
      )}
      <div
        className={`print-sheet ${printSize}`}
        style={{ ['--card-w' as string]: `${cardIn.w}in`, ['--card-h' as string]: `${cardIn.h}in` }}
      >
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
