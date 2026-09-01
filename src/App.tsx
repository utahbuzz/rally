import { useEffect } from 'react'
import { ensureCurrent, useStore } from './store'
import { Field } from './components/Field'
import { Inspector } from './components/Inspector'
import { PrintView } from './components/PrintView'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { TopBar } from './components/TopBar'

export default function App() {
  const plays = useStore((s) => s.plays)
  const currentId = useStore((s) => s.currentId)
  const printMode = useStore((s) => s.printMode)

  useEffect(() => {
    ensureCurrent()
  }, [plays.length, currentId])

  const play = plays.find((p) => p.id === currentId) ?? plays[0]
  if (!play) return null

  return (
    <>
      <div className={`app ${printMode ? 'print-hidden' : ''}`}>
        <TopBar play={play} />
        <div className="app-body">
          <Sidebar />
          <main className="canvas-area">
            <Toolbar />
            <div className="field-wrap">
              <Field play={play} />
            </div>
          </main>
          <Inspector play={play} />
        </div>
      </div>
      {printMode && <PrintView />}
    </>
  )
}
