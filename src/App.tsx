import { useEffect, useState } from 'react'
import { ensureCurrent, useStore } from './store'
import { Field } from './components/Field'
import { Coordinator } from './components/Coordinator'
import { Inspector } from './components/Inspector'
import { PrintView } from './components/PrintView'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { PlayActions, PlaySetup, TopBar } from './components/TopBar'
import { useCompact } from './utils/useCompact'

/** Which drawer is open on a phone or tablet. */
type Sheet = 'plays' | 'setup' | 'edit' | 'more' | null

const BAR: Array<{ id: Exclude<Sheet, null> | 'coach'; icon: string; label: string }> = [
  { id: 'plays', icon: '☰', label: 'Plays' },
  { id: 'setup', icon: '⚙', label: 'Setup' },
  { id: 'edit', icon: '✎', label: 'Edit' },
  { id: 'coach', icon: '✦', label: 'Coach' },
  { id: 'more', icon: '⋯', label: 'More' },
]

export default function App() {
  const plays = useStore((s) => s.plays)
  const currentId = useStore((s) => s.currentId)
  const printMode = useStore((s) => s.printMode)
  const selectedPlayerId = useStore((s) => s.selectedPlayerId)
  const selectedRouteId = useStore((s) => s.selectedRouteId)
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId)
  const compact = useCompact()
  const [coachOpen, setCoachOpen] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)

  useEffect(() => {
    ensureCurrent()
  }, [plays.length, currentId])

  // tapping a player on a phone is a request to give it a job, so bring the
  // inspector up rather than leaving it behind a menu
  const selection = selectedPlayerId ?? selectedRouteId ?? selectedAnnotationId
  useEffect(() => {
    if (!compact) return
    if (selection) setSheet('edit')
    // deselecting on the field puts the sheet away again
    else setSheet((cur) => (cur === 'edit' ? null : cur))
  }, [compact, selection])

  // growing back to a desktop width must not strand a drawer open
  useEffect(() => {
    if (!compact) setSheet(null)
  }, [compact])

  const play = plays.find((p) => p.id === currentId) ?? plays[0]
  if (!play) return null

  const toggle = (id: Sheet) => setSheet((cur) => (cur === id ? null : id))

  return (
    <>
      <div className={`app ${printMode ? 'print-hidden' : ''} ${compact ? 'compact' : ''}`}>
        <TopBar play={play} onOpenCoach={() => setCoachOpen(true)} compact={compact} />
        <div className="app-body">
          <div className={`panel-host panel-left ${sheet === 'plays' ? 'open' : ''}`}>
            <Sidebar onPick={() => compact && setSheet(null)} />
          </div>
          <main className="canvas-area">
            <Toolbar />
            <div className="field-wrap">
              <Field play={play} />
            </div>
          </main>
          <div className={`panel-host panel-bottom ${sheet === 'edit' ? 'open' : ''}`}>
            <Inspector play={play} />
          </div>
          <Coordinator open={coachOpen} onClose={() => setCoachOpen(false)} />
        </div>

        {compact && (sheet === 'setup' || sheet === 'more') && (
          <div className="mobile-sheet">
            <div className="sheet-head">
              <h3>{sheet === 'setup' ? 'Play setup' : 'Playbook'}</h3>
              <button className="coach-close" onClick={() => setSheet(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="sheet-body">
              {sheet === 'setup' ? <PlaySetup play={play} /> : <PlayActions play={play} />}
            </div>
          </div>
        )}

        {/* the edit sheet gets no scrim: you have to see the field you are
            editing, and tapping another player should just work */}
        {compact && sheet && sheet !== 'edit' && (
          <div className="sheet-scrim" onClick={() => setSheet(null)} />
        )}

        {compact && (
          <nav className="mobile-bar">
            {BAR.map((item) => {
              const active = item.id === 'coach' ? coachOpen : sheet === item.id
              return (
                <button
                  key={item.id}
                  className={active ? 'active' : ''}
                  onClick={() => {
                    if (item.id === 'coach') {
                      setSheet(null)
                      setCoachOpen((o) => !o)
                    } else {
                      setCoachOpen(false)
                      toggle(item.id)
                    }
                  }}
                >
                  <span className="bar-icon">{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}
      </div>
      {printMode && <PrintView />}
    </>
  )
}
