// src/pages/tables/components/FloorCanvas.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Users, Clock, DollarSign, Move } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { RestaurantTableData, TableStatus } from '../types'
import { TABLE_STATUS_CONFIG, TILE_SIZE, FLOOR_MIN_WIDTH, FLOOR_HEIGHT } from '../constants'
import { formatOccupancyDuration } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  tables: RestaurantTableData[]
  onSelectTable: (table: RestaurantTableData) => void
  onUpdatePosition: (id: string, posX: number, posY: number) => Promise<boolean>
}

const EDGE_PADDING = 8
const SNAP_GRID = 10
/**
 * Pointer travel below this many pixels counts as a tap, not a drag. Without it
 * a plain click on a tile would also commit a position, so the tile both moved
 * and opened — the reason the floor felt like it "opens whenever you touch it".
 */
const DRAG_THRESHOLD = 5

interface DragState {
  id: string
  pointerId: number
  shape: RestaurantTableData['shape']
  startClientX: number
  startClientY: number
  startLeft: number
  startTop: number
  left: number
  top: number
  moved: boolean
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const snap = (value: number): number => Math.round(value / SNAP_GRID) * SNAP_GRID

/** Where a tile's stored coordinates put it, defaulting the same way the render does. */
const originOf = (table: RestaurantTableData): { left: number; top: number } => ({
  left: table.posX || 20,
  top: table.posY || 20
})

export const FloorCanvas: React.FC<Props> = ({ tables, onSelectTable, onUpdatePosition }) => {
  const { t } = useLanguage()
  const canvasRef = useRef<HTMLDivElement>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const flashSaved = useCallback((id: string) => {
    setSavedId(id)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedId(null), 1600)
  }, [])

  const boundsFor = useCallback((shape: RestaurantTableData['shape']) => {
    const size = TILE_SIZE[shape]
    const canvas = canvasRef.current
    return {
      maxLeft: canvas
        ? Math.max(EDGE_PADDING, canvas.clientWidth - size.width - EDGE_PADDING)
        : Number.MAX_SAFE_INTEGER,
      maxTop: canvas
        ? Math.max(EDGE_PADDING, canvas.clientHeight - size.height - EDGE_PADDING)
        : Number.MAX_SAFE_INTEGER
    }
  }, [])

  /** Single place a position reaches the database, so feedback stays consistent. */
  const commit = useCallback(
    async (id: string, left: number, top: number) => {
      const ok = await onUpdatePosition(id, left, top)
      if (ok) {
        sounds.playSuccess()
        flashSaved(id)
      } else {
        sounds.playError()
      }
      return ok
    },
    [onUpdatePosition, flashSaved]
  )

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    table: RestaurantTableData
  ): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    sounds.playBump()
    const { left, top } = originOf(table)
    setDrag({
      id: table.id,
      pointerId: e.pointerId,
      shape: table.shape,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: left,
      startTop: top,
      left,
      top,
      moved: false
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startClientX
    const dy = e.clientY - drag.startClientY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    e.preventDefault()
    const { maxLeft, maxTop } = boundsFor(drag.shape)
    setDrag({
      ...drag,
      moved: true,
      left: snap(clamp(drag.startLeft + dx, EDGE_PADDING, maxLeft)),
      top: snap(clamp(drag.startTop + dy, EDGE_PADDING, maxTop))
    })
  }

  const handlePointerUp = async (
    e: React.PointerEvent<HTMLDivElement>,
    table: RestaurantTableData
  ): Promise<void> => {
    if (!drag || drag.pointerId !== e.pointerId) return
    e.stopPropagation()
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const finished = drag
    setDrag(null)

    if (!finished.moved) {
      // A tap inspects the table — the deliberate jump into the POS lives behind
      // the drawer's own button so a stray tap can never change a running check.
      sounds.playBump()
      onSelectTable(table)
      return
    }
    await commit(finished.id, finished.left, finished.top)
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag || drag.pointerId !== e.pointerId) return
    setDrag(null)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    table: RestaurantTableData
  ): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectTable(table)
      return
    }
    const step = e.shiftKey ? 1 : SNAP_GRID
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    }
    const move = delta[e.key]
    if (!move) return
    e.preventDefault()
    const { left, top } = originOf(table)
    const { maxLeft, maxTop } = boundsFor(table.shape)
    void commit(
      table.id,
      clamp(left + move[0], EDGE_PADDING, maxLeft),
      clamp(top + move[1], EDGE_PADDING, maxTop)
    )
  }

  const statuses: TableStatus[] = ['available', 'occupied', 'billing', 'reserved', 'cleaning']

  return (
    <div className="space-y-2">
      <div className="w-full overflow-x-auto rounded-3xl">
        <div
          ref={canvasRef}
          style={{
            minWidth: `${FLOOR_MIN_WIDTH}px`,
            height: `${FLOOR_HEIGHT}px`,
            backgroundImage:
              'radial-gradient(circle, rgba(150, 150, 150, 0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
          className="relative bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800"
        >
          <div className="absolute top-3 start-4 z-10 flex items-center gap-1.5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pointer-events-none">
            <Move className="w-3 h-3" />
            <span>{t('restFloorCanvasHint')}</span>
          </div>

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-400">{t('restFloorNoTables')}</span>
            </div>
          )}

          {tables.map((table) => {
            const cfg = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available
            const openOrder = table.orders?.[0]
            const isCircle = table.shape === 'circle'
            const size = TILE_SIZE[table.shape] || TILE_SIZE.square
            const statusLabel = t(cfg.labelKey)
            const isDragging = drag?.id === table.id
            const origin = originOf(table)

            return (
              <div
                key={table.id}
                role="button"
                tabIndex={0}
                aria-label={t('restFloorTileAria', {
                  number: table.number,
                  status: statusLabel
                })}
                onPointerDown={(e) => handlePointerDown(e, table)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => void handlePointerUp(e, table)}
                onPointerCancel={handlePointerCancel}
                onKeyDown={(e) => handleKeyDown(e, table)}
                style={{
                  left: `${isDragging ? drag.left : origin.left}px`,
                  top: `${isDragging ? drag.top : origin.top}px`,
                  width: `${size.width}px`,
                  height: `${size.height}px`,
                  touchAction: 'none'
                }}
                className={`absolute flex flex-col items-center justify-between p-2.5 border-2 shadow-md cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isDragging ? 'z-20 shadow-2xl scale-[1.04] cursor-grabbing' : 'z-10'
                } ${isDragging ? 'ring-2 ring-amber-400' : ''} ${cfg.bg} ${cfg.border} ${
                  isCircle ? 'rounded-full' : 'rounded-3xl'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span>#{table.number}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>
                    {openOrder ? `${openOrder.guestCount}/${table.capacity}` : `${table.capacity}p`}
                  </span>
                </div>

                {openOrder ? (
                  <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-2xs border border-slate-100 dark:border-slate-800">
                    <DollarSign className="w-2.5 h-2.5" />
                    <span>{openOrder.total.toFixed(2)}</span>
                    <Clock className="w-2.5 h-2.5 ms-1 text-amber-500" />
                    <span>{formatOccupancyDuration(openOrder.openedAt)}</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {statusLabel}
                  </span>
                )}

                {savedId === table.id && (
                  <span className="absolute -bottom-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow whitespace-nowrap">
                    {t('restFloorSaved')}
                  </span>
                )}
              </div>
            )
          })}

          <div className="absolute bottom-2 end-3 z-10 flex flex-wrap items-center gap-3 pointer-events-none">
            {statuses.map((status) => {
              const cfg = TABLE_STATUS_CONFIG[status]
              return (
                <span
                  key={status}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500"
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {t(cfg.labelKey)}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
