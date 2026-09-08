import { useState } from 'react'
import { useStore } from '../store'
import { FOLDER_EMOJI, folderName, folderParent, Play } from '../types'

export interface FolderNode {
  path: string
  children: FolderNode[]
  plays: Play[]
}

/**
 * Build the tree from the folder paths that exist — both the ones a coach
 * made and any a play refers to, so an imported or AI-written play can bring
 * its folder with it.
 */
export function buildTree(plays: Play[], known: string[]): { roots: FolderNode[]; unfiled: Play[] } {
  const paths = new Set(known)
  for (const p of plays) {
    if (!p.folder) continue
    // every ancestor exists too, so a nested path always has a parent to sit in
    const parts = p.folder.split('/')
    for (let i = 1; i <= parts.length; i++) paths.add(parts.slice(0, i).join('/'))
  }

  const nodes = new Map<string, FolderNode>()
  for (const path of paths) nodes.set(path, { path, children: [], plays: [] })
  for (const p of plays) {
    if (p.folder && nodes.has(p.folder)) nodes.get(p.folder)!.plays.push(p)
  }

  const roots: FolderNode[] = []
  for (const node of nodes.values()) {
    const parent = folderParent(node.path)
    if (parent && nodes.has(parent)) nodes.get(parent)!.children.push(node)
    else roots.push(node)
  }

  const sort = (list: FolderNode[]) => {
    list.sort((a, b) => a.path.localeCompare(b.path))
    for (const n of list) {
      n.plays.sort((a, b) => a.name.localeCompare(b.name))
      sort(n.children)
    }
  }
  sort(roots)

  const filed = new Set(plays.filter((p) => p.folder && nodes.has(p.folder)).map((p) => p.id))
  return { roots, unfiled: plays.filter((p) => !filed.has(p.id)) }
}

/** Count every play at or below a folder, so a collapsed row still tells you. */
export function countPlays(node: FolderNode): number {
  return node.plays.length + node.children.reduce((n, c) => n + countPlays(c), 0)
}

export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div className="emoji-pop" onClick={(e) => e.stopPropagation()}>
      {FOLDER_EMOJI.map((e) => (
        <button key={e} onClick={() => { onPick(e); onClose() }} title={`Use ${e}`}>
          {e}
        </button>
      ))}
    </div>
  )
}

export function FolderRow({
  node,
  depth,
  open,
  dropping,
  onToggle,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  node: FolderNode
  depth: number
  open: boolean
  dropping: boolean
  onToggle: () => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}) {
  const s = useStore.getState
  const [menu, setMenu] = useState(false)
  const [emoji, setEmoji] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)

  const name = folderName(node.path)
  const total = countPlays(node)

  const commitRename = () => {
    if (draft.trim()) s().renameFolder(node.path, draft)
    setRenaming(false)
  }

  if (renaming) {
    return (
      <div className="folder-row editing" style={{ paddingLeft: 6 + depth * 14 }}>
        <input
          className="folder-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`folder-row ${dropping ? 'dropping' : ''} ${confirming || menu || emoji ? 'holding' : ''}`}
      style={{ paddingLeft: 6 + depth * 14 }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <button className="folder-main" onClick={onToggle}>
        <span className={`caret ${open ? '' : 'closed'}`}>▾</span>
        <span className="folder-name">{name}</span>
        <span className="count">{total}</span>
      </button>

      <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
        {confirming ? (
          <>
            <button
              className="confirm-del"
              title={`Delete "${name}" — its plays move up, nothing is lost`}
              onClick={() => { s().deleteFolder(node.path); setConfirming(false) }}
            >
              Delete?
            </button>
            <button title="Keep it" onClick={() => setConfirming(false)}>↩</button>
          </>
        ) : (
          <>
            <button title="Add a folder inside this one" onClick={() => s().createFolder(`${node.path}/New folder`)}>
              ＋
            </button>
            <button title="Change the icon" onClick={() => { setEmoji((v) => !v); setMenu(false) }}>
              🎨
            </button>
            <button title="More" onClick={() => { setMenu((v) => !v); setEmoji(false) }}>
              ⋯
            </button>
          </>
        )}
        {emoji && (
          <EmojiPicker
            onClose={() => setEmoji(false)}
            onPick={(e) => s().renameFolder(node.path, `${e} ${name.replace(/^\p{Extended_Pictographic}️?\s*/u, '')}`)}
          />
        )}
        {menu && (
          <div className="row-menu" onClick={() => setMenu(false)}>
            <button onClick={() => { setDraft(name); setRenaming(true) }}>Rename</button>
            <button className="danger" onClick={() => setConfirming(true)}>Delete folder</button>
          </div>
        )}
      </div>
    </div>
  )
}
