import React, { useRef, useState } from 'react'
import { Users, Clock } from 'lucide-react'
import { RestaurantTableData } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'
import { formatOccupancyDuration } from '../utils'

interface Props {
  tables: RestaurantTableData[]
  onSelectTable: (table: RestaurantTableData) => void
  onUpdatePosition: (id: string, posX: number, posY: number) => void
}

export const FloorCanvas: React.FC<Props> = ({ tables, onSelectTable, onUpdatePosition }) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent, table: RestaurantTableData) => {
    e.stopPropagation()
    setDraggingId(table.id)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(canvasRect.width - 120, e.clientX - canvasRect.left - dragOffset.x))
    const newY = Math.max(0, Math.min(canvasRect.height - 120, e.clientY - canvasRect.top - dragOffset.y))

    // Snap to 10px grid
    const snapX = Math.round(newX / 10) * 10
    const snapY = Math.round(newY / 10) * 10

    onUpdatePosition(draggingId, snapX, snapY)
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-[650px] bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(150, 150, 150, 0.15) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="absolute top-3 left-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pointer-events-none">
        Interactive Floor Map • Drag tables to arrange
      </div>

      {tables.map((t) => {
        const cfg = TABLE_STATUS_CONFIG[t.status] || TABLE_STATUS_CONFIG.available
        const openOrder = t.orders?.[0]
        const isCircle = t.shape === 'circle'
        const isRect = t.shape === 'rectangle'

        return (
          <div
            key={t.id}
            onMouseDown={(e) => handleMouseDown(e, t)}
            onClick={() => onSelectTable(t)}
            style={{
              left: `${t.posX || 20}px`,
              top: `${t.posY || 20}px`,
              width: isRect ? '160px' : '110px',
              height: isRect ? '95px' : '110px'
            }}
            className={`absolute cursor-move transition-shadow duration-150 flex flex-col items-center justify-center p-2 border-2 shadow-md hover:shadow-xl ${
              cfg.bg
            } ${cfg.border} ${isCircle ? 'rounded-full' : isRect ? 'rounded-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-1 text-xs font-black text-slate-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              T-{t.number}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <Users className="w-3 h-3" /> {t.capacity}p
            </div>

            {openOrder && (
              <div className="mt-1 px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-[10px] font-bold text-amber-600 flex items-center gap-1 shadow-2xs">
                <Clock className="w-2.5 h-2.5" />
                {formatOccupancyDuration(openOrder.openedAt)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}