import { useEffect, useRef, useState } from 'react'
import { askCoordinator, ChatTurn, getApiKey, setApiKey } from '../coordinator'

const SUGGESTIONS = [
  '5 plays to beat Cover 2 on 3rd and 6',
  '3 red zone shot plays vs man press',
  'Give me a short-yardage run from I-Form',
  '4 quick game answers vs a blitz',
]

export function Coordinator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [hasKey, setHasKey] = useState(() => !!getApiKey())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, note, busy])

  const send = async (question: string) => {
    if (!question.trim() || busy) return
    setError('')
    setInput('')
    const history = turns
    setTurns([...history, { role: 'user', text: question }])
    setBusy(true)
    setNote('Thinking…')
    try {
      const reply = await askCoordinator(history, question, setNote)
      setTurns((t) => [...t, reply])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
      setNote('')
    }
  }

  if (!open) return null

  return (
    <aside className="coach-panel">
      <header className="coach-head">
        <div>
          <div className="coach-title">Coach AI</div>
          <div className="coach-sub">Ask for plays — they draw straight into your playbook</div>
        </div>
        <button className="coach-close" onClick={onClose} title="Close">
          ✕
        </button>
      </header>

      {!hasKey ? (
        <div className="coach-setup">
          <p className="hint">
            Coach AI runs on Claude. Paste an Anthropic API key to enable it — it is stored in this
            browser only and sent straight to Anthropic through your own Supabase function.
          </p>
          <input
            className="text-input"
            type="password"
            placeholder="sk-ant-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button
            className="btn primary block"
            onClick={() => {
              setApiKey(keyInput.trim())
              setHasKey(!!keyInput.trim())
            }}
          >
            Enable Coach AI
          </button>
          <p className="hint">
            Get a key at console.anthropic.com. If your Supabase project already has an
            ANTHROPIC_API_KEY secret set, Coach AI works without pasting anything.
          </p>
          <button className="btn ghost block" onClick={() => setHasKey(true)}>
            Skip — a key is already set on the server
          </button>
        </div>
      ) : (
        <>
          <div className="coach-scroll" ref={scrollRef}>
            {turns.length === 0 && (
              <div className="coach-empty">
                <p className="hint">Try one of these:</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="coach-chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`coach-msg ${t.role}`}>
                <div className="coach-bubble">{t.text}</div>
                {t.plays && t.plays.length > 0 && (
                  <div className="coach-plays">
                    {t.plays.map((p) => (
                      <span key={p} className="coach-play">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="coach-msg assistant">
                <div className="coach-bubble working">{note || 'Working…'}</div>
              </div>
            )}
            {error && <div className="coach-error">{error}</div>}
          </div>

          <form
            className="coach-input"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <input
              className="text-input"
              placeholder="Ask for plays…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button className="btn primary" type="submit" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </aside>
  )
}
