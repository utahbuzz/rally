import { useEffect, useRef, useState } from 'react'
import {
  askCoordinator,
  ChatTurn,
  getApiKey,
  getWorkspaceId,
  setApiKey,
  setWorkspaceId,
} from '../coordinator'

const SUGGESTIONS = [
  '5 plays to beat Cover 2 on 3rd and 6',
  '3 red zone shot plays vs man press',
  'Give me a short-yardage run from I-Form',
  '4 quick game answers vs a blitz',
]

/** The API rejects identity-linked keys that do not name a workspace. */
const WORKSPACE_ERROR = /workspace/i

export function Coordinator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [setupOpen, setSetupOpen] = useState(() => !getApiKey())
  const [keyInput, setKeyInput] = useState(() => getApiKey())
  const [wsInput, setWsInput] = useState(() => getWorkspaceId())
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
      const message = e instanceof Error ? e.message : 'Something went wrong'
      setError(message)
      // a missing workspace id is fixable right here — open the settings
      if (WORKSPACE_ERROR.test(message) && !getWorkspaceId()) setSetupOpen(true)
    } finally {
      setBusy(false)
      setNote('')
    }
  }

  const saveSettings = () => {
    setApiKey(keyInput.trim())
    setWorkspaceId(wsInput.trim())
    setError('')
    setSetupOpen(false)
  }

  if (!open) return null

  return (
    <aside className="coach-panel">
      <header className="coach-head">
        <div>
          <div className="coach-title">Coach AI</div>
          <div className="coach-sub">Ask for plays — they draw straight into your playbook</div>
        </div>
        <div className="coach-head-actions">
          <button
            className="coach-close"
            onClick={() => setSetupOpen((v) => !v)}
            title="API key and workspace settings"
          >
            ⚙
          </button>
          <button className="coach-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </header>

      {setupOpen ? (
        <div className="coach-setup">
          <p className="hint">
            Coach AI runs on Claude. Paste an Anthropic API key — it is stored in this browser only
            and goes straight to Anthropic through your own Supabase function.
          </p>
          <label className="field-label">API key</label>
          <input
            className="text-input"
            type="password"
            placeholder="sk-ant-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <label className="field-label">Workspace ID (only for identity-linked keys)</label>
          <input
            className="text-input"
            placeholder="wrkspc_…"
            value={wsInput}
            onChange={(e) => setWsInput(e.target.value)}
          />
          <p className="hint">
            Leave this blank for a standard key. If you see "anthropic-workspace-id is required",
            your key is identity-linked — copy its workspace ID from the Anthropic Console under
            Settings → Workspaces and paste it here.
          </p>
          <button className="btn primary block" onClick={saveSettings}>
            Save
          </button>
          <button className="btn ghost block" onClick={() => setSetupOpen(false)}>
            {getApiKey() ? 'Cancel' : 'Skip — a key is already set on the server'}
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
