import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  Annotation,
  DEFAULT_DISPLAY,
  DisplaySettings,
  FIELD,
  Play,
  PlayerShape,
  Point,
  Route,
  RouteKind,
  ROUTE_COLORS,
  Team,
  Tool,
  uid,
} from './types'
import { findFormation } from './data/formations'
import { materializeQuickRoute, QuickRoute } from './data/routeTree'
import { seedPlays } from './data/seed'
import { redepth, respot, spotFromMid } from './utils/field'

interface HistoryEntry {
  playId: string
  snapshot: Play
}

interface Store {
  plays: Play[]
  currentId: string
  tool: Tool
  routeColor: string
  selectedPlayerId: string | null
  selectedRouteId: string | null
  selectedAnnotationId: string | null
  drawing: { playerId: string; points: Point[] } | null
  past: HistoryEntry[]
  future: HistoryEntry[]
  printMode: boolean
  printSize: 'large' | 'small'
  display: DisplaySettings

  setTool: (t: Tool) => void
  setRouteColor: (c: string) => void
  selectPlay: (id: string) => void
  selectPlayer: (id: string | null) => void
  selectRoute: (id: string | null) => void
  selectAnnotation: (id: string | null) => void
  newPlay: (offFormation?: string, defFormation?: string) => void
  duplicatePlay: (id: string) => void
  deletePlay: (id: string) => void
  toggleStar: (id: string) => void
  updatePlay: (patch: Partial<Play>) => void
  applyFormation: (team: Team, name: string) => void
  setBallSpot: (x: number) => void
  setFieldPosition: (yardsToGoal?: number) => void
  clearTeam: (team: Team) => void
  flipPlay: () => void
  movePlayer: (id: string, dx: number, dy: number) => void
  moveVertex: (routeId: string, index: number, p: Point) => void
  relabelPlayer: (id: string, label: string) => void
  setPlayerShape: (id: string, shape: PlayerShape) => void
  setPlayerFill: (id: string, fill?: string) => void
  setDisplay: (patch: Partial<DisplaySettings>) => void
  startRoute: (playerId: string) => void
  addDrawPoint: (p: Point) => void
  finishRoute: () => void
  cancelRoute: () => void
  applyQuickRoute: (playerId: string, template: QuickRoute) => void
  clearPlayerRoute: (playerId: string) => void
  setRouteKind: (routeId: string, kind: RouteKind) => void
  recolorRoute: (routeId: string, color: string) => void
  setRouteRead: (routeId: string, read?: string) => void
  addAnnotation: (p: Point) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  moveAnnotation: (id: string, dx: number, dy: number) => void
  deleteSelection: () => void
  commit: () => void
  undo: () => void
  redo: () => void
  setPrintMode: (on: boolean) => void
  setPrintSize: (s: 'large' | 'small') => void
  importPlays: (plays: Play[]) => void
}

/** Place freshly-built formation players (defined at midfield) at a ball spot. */
function spotPlayers<T extends { x: number }>(items: T[], ballX: number): T[] {
  if (ballX === FIELD.BALL_X) return items
  return items.map((i) => ({ ...i, x: spotFromMid(i.x, ballX) }))
}

function makePlay(offFormation = 'Gun Spread (2x2)', defFormation = '', ballX = FIELD.BALL_X): Play {
  const off = findFormation('O', offFormation)
  const def = defFormation ? findFormation('D', defFormation) : undefined
  return {
    id: uid(),
    name: 'New Play',
    ballX,
    offFormation: off ? offFormation : '',
    defFormation: def ? defFormation : '',
    tags: [],
    notes: '',
    players: spotPlayers([...(off ? off.players() : []), ...(def ? def.players() : [])], ballX),
    routes: [],
    updatedAt: Date.now(),
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Immutably update the current play (also bumps updatedAt). */
      const patchCurrent = (fn: (p: Play) => Play) =>
        set((s) => ({
          plays: s.plays.map((p) => (p.id === s.currentId ? { ...fn(p), updatedAt: Date.now() } : p)),
        }))

      const current = () => {
        const s = get()
        return s.plays.find((p) => p.id === s.currentId)
      }

      return {
        plays: seedPlays(),
        currentId: '',
        tool: 'select' as Tool,
        routeColor: ROUTE_COLORS[0],
        selectedPlayerId: null,
        selectedRouteId: null,
        selectedAnnotationId: null,
        drawing: null,
        past: [],
        future: [],
        printMode: false,
        printSize: 'large' as const,
        display: DEFAULT_DISPLAY,

        setTool: (t) => set({ tool: t, drawing: null }),
        setRouteColor: (c) => {
          const s = get()
          set({ routeColor: c })
          if (s.selectedRouteId) s.recolorRoute(s.selectedRouteId, c)
        },

        selectPlay: (id) =>
          set({
            currentId: id,
            selectedPlayerId: null,
            selectedRouteId: null,
            selectedAnnotationId: null,
            drawing: null,
          }),
        selectPlayer: (id) => set({ selectedPlayerId: id, selectedRouteId: null, selectedAnnotationId: null }),
        selectRoute: (id) => set({ selectedRouteId: id, selectedPlayerId: null, selectedAnnotationId: null }),
        selectAnnotation: (id) => set({ selectedAnnotationId: id, selectedPlayerId: null, selectedRouteId: null }),

        newPlay: (offFormation, defFormation) => {
          const play = makePlay(offFormation, defFormation)
          set((s) => ({ plays: [play, ...s.plays], currentId: play.id, selectedPlayerId: null, selectedRouteId: null }))
        },

        duplicatePlay: (id) => {
          const src = get().plays.find((p) => p.id === id)
          if (!src) return
          const copy = clone(src)
          copy.id = uid()
          copy.name = `${src.name} (copy)`
          copy.updatedAt = Date.now()
          // fresh ids so the copy is fully independent
          const idMap = new Map<string, string>()
          copy.players = copy.players.map((pl) => {
            const nid = uid()
            idMap.set(pl.id, nid)
            return { ...pl, id: nid }
          })
          copy.routes = copy.routes.map((r) => ({
            ...r,
            id: uid(),
            playerId: idMap.get(r.playerId) ?? r.playerId,
          }))
          set((s) => ({ plays: [copy, ...s.plays], currentId: copy.id }))
        },

        deletePlay: (id) =>
          set((s) => {
            const plays = s.plays.filter((p) => p.id !== id)
            const currentId = s.currentId === id ? (plays[0]?.id ?? '') : s.currentId
            return { plays, currentId, past: s.past.filter((h) => h.playId !== id), future: [] }
          }),

        toggleStar: (id) =>
          set((st) => ({
            plays: st.plays.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)),
          })),

        updatePlay: (patch) => patchCurrent((p) => ({ ...p, ...patch })),

        applyFormation: (team, name) => {
          const def = findFormation(team, name)
          if (!def) return
          get().commit()
          patchCurrent((p) => {
            const keep = p.players.filter((pl) => pl.team !== team)
            const removed = new Set(p.players.filter((pl) => pl.team === team).map((pl) => pl.id))
            return {
              ...p,
              [team === 'O' ? 'offFormation' : 'defFormation']: name,
              players: [...keep, ...spotPlayers(def.players(), p.ballX ?? FIELD.BALL_X)],
              routes: p.routes.filter((r) => !removed.has(r.playerId)),
            }
          })
          set({ selectedPlayerId: null, selectedRouteId: null })
        },

        clearTeam: (team) => {
          get().commit()
          patchCurrent((p) => {
            const removed = new Set(p.players.filter((pl) => pl.team === team).map((pl) => pl.id))
            return {
              ...p,
              [team === 'O' ? 'offFormation' : 'defFormation']: '',
              players: p.players.filter((pl) => pl.team !== team),
              routes: p.routes.filter((r) => !removed.has(r.playerId)),
            }
          })
          set({ selectedPlayerId: null, selectedRouteId: null })
        },

        setBallSpot: (x) => {
          const play = current()
          if (!play) return
          const from = play.ballX ?? FIELD.BALL_X
          if (x === from) return
          get().commit()
          patchCurrent((p) => ({
            ...p,
            ballX: x,
            players: p.players.map((pl) => ({ ...pl, x: respot(pl.x, from, x) })),
            routes: p.routes.map((r) => ({
              ...r,
              points: r.points.map((pt) => ({ x: respot(pt.x, from, x), y: pt.y })),
            })),
            annotations: (p.annotations ?? []).map((a) => ({ ...a, x: respot(a.x, from, x) })),
          }))
        },

        /**
         * Move the ball down the field. Inside the 26 the end zone comes into
         * view, and the play has to fit what is left in front of it: everything
         * downfield of the LOS — routes and defenders alike — compresses so the
         * deepest point lands on the back line rather than off the field.
         */
        setFieldPosition: (yardsToGoal) => {
          const play = current()
          if (!play || play.yardsToGoal === yardsToGoal) return
          get().commit()
          patchCurrent((p) => ({
            ...p,
            yardsToGoal,
            players: p.players.map((pl) => ({ ...pl, y: redepth(pl.y, p.yardsToGoal, yardsToGoal) })),
            routes: p.routes.map((r) => ({
              ...r,
              points: r.points.map((pt) => ({ x: pt.x, y: redepth(pt.y, p.yardsToGoal, yardsToGoal) })),
            })),
            annotations: (p.annotations ?? []).map((a) => ({
              ...a,
              y: redepth(a.y, p.yardsToGoal, yardsToGoal),
            })),
          }))
        },

        flipPlay: () => {
          get().commit()
          // mirror the whole play, ball spot included
          patchCurrent((p) => ({
            ...p,
            ballX: FIELD.W - (p.ballX ?? FIELD.BALL_X),
            players: p.players.map((pl) => ({ ...pl, x: FIELD.W - pl.x })),
            routes: p.routes.map((r) => ({
              ...r,
              points: r.points.map((pt) => ({ x: FIELD.W - pt.x, y: pt.y })),
            })),
            annotations: (p.annotations ?? []).map((a) => ({ ...a, x: FIELD.W - a.x })),
          }))
        },

        movePlayer: (id, dx, dy) =>
          patchCurrent((p) => ({
            ...p,
            players: p.players.map((pl) => (pl.id === id ? { ...pl, x: pl.x + dx, y: pl.y + dy } : pl)),
            routes: p.routes.map((r) =>
              r.playerId === id
                ? { ...r, points: r.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) }
                : r,
            ),
          })),

        moveVertex: (routeId, index, pt) =>
          patchCurrent((p) => ({
            ...p,
            routes: p.routes.map((r) =>
              r.id === routeId
                ? { ...r, points: r.points.map((q, i) => (i === index ? pt : q)) }
                : r,
            ),
          })),

        relabelPlayer: (id, label) =>
          patchCurrent((p) => ({
            ...p,
            players: p.players.map((pl) => (pl.id === id ? { ...pl, label } : pl)),
          })),

        setPlayerShape: (id, shape) => {
          get().commit()
          patchCurrent((p) => ({
            ...p,
            players: p.players.map((pl) => (pl.id === id ? { ...pl, shape } : pl)),
          }))
        },

        setPlayerFill: (id, fill) => {
          get().commit()
          patchCurrent((p) => ({
            ...p,
            players: p.players.map((pl) => {
              if (pl.id !== id) return pl
              const next = { ...pl, fill }
              if (!fill) delete next.fill
              return next
            }),
          }))
        },

        setDisplay: (patch) => set((st) => ({ display: { ...st.display, ...patch } })),

        startRoute: (playerId) => {
          const play = current()
          const player = play?.players.find((pl) => pl.id === playerId)
          if (!player) return
          set({
            drawing: { playerId, points: [{ x: player.x, y: player.y }] },
            selectedPlayerId: playerId,
            selectedRouteId: null,
          })
        },

        addDrawPoint: (p) =>
          set((s) => (s.drawing ? { drawing: { ...s.drawing, points: [...s.drawing.points, p] } } : {})),

        finishRoute: () => {
          const s = get()
          if (!s.drawing || s.drawing.points.length < 2) {
            set({ drawing: null })
            return
          }
          const kind: RouteKind = s.tool === 'block' ? 'block' : s.tool === 'motion' ? 'motion' : 'route'
          const route: Route = {
            id: uid(),
            playerId: s.drawing.playerId,
            kind,
            color: s.routeColor,
            points: s.drawing.points,
          }
          s.commit()
          patchCurrent((p) => ({
            ...p,
            // one assignment of each kind per player keeps things tidy; new same-kind route replaces
            routes: [...p.routes.filter((r) => !(r.playerId === route.playerId && r.kind === kind)), route],
          }))
          set({ drawing: null, selectedRouteId: route.id, selectedPlayerId: null })
        },

        cancelRoute: () => set({ drawing: null }),

        applyQuickRoute: (playerId, template) => {
          const play = current()
          const player = play?.players.find((pl) => pl.id === playerId)
          if (!player) return
          get().commit()
          const route: Route = {
            id: uid(),
            playerId,
            kind: template.kind,
            color: get().routeColor,
            points: materializeQuickRoute(player, template, play?.ballX ?? FIELD.BALL_X, play?.yardsToGoal),
          }
          patchCurrent((p) => ({
            ...p,
            routes: [...p.routes.filter((r) => !(r.playerId === playerId && r.kind === template.kind)), route],
          }))
        },

        clearPlayerRoute: (playerId) => {
          get().commit()
          patchCurrent((p) => ({ ...p, routes: p.routes.filter((r) => r.playerId !== playerId) }))
        },

        setRouteKind: (routeId, kind) => {
          get().commit()
          patchCurrent((p) => ({
            ...p,
            routes: p.routes.map((r) => (r.id === routeId ? { ...r, kind } : r)),
          }))
        },

        recolorRoute: (routeId, color) =>
          patchCurrent((p) => ({
            ...p,
            routes: p.routes.map((r) => (r.id === routeId ? { ...r, color } : r)),
          })),

        setRouteRead: (routeId, read) => {
          get().commit()
          patchCurrent((p) => ({
            ...p,
            routes: p.routes.map((r) => {
              if (r.id !== routeId) return r
              const next = { ...r, read }
              if (!read) delete next.read
              return next
            }),
          }))
        },

        addAnnotation: (pt) => {
          get().commit()
          const note: Annotation = { id: uid(), x: pt.x, y: pt.y, text: '', color: '#0f172a' }
          patchCurrent((p) => ({ ...p, annotations: [...(p.annotations ?? []), note] }))
          set({ selectedAnnotationId: note.id, selectedPlayerId: null, selectedRouteId: null, tool: 'select' })
        },

        updateAnnotation: (id, patch) =>
          patchCurrent((p) => ({
            ...p,
            annotations: (p.annotations ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
          })),

        moveAnnotation: (id, dx, dy) =>
          patchCurrent((p) => ({
            ...p,
            annotations: (p.annotations ?? []).map((a) =>
              a.id === id ? { ...a, x: a.x + dx, y: a.y + dy } : a,
            ),
          })),

        deleteSelection: () => {
          const s = get()
          if (s.selectedAnnotationId) {
            s.commit()
            patchCurrent((p) => ({
              ...p,
              annotations: (p.annotations ?? []).filter((a) => a.id !== s.selectedAnnotationId),
            }))
            set({ selectedAnnotationId: null })
          } else if (s.selectedRouteId) {
            s.commit()
            patchCurrent((p) => ({ ...p, routes: p.routes.filter((r) => r.id !== s.selectedRouteId) }))
            set({ selectedRouteId: null })
          } else if (s.selectedPlayerId) {
            s.commit()
            patchCurrent((p) => ({
              ...p,
              players: p.players.filter((pl) => pl.id !== s.selectedPlayerId),
              routes: p.routes.filter((r) => r.playerId !== s.selectedPlayerId),
            }))
            set({ selectedPlayerId: null })
          }
        },

        commit: () => {
          const play = current()
          if (!play) return
          set((s) => ({
            past: [...s.past.slice(-59), { playId: play.id, snapshot: clone(play) }],
            future: [],
          }))
        },

        undo: () => {
          const s = get()
          const entry = s.past[s.past.length - 1]
          if (!entry) return
          const live = s.plays.find((p) => p.id === entry.playId)
          set({
            past: s.past.slice(0, -1),
            future: live ? [...s.future, { playId: live.id, snapshot: clone(live) }] : s.future,
            plays: s.plays.map((p) => (p.id === entry.playId ? entry.snapshot : p)),
            currentId: entry.playId,
            selectedPlayerId: null,
            selectedRouteId: null,
            selectedAnnotationId: null,
            drawing: null,
          })
        },

        redo: () => {
          const s = get()
          const entry = s.future[s.future.length - 1]
          if (!entry) return
          const live = s.plays.find((p) => p.id === entry.playId)
          set({
            future: s.future.slice(0, -1),
            past: live ? [...s.past, { playId: live.id, snapshot: clone(live) }] : s.past,
            plays: s.plays.map((p) => (p.id === entry.playId ? entry.snapshot : p)),
            currentId: entry.playId,
            selectedPlayerId: null,
            selectedRouteId: null,
            selectedAnnotationId: null,
          })
        },

        setPrintMode: (on) => set({ printMode: on }),
        setPrintSize: (sz) => set({ printSize: sz }),

        importPlays: (plays) =>
          set({
            plays,
            currentId: plays[0]?.id ?? '',
            past: [],
            future: [],
            selectedPlayerId: null,
            selectedRouteId: null,
            selectedAnnotationId: null,
          }),
      }
    },
    {
      name: 'playcaller-v1',
      // localStorage can throw in sandboxed/embedded contexts — fall back to memory
      storage: createJSONStorage(() => {
        try {
          // carry over playbooks saved under the app's previous name
          const legacy = window.localStorage.getItem('rally-playbook-v1')
          if (legacy && !window.localStorage.getItem('playcaller-v1')) {
            window.localStorage.setItem('playcaller-v1', legacy)
          }
          return window.localStorage
        } catch {
          const mem = new Map<string, string>()
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          }
        }
      }),
      partialize: (s) => ({ plays: s.plays, currentId: s.currentId, routeColor: s.routeColor, display: s.display }),
    },
  ),
)

/**
 * Ensure currentId is valid after hydration / first run. A brand-new store
 * already starts with the sample plays, so an empty playbook here means the
 * coach deleted the last one — give them a blank play, not the samples back.
 */
export function ensureCurrent(): void {
  const s = useStore.getState()
  if (!s.plays.length) {
    useStore.getState().newPlay('Gun Spread (2x2)')
  }
  const st = useStore.getState()
  if (!st.plays.find((p) => p.id === st.currentId)) {
    useStore.setState({ currentId: st.plays[0].id })
  }
}
