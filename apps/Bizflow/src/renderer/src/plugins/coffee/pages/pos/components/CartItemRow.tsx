import { useState } from 'react'
import { Plus, Minus, Trash2, Pencil } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CartItem as CartItemType } from '../types'
import { formatMoney } from '../utils'

interface Props {
  item: CartItemType
  onChangeQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onUpdatePrice: (id: string, price: number) => void
}

export function CartItemRow({ item, onChangeQty, onRemove, onUpdatePrice }: Props) {
  const [editing, setEditing] = useState(false)
  const [priceVal, setPriceVal] = useState('')

  const startEdit = () => {
    setEditing(true)
    setPriceVal(String(item.salePrice))
  }

  const commitEdit = () => {
    const v = parseFloat(priceVal)
    if (!isNaN(v) && v >= 0) onUpdatePrice(item.productId, v)
    setEditing(false)
  }

  const lineTotal = item.salePrice * item.quantity
  const hasPriceOverride = item.salePrice !== item.unitPrice

  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {item.productName}
        </p>

        {/* Price — click to edit */}
        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              value={priceVal}
              onChange={e => setPriceVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              autoFocus
              className="w-20 px-1.5 py-0.5 text-xs border border-amber-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-400">× {item.quantity}</span>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 mt-0.5 group"
          >
            <span className={`text-xs font-medium ${hasPriceOverride ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {formatMoney(item.salePrice)}
            </span>
            {hasPriceOverride && (
              <span className="text-[10px] text-slate-400 line-through">
                {formatMoney(item.unitPrice)}
              </span>
            )}
            <span className="text-xs text-slate-400">× {item.quantity}</span>
            <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Line total */}
      <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
        {formatMoney(lineTotal)}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChangeQty(item.productId, -1)}
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-medium w-5 text-center tabular-nums">{item.quantity}</span>
        <button
          onClick={() => onChangeQty(item.productId, +1)}
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={() => onRemove(item.productId)}
          className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 ml-0.5 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
