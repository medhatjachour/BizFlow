// src/pages/tables/components/FloorCanvas.tsx
import React, { useRef, useState, useCallback } from 'react'
import { Users, Clock, DollarSign } from 'lucide-react'
import { RestaurantTableData } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'
import { formatOccupancyDuration } from '../utils'
import { sounds } from '../../utils/sound'

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
    sounds.playBump()
    setDraggingId(table.id)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const rawX = e.clientX - canvasRect.left - dragOffset.x
    const rawY = e.clientY - canvasRect.top - dragOffset.y

    const newX = Math.max(10, Math.min(canvasRect.width - 130, rawX))
    const newY = Math.max(10, Math.min(canvasRect.height - 130, rawY))

    // 10px snap grid
    const snapX = Math.round(newX / 10) * 10
    const snapY = Math.round(newY / 10) * 10

    onUpdatePosition(draggingId, snapX, snapY)
  }, [draggingId, dragOffset, onUpdatePosition])

  const handleMouseUp = () => {
    if (draggingId) {
      sounds.playBump()
      setDraggingId(null)
    }
  }

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-[660px] bg-slate-50 dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(150, 150, 150, 0.15) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="absolute top-3 left-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pointer-events-none">
        Floor Map • Drag tables to rearrange • Click to inspect check
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
            onClick={() => {
              sounds.playBump()
              onSelectTable(t)
            }}
            style={{
              left: `${t.posX || 20}px`,
              top: `${t.posY || 20}px`,
              width: isRect ? '160px' : '115px',
              height: isRect ? '100px' : '115px'
            }}
            className={`absolute cursor-move transition-shadow duration-150 flex flex-col items-center justify-between p-2.5 border-2 shadow-md hover:shadow-xl active:scale-95 ${
              cfg.bg
            } ${cfg.border} ${isCircle ? 'rounded-full' : 'rounded-3xl'}`}
          >
            {/* Top Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span>Table #{t.number}</span>
            </div>

            {/* Middle Status */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <Users className="w-3 h-3" />
              <span>{openOrder ? `${openOrder.guestCount}/${t.capacity}` : `${t.capacity}p`}</span>
            </div>

            {/* Active Bill Preview */}
            {openOrder ? (
              <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-2xs border border-slate-100 dark:border-slate-800">
                <DollarSign className="w-2.5 h-2.5" />
                <span>{openOrder.total.toFixed(2)}</span>
                <Clock className="w-2.5 h-2.5 ml-1 text-amber-500" />
                <span>{formatOccupancyDuration(openOrder.openedAt)}</span>
              </div>
            ) : (
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Available
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}