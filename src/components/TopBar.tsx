import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { DisplaySettings, FIELD_SPOTS, HASH_SPOTS, hashIdForX, Play } from '../types'
import { DEFENSE_FORMATIONS, OFFENSE_FORMATIONS } from '../data/formations'
import { getShareUrl, onSyncStatus, SyncStatus } from '../sync'
import { exportCurrentPlayPNG, exportPlaybookJSON, parsePlaybookJSON } from '../utils/export'

function SyncChip() {
  const [status, setStatus] = useState<SyncStatus>('local')
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)
  useEffect(() => onSyncStatus(setStatus), [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard blocked (and prompt() is ignored in a sandboxed frame) —
      // put the link on screen so it can still be copied by hand
      setShowLink(true)
    }
  }

  if (status === 'local') {
    return (
      <span className="sync-chip local" title="Cloud sync unavailable — plays are saved in this browser only">
        Local
      </span>
    )
  }
  return (
    <>
      <button
        className="sync-chip cloud"
        onClick={copyLink}
        title="Synced to the cloud. Click to copy your playbook link — open it on any device (or hand it to the AI) to work on the same playbook."
      >
        {copied ? 'Link copied!' : status === 'syncing' ? 'Saving…' : '☁ Synced'}
      </button>
      {showLink && (
        <div className="modal-scrim" onClick={() => setShowLink(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Your playbook link</h3>
            <p>Open this on any device — or hand it to the AI — to work on the same playbook.</p>
            <input className="text-input" readOnly value={getShareUrl()} onFocus={(e) => e.currentTarget.select()} />
            <div className="modal-actions">
              <button className="btn primary" onClick={() => setShowLink(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function TopBar({ play, onOpenCoach }: { play: Play; onOpenCoach: () => void }) {
  const s = useStore.getState
  const canUndo = useStore((st) => st.past.length > 0)
  const canRedo = useStore((st) => st.future.length > 0)
  const plays = useStore((st) => st.plays)
  const display = useStore((st) => st.display)
  const fileRef = useRef<HTMLInputElement>(null)

  // window.confirm / window.alert are ignored in a sandboxed frame (an
  // embedded preview), so restore confirms in the page instead
  const [pendingImport, setPendingImport] = useState<{ plays: Play[]; display?: DisplaySettings } | null>(null)
  const [importError, setImportError] = useState('')

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportError('')
    try {
      setPendingImport(parsePlaybookJSON(await file.text()))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read that file')
    }
  }

  const applyImport = () => {
    if (!pendingImport) return
    s().importPlays(pendingImport.plays)
    if (pendingImport.display) s().setDisplay(pendingImport.display)
    setPendingImport(null)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#6965db" />
          <circle cx="11" cy="21" r="4.5" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M17 9 L25 17 M25 9 L17 17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="brand-name">Playcaller</span>
      </div>

      <div className="topbar-center">
        <input
          className="play-name"
          value={play.name}
          onChange={(e) => s().updatePlay({ name: e.target.value })}
          placeholder="Play name"
          spellCheck={false}
        />
        <select
          className="select"
          value={play.offFormation}
          onChange={(e) => (e.target.value ? s().applyFormation('O', e.target.value) : s().clearTeam('O'))}
          title="Offensive formation"
        >
          <option value="">No offense</option>
          {OFFENSE_FORMATIONS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={play.defFormation}
          onChange={(e) => (e.target.value ? s().applyFormation('D', e.target.value) : s().clearTeam('D'))}
          title="Defensive front"
        >
          <option value="">No defense</option>
          {DEFENSE_FORMATIONS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="seg hash-seg" title="Ball spot across the field - matches the L / LM / RM / R hash notation on practice scripts">
          {HASH_SPOTS.map((spot) => (
            <button
              key={spot.id}
              className={`seg-btn ${hashIdForX(play.ballX) === spot.id ? 'active' : ''}`}
              onClick={() => s().setBallSpot(spot.x)}
            >
              {spot.label}
            </button>
          ))}
        </div>
        <select
          className="select spot-select"
          value={play.yardsToGoal ?? ''}
          onChange={(e) => s().setFieldPosition(e.target.value === '' ? undefined : Number(e.target.value))}
          title="Where the ball is down the field. Inside the 26 the end zone comes into view and the play compresses to fit the space in front of it."
        >
          {FIELD_SPOTS.map((spot) => (
            <option key={spot.label} value={spot.yardsToGoal ?? ''}>
              {spot.label}
            </option>
          ))}
        </select>
        <button className="btn ghost" onClick={() => s().flipPlay()} title="Mirror the play left-right">
          ⇋ Flip
        </button>
      </div>

      <div className="topbar-right">
        <button className="btn coach-btn" onClick={onOpenCoach} title="Ask the AI coordinator for plays">
          ✦ Coach AI
        </button>
        <SyncChip />
        <span className="divider" />
        <button className="btn ghost" disabled={!canUndo} onClick={() => s().undo()} title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button className="btn ghost" disabled={!canRedo} onClick={() => s().redo()} title="Redo (Ctrl+Shift+Z)">
          ↪
        </button>
        <span className="divider" />
        <button className="btn ghost" onClick={() => exportCurrentPlayPNG(play)} title="Download this play as a PNG image">
          PNG
        </button>
        <button className="btn primary" onClick={() => s().setPrintMode(true)} title="Print playbook / save as PDF">
          Print / PDF
        </button>
        <span className="divider" />
        <button className="btn ghost" onClick={() => exportPlaybookJSON(plays, display)} title="Back up the whole playbook to a file">
          Backup
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()} title="Restore a playbook backup file">
          Restore
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImportFile} />
      </div>

      {(pendingImport || importError) && (
        <div className="modal-scrim" onClick={() => { setPendingImport(null); setImportError('') }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {importError ? (
              <>
                <h3>That file didn't load</h3>
                <p>{importError}</p>
                <div className="modal-actions">
                  <button className="btn primary" onClick={() => setImportError('')}>OK</button>
                </div>
              </>
            ) : (
              <>
                <h3>Restore playbook</h3>
                <p>
                  Replace your current playbook ({plays.length} play{plays.length === 1 ? '' : 's'})
                  with {pendingImport!.plays.length} play{pendingImport!.plays.length === 1 ? '' : 's'}{' '}
                  from this file? Your current plays will be gone.
                </p>
                <div className="modal-actions">
                  <button className="btn ghost" onClick={() => setPendingImport(null)}>Cancel</button>
                  <button className="btn primary" onClick={applyImport}>Replace</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
