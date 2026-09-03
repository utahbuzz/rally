/**
 * Cloud sync for Playcaller.
 *
 * The playbook id is a secret capability, share-link style: anyone with the
 * link sees the same playbook on any device. All server access goes through
 * security-definer RPCs keyed by that id; the table itself is unreachable.
 *
 * Flow: pull on load (server wins if it has plays; otherwise local plays are
 * pushed up), debounced full push after every local change, and a realtime
 * broadcast channel so other devices — and the MCP server — trigger a pull
 * within a second. A slow poll covers missed broadcasts. If the network is
 * unreachable (e.g. sandboxed previews), the app silently stays local-only.
 */
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useStore } from './store'
import { Play } from './types'

export const SUPABASE_URL = 'https://vxvsmmpriqkkkshgnqhh.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_WRhDxUgk24aB6-JF-dMLfw_GV3noVnx'

export type SyncStatus = 'local' | 'syncing' | 'synced'

const PB_KEY = 'playcaller-pb-id'
const clientId = Math.random().toString(36).slice(2)

let sb: SupabaseClient | null = null
let channel: RealtimeChannel | null = null
let playbookId = ''
let status: SyncStatus = 'local'
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushing = false
let applyingRemote = false

const statusListeners = new Set<(s: SyncStatus) => void>()

export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}

function setStatus(s: SyncStatus) {
  if (status === s) return
  status = s
  statusListeners.forEach((fn) => fn(s))
}

export function getPlaybookId(): string {
  return playbookId
}

export function getShareUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set('pb', playbookId)
  return url.toString()
}

function resolvePlaybookId(): string {
  const fromUrl = new URL(window.location.href).searchParams.get('pb')
  const isUuid = (v: string | null): v is string =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  let id: string | null = null
  try {
    if (isUuid(fromUrl)) {
      id = fromUrl
      window.localStorage.setItem(PB_KEY, id)
    } else {
      id = window.localStorage.getItem(PB_KEY)
      if (!isUuid(id)) {
        id = crypto.randomUUID()
        window.localStorage.setItem(PB_KEY, id)
      }
    }
  } catch {
    id = isUuid(fromUrl) ? fromUrl : crypto.randomUUID()
  }
  return id
}

async function pull(): Promise<void> {
  if (!sb || pushing || pushTimer) return
  const { data, error } = await sb.rpc('playcaller_get_plays', { pbid: playbookId })
  if (error) throw error
  const remote = (data ?? []) as Play[]
  if (!remote.length) {
    // brand-new playbook: seed the server with whatever is local
    schedulePush()
    return
  }
  const local = useStore.getState().plays
  if (JSON.stringify(remote) === JSON.stringify(local)) return
  applyingRemote = true
  try {
    const currentId = useStore.getState().currentId
    useStore.setState({
      plays: remote,
      currentId: remote.find((p) => p.id === currentId) ? currentId : (remote[0]?.id ?? ''),
    })
  } finally {
    applyingRemote = false
  }
}

async function push(): Promise<void> {
  if (!sb) return
  pushing = true
  setStatus('syncing')
  try {
    const plays = useStore.getState().plays
    const { error } = await sb.rpc('playcaller_replace_playbook', { pbid: playbookId, plays })
    if (error) throw error
    channel?.send({ type: 'broadcast', event: 'sync', payload: { from: clientId } })
    setStatus('synced')
  } catch {
    setStatus('local')
  } finally {
    pushing = false
  }
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void push()
  }, 1200)
}

export function initSync(): void {
  try {
    playbookId = resolvePlaybookId()
    sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  } catch {
    return // stays local-only
  }

  pull()
    .then(() => setStatus('synced'))
    .catch(() => setStatus('local'))

  // push after local edits (skip changes we just applied from the server)
  let lastPlays = useStore.getState().plays
  useStore.subscribe((state) => {
    if (state.plays !== lastPlays) {
      lastPlays = state.plays
      if (!applyingRemote) schedulePush()
    }
  })

  // realtime: other devices and the MCP server ping this channel after writes
  channel = sb
    .channel(`pb:${playbookId}`)
    .on('broadcast', { event: 'sync' }, ({ payload }) => {
      if (payload?.from !== clientId) pull().catch(() => undefined)
    })
    .subscribe()

  // slow poll as a safety net for missed broadcasts
  setInterval(() => {
    if (status !== 'local') pull().catch(() => undefined)
  }, 30_000)
}
