import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Play } from '../types'
import { buildTree, countPlays, FolderNode, FolderRow } from './FolderTree'
import { PlaySVG } from './PlayGraphics'

type GroupBy = 'folder' | 'formation' | 'tag' | 'none'

const GROUPINGS: Array<{ id: GroupBy; label: string; hint: string }> = [
  { id: 'folder', label: '📁 Folders', hint: 'Your own packages — a week, a game, an install' },
  { id: 'formation', label: 'Formation', hint: 'Every play you have out of each set' },
  { id: 'tag', label: 'Tag', hint: 'Your own buckets — Run, Pass, 3rd Down, Red Zone' },
  { id: 'none', label: 'All', hint: 'One list, most recently edited first' },
]

const UNSORTED = 'Unsorted'

/** Bucket plays into sections. A play with several tags shows under each. */
function group(plays: Play[], by: GroupBy): Array<[string, Play[]]> {
  if (by === 'none') {
    return [['', [...plays].sort((a, b) => b.updatedAt - a.updatedAt)]]
  }
  const buckets = new Map<string, Play[]>()
  const push = (key: string, p: Play) => {
    const list = buckets.get(key)
    if (list) list.push(p)
    else buckets.set(key, [p])
  }
  for (const p of plays) {
    if (by === 'formation') push(p.offFormation || 'Custom', p)
    else if (p.tags.length) p.tags.forEach((t) => push(t, p))
    else push(UNSORTED, p)
  }
  return [...buckets.entries()]
    .map(([k, list]) => [k, list.sort((a, b) => a.name.localeCompare(b.name))] as [string, Play[]])
    .sort((a, b) => {
      // catch-all buckets sit at the bottom, everything else alphabetical
      const rank = (k: string) => (k === UNSORTED || k === 'Custom' ? 1 : 0)
      return rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0])
    })
}

export function Sidebar({ onPick }: { onPick?: () => void } = {}) {
  const display = useStore((s) => s.display)
  const plays = useStore((s) => s.plays)
  const currentId = useStore((s) => s.currentId)
  const s = useStore.getState
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [starredOnly, setStarredOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('folder')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // deleting confirms inline rather than through window.confirm, which is
  // ignored outright in a sandboxed frame (an embedded preview) — the button
  // would look dead
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const folders = useStore((st) => st.folders)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [movingPlay, setMovingPlay] = useState<string | null>(null)
  const [newWeek, setNewWeek] = useState(false)
  const [weekName, setWeekName] = useState('')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    plays.forEach((p) => p.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [plays])

  const starCount = plays.filter((p) => p.starred).length

  const filtered = plays.filter((p) => {
    if (starredOnly && !p.starred) return false
    if (tag && !p.tags.includes(tag)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.offFormation.toLowerCase().includes(q) ||
      p.defFormation.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  // searching should show what it found, not make you open folders to see it
  const tree = useMemo(() => buildTree(filtered, folders), [filtered, folders])
  const allFolderPaths = useMemo(() => {
    const out: string[] = []
    const walk = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        out.push(n.path)
        walk(n.children)
      }
    }
    walk(buildTree(plays, folders).roots)
    return out
  }, [plays, folders])

  // a folder-grouped view is a tree, not sections; searching still flattens
  const useTree = groupBy === 'folder' && !query
  const sections = group(filtered, query ? 'none' : groupBy === 'folder' ? 'none' : groupBy)
  const filtering = starredOnly || !!tag || !!query

  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const card = (p: Play) => (
    <div
      key={p.id}
      className={`play-card ${p.id === currentId ? 'active' : ''} ${dragging === p.id ? 'dragging' : ''} ${movingPlay === p.id || pendingDelete === p.id ? 'holding' : ''}`}
      draggable
      onDragStart={(e) => {
        setDragging(p.id)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', p.id)
      }}
      onDragEnd={() => { setDragging(null); setDropTarget(null) }}
      onClick={() => {
        s().selectPlay(p.id)
        onPick?.()
      }}
    >
      <div className="thumb">
        <PlaySVG play={p} display={display} />
      </div>
      <div className="play-meta">
        <div className="play-title">{p.name}</div>
        <div className="play-sub">
          {p.offFormation || 'Custom'}
          {p.tags.length > 0 && <span className="dot">·</span>}
          {p.tags.join(', ')}
        </div>
      </div>
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        {pendingDelete === p.id ? (
          <>
            <button
              className="confirm-del"
              title={`Delete "${p.name}" for good`}
              onClick={() => {
                s().deletePlay(p.id)
                setPendingDelete(null)
              }}
            >
              Delete?
            </button>
            <button title="Keep it" onClick={() => setPendingDelete(null)}>
              ↩
            </button>
          </>
        ) : (
          <>
            <button
              className={`star ${p.starred ? 'on' : ''}`}
              title={p.starred ? 'Remove from the shortlist' : 'Add to the shortlist'}
              onClick={() => s().toggleStar(p.id)}
            >
              {p.starred ? '★' : '☆'}
            </button>
            {/* one menu rather than a row of buttons — four of them sat on top
                of the play name, which is the thing you are reading */}
            <button title="Move, duplicate or delete" onClick={() => setMovingPlay(movingPlay === p.id ? null : p.id)}>
              ⋯
            </button>
          </>
        )}
        {movingPlay === p.id && (
          <div className="row-menu move-menu">
            {allFolderPaths.length > 0 && <span className="menu-label">📁 Move to</span>}
            {allFolderPaths.map((f) => (
              <button
                key={f}
                className={p.folder === f ? 'on' : ''}
                onClick={() => { s().movePlay(p.id, f); setMovingPlay(null) }}
              >
                {f}
              </button>
            ))}
            {p.folder && (
              <button onClick={() => { s().movePlay(p.id, undefined); setMovingPlay(null) }}>
                Out of folders
              </button>
            )}
            <span className="menu-sep" />
            <button onClick={() => { s().duplicatePlay(p.id); setMovingPlay(null) }}>⧉ Duplicate</button>
            <button className="danger" onClick={() => { setPendingDelete(p.id); setMovingPlay(null) }}>
              ✕ Delete play
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const toggleFolder = (path: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const dropInto = (folder?: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) s().movePlay(id, folder)
    // clear here as well as on dragend: a drag that ends abnormally would
    // otherwise leave the card stuck at half opacity
    setDropTarget(null)
    setDragging(null)
  }

  const renderTree = (nodes: FolderNode[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      const open = !collapsedFolders.has(node.path)
      return (
        <div className="play-group folder-group" key={node.path}>
          <FolderRow
            node={node}
            depth={depth}
            open={open}
            dropping={dropTarget === node.path}
            onToggle={() => toggleFolder(node.path)}
            onDragOver={(e) => { e.preventDefault(); setDropTarget(node.path) }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={dropInto(node.path)}
          />
          {open && (
            <div className="folder-body">
              {renderTree(node.children, depth + 1)}
              {node.plays.map(card)}
              {countPlays(node) === 0 && (
                <div className="folder-empty" style={{ paddingLeft: 20 + depth * 14 }}>
                  Drag a play here
                </div>
              )}
            </div>
          )}
        </div>
      )
    })

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-title-row">
          <h2>Playbook</h2>
          <span className="count">{filtering ? `${filtered.length} of ${plays.length}` : plays.length}</span>
        </div>
        <button className="btn primary block" onClick={() => s().newPlay('Gun Spread (2x2)')}>
          + New Play
        </button>
        {groupBy === 'folder' && (
          <div className="folder-tools">
            <button className="btn ghost" onClick={() => s().createFolder('📁 New folder')} title="Add a folder">
              + Folder
            </button>
            <button
              className="btn ghost"
              onClick={() => { setNewWeek(true); setWeekName('') }}
              title="A week's whole package — the week, plus offense, defense and scout cards inside it"
            >
              🗓️ Week package
            </button>
          </div>
        )}
        {newWeek && (
          <div className="week-new">
            <input
              className="search"
              autoFocus
              placeholder="Week 2 vs Brunswick"
              value={weekName}
              onChange={(e) => setWeekName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setNewWeek(false)
                if (e.key === 'Enter' && weekName.trim()) {
                  s().createWeekPackage(`🗓️ ${weekName.trim()}`)
                  setNewWeek(false)
                }
              }}
            />
            <div className="week-new-actions">
              <button className="btn ghost" onClick={() => setNewWeek(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={!weekName.trim()}
                onClick={() => { s().createWeekPackage(`🗓️ ${weekName.trim()}`); setNewWeek(false) }}
              >
                Create
              </button>
            </div>
          </div>
        )}
        <input
          className="search"
          placeholder="Search plays, formations, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="seg group-seg" title="How the playbook is organized">
          {GROUPINGS.map((g) => (
            <button
              key={g.id}
              className={`seg-btn ${groupBy === g.id ? 'active' : ''}`}
              onClick={() => setGroupBy(g.id)}
              title={g.hint}
            >
              {g.label}
            </button>
          ))}
        </div>
        {(allTags.length > 0 || starCount > 0) && (
          <div className="tag-row">
            {starCount > 0 && (
              <button
                className={`tag star-tag ${starredOnly ? 'active' : ''}`}
                onClick={() => setStarredOnly((v) => !v)}
                title="Only the plays you starred"
              >
                ★ {starCount}
              </button>
            )}
            {allTags.map((t) => (
              <button
                key={t}
                className={`tag ${tag === t ? 'active' : ''}`}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="play-list">
        {useTree && renderTree(tree.roots, 0)}
        {useTree && tree.unfiled.length > 0 && (
          <div className="play-group">
            <div
              className={`folder-row unfiled ${dropTarget === '' ? 'dropping' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDropTarget('') }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={dropInto(undefined)}
            >
              <span className="folder-name">Not in a folder</span>
              <span className="count">{tree.unfiled.length}</span>
            </div>
            {tree.unfiled.map(card)}
          </div>
        )}
        {useTree && tree.roots.length === 0 && tree.unfiled.length === 0 && (
          <div className="empty">📁 No folders yet — make one for this week.</div>
        )}
        {!useTree && sections.map(([key, list]) =>
          key === '' ? (
            list.map(card)
          ) : (
            <div className="play-group" key={key}>
              <button className="group-head" onClick={() => toggleSection(key)}>
                <span className={`caret ${collapsed.has(key) ? 'closed' : ''}`}>▾</span>
                <span className="group-name">{key}</span>
                <span className="count">{list.length}</span>
              </button>
              {!collapsed.has(key) && list.map(card)}
            </div>
          ),
        )}
        {filtered.length === 0 && <div className="empty">🔍 No plays match.</div>}
      </div>
    </aside>
  )
}
