import { useEffect, useState, useRef } from 'react'
import { Plus, Minus, Trash2, Pencil } from 'lucide-react'
import type { CartItem as CartItemType } from '../types'
import { formatMoney } from '../utils'

const INTEGER_UNITS = ['piece', 'box', 'cup', 'packet', 'bottle']

interface Props {
  item: CartItemType
  onChangeQty: (id: string, delta: number) => void
  onSetQty: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onUpdatePrice: (id: string, price: number) => void
}

export function CartItemRow({ item, onChangeQty, onSetQty, onRemove, onUpdatePrice }: Props) {
  const [editing, setEditing] = useState(false)
  const [priceVal, setPriceVal] = useState('')
  const [qtyInput, setQtyInput] = useState(String(item.quantity))
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isIntegerUnit = INTEGER_UNITS.includes(item.unit || 'piece')

  useEffect(() => {
    setQtyInput(String(item.quantity))
  }, [item.quantity])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const startEdit = () => {
    setEditing(true)
    setPriceVal(String(item.salePrice))
  }

  const commitEdit = () => {
    const v = parseFloat(priceVal)
    if (!isNaN(v) && v >= 0) onUpdatePrice(item.productId, v)
    setEditing(false)
  }

  const handleQtyChange = (val: string) => {
    // Prevent typing decimal point for integer units
    if (isIntegerUnit && val.includes('.')) {
      return
    }

    setQtyInput(val)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      const v = parseFloat(val)
      if (!isNaN(v) && v >= 0) {
        onSetQty(item.productId, v)
      } else {
        setQtyInput(String(item.quantity))
      }
    }, 500)
  }

  const lineTotal = item.salePrice * item.quantity
  const hasPriceOverride = item.salePrice !== item.unitPrice
  
  // Determine step based on unit
  const step = isIntegerUnit ? 1 : 0.5

  return (
    <div className="flex items-center justify-between gap-2 py-2 px-1 border-b border-slate-100 dark:border-slate-700/50">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
            {item.productName}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            / {item.unit}
          </span>
        </div>

        {/* Price — click to edit */}
        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-slate-400">$</span>
            <input
              type="number"
              value={priceVal}
              onChange={(e) => setPriceVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              autoFocus
              className="w-20 px-1.5 py-0.5 text-xs border border-amber-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-400">× {item.quantity}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:text-amber-600" onClick={startEdit}>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatMoney(item.salePrice)}
            </span>
            {hasPriceOverride && (
              <span className="text-[10px] line-through text-slate-400 dark:text-slate-500">
                {formatMoney(item.unitPrice)}
              </span>
            )}
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs text-slate-400">× {item.quantity}</span>
          </div>
        )}
      </div>

      {/* Line total */}
      <div className="w-20 text-right text-sm font-semibold text-slate-900 dark:text-white">
        {formatMoney(lineTotal)}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChangeQty(item.productId, -step)}
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        
        {/* Debounced Quantity Input */}
        <input
          type="number"
          step={isIntegerUnit ? "1" : "any"}
          value={qtyInput}
          onChange={(e) => handleQtyChange(e.target.value)}
          className="w-16 text-center text-sm font-medium border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
        />
        
        <button
          onClick={() => onChangeQty(item.productId, step)}
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={() => onRemove(item.productId)}
          className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 ml-0.5 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
