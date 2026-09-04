import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { FIELD, Play, Point } from '../types'
import { clampToField, roundedPath, snap45 } from '../utils/geometry'
import { FieldBackground, playerNumbers, PlayerGlyph, PLAYER_R, RouteGlyph } from './PlayGraphics'

type Drag =
  | { type: 'player'; id: string; last: Point }
  | { type: 'vertex'; routeId: string; index: number }
  | null

export function Field({ play }: { play: Play }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<Drag>(null)
  const movedRef = useRef(false)
  const [hover, setHover] = useState<Point | null>(null)

  const tool = useStore((s) => s.tool)
  const drawing = useStore((s) => s.drawing)
  const selectedPlayerId = useStore((s) => s.selectedPlayerId)
  const selectedRouteId = useStore((s) => s.selectedRouteId)
  const display = useStore((s) => s.display)
  const s = useStore.getState

  const toField = (e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = pt.matrixTransform(m.inverse())
    return clampToField({ x: p.x, y: p.y }, FIELD.W, FIELD.H)
  }

  const onBackgroundDown = (e: React.PointerEvent) => {
    const p = toField(e)
    if (drawing) {
      const last = drawing.points[drawing.points.length - 1]
      s().addDrawPoint(e.shiftKey ? snap45(last, p) : p)
      return
    }
    s().selectPlayer(null)
    s().selectRoute(null)
  }

  const onPlayerDown = (e: React.PointerEvent, playerId: string) => {
    e.stopPropagation()
    if (drawing) {
      // clicking any player while drawing finishes the current route
      s().finishRoute()
      return
    }
    if (tool === 'select') {
      s().selectPlayer(playerId)
      s().commit()
      dragRef.current = { type: 'player', id: playerId, last: toField(e) }
      movedRef.current = false
      svgRef.current?.setPointerCapture(e.pointerId)
    } else {
      s().startRoute(playerId)
    }
  }

  const onRouteDown = (e: React.PointerEvent, routeId: string) => {
    if (drawing) return // bubbles up to the background handler, which adds a point
    e.stopPropagation()
    if (tool === 'select') s().selectRoute(routeId)
  }

  const onVertexDown = (e: React.PointerEvent, routeId: string, index: number) => {
    e.stopPropagation()
    s().commit()
    dragRef.current = { type: 'vertex', routeId, index }
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  const onMove = (e: React.PointerEvent) => {
    let p = toField(e)
    if (drawing && e.shiftKey) {
      const last = drawing.points[drawing.points.length - 1]
      p = snap45(last, p)
    }
    setHover(p)
    const drag = dragRef.current
    if (!drag) return
    movedRef.current = true
    if (drag.type === 'player') {
      s().movePlayer(drag.id, p.x - drag.last.x, p.y - drag.last.y)
      drag.last = p
    } else {
      s().moveVertex(drag.routeId, drag.index, p)
    }
  }

  const onUp = () => {
    dragRef.current = null
  }

  const onDblClick = () => {
    if (drawing) s().finishRoute()
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const st = s()
      if (e.key === 'Escape') {
        if (st.drawing) st.cancelRoute()
        else {
          st.selectPlayer(null)
          st.selectRoute(null)
        }
      } else if (e.key === 'Enter' && st.drawing) {
        st.finishRoute()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        st.deleteSelection()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        st.redo()
      } else if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'v' || e.key === '1') st.setTool('select')
        else if (e.key === 'r' || e.key === '2') st.setTool('route')
        else if (e.key === 'b' || e.key === '3') st.setTool('block')
        else if (e.key === 'm' || e.key === '4') st.setTool('motion')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s])

  const numbers = playerNumbers(play.players)
  const selectedRoute = play.routes.find((r) => r.id === selectedRouteId)
  const drawingPlayer = drawing ? play.players.find((p) => p.id === drawing.playerId) : null

  // live preview of the in-progress route
  let previewPath = ''
  if (drawing && hover) {
    previewPath = roundedPath([...drawing.points, hover], 9, PLAYER_R + 2.5)
  }

  const cursor = drawing ? 'crosshair' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <svg
      ref={svgRef}
      id="play-svg"
      viewBox={`0 0 ${FIELD.W} ${FIELD.H}`}
      className="field-svg"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onDoubleClick={onDblClick}
    >
      <FieldBackground ballX={play.ballX} yardsToGoal={play.yardsToGoal} />

      {/* routes (fade others while drawing) */}
      {play.routes.map((r) => (
        <g key={r.id} onPointerDown={(e) => onRouteDown(e, r.id)} style={{ cursor: 'pointer' }}>
          {/* wide invisible hit area */}
          <path d={roundedPath(r.points, 9, PLAYER_R + 2.5)} fill="none" stroke="transparent" strokeWidth={14} />
          <RouteGlyph route={r} selected={r.id === selectedRouteId} faded={!!drawing && r.playerId !== drawing.playerId} />
        </g>
      ))}

      {/* in-progress route preview */}
      {drawing && previewPath && (
        <path d={previewPath} fill="none" stroke={useStore.getState().routeColor} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 6" opacity={0.85} />
      )}
      {drawing &&
        drawing.points.slice(1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.2} fill={useStore.getState().routeColor} />
        ))}

      {/* players */}
      {play.players.map((p) => (
        <g key={p.id} onPointerDown={(e) => onPlayerDown(e, p.id)} style={{ cursor: tool === 'select' ? 'grab' : 'crosshair' }}>
          <circle cx={p.x} cy={p.y} r={PLAYER_R + 4} fill="transparent" />
          <PlayerGlyph
            player={p}
            selected={p.id === selectedPlayerId || p.id === drawingPlayer?.id}
            display={display}
            number={numbers[p.id]}
          />
        </g>
      ))}

      {/* vertex handles for the selected route */}
      {selectedRoute &&
        !drawing &&
        selectedRoute.points.map((p, i) =>
          i === 0 ? null : (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#fff"
              stroke="#6965db"
              strokeWidth={2.2}
              style={{ cursor: 'move' }}
              onPointerDown={(e) => onVertexDown(e, selectedRoute.id, i)}
            />
          ),
        )}

      {/* drawing hint */}
      {drawing && (
        <text x={FIELD.W / 2} y={FIELD.H - 12} textAnchor="middle" fontSize={11} fill="#64748b">
          click to add points · double-click or Enter to finish · Esc to cancel · Shift = snap 45°
        </text>
      )}
    </svg>
  )
}
