import React from 'react'
import { Trash2, Plus, Minus, Layers } from 'lucide-react'
import { CartLine } from '../types'
import { money } from '../../components/_shared'

interface PosCartItemRowProps {
  index: number
  line: CartLine
  onQtyChange: (index: number, qty: number) => void
  onPriceChange: (index: number, price: number) => void
  onToggleUnit: (index: number) => void
  onRemove: (index: number) => void
}

export const PosCartItemRow: React.FC<PosCartItemRowProps> = ({
  index,
  line,
  onQtyChange,
  onToggleUnit,
  onRemove,
}) => {
  const lineTotal = line.quantity * line.unitPrice

  return (
    <div className="group relative flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800 text-xs">
      {/* Index and Name */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{line.name}</span>
          {line.ratio ? (
            <button
              onClick={() => onToggleUnit(index)}
              title="Click to toggle base/sub unit"
              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 hover:bg-violet-100 border border-violet-200/50 dark:border-violet-800/50"
            >
              <Layers size={9} />
              {line.saleUnit === 'sub' ? line.subUnit || 'strip' : line.unit}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">({line.unit})</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Stock: {line.stockBase} · Unit: ${money(line.unitPrice)}
        </div>
      </div>

      {/* High-density inline quantity stepper */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/80 dark:border-slate-700">
        <button
          onClick={() => onQtyChange(index, line.quantity - 1)}
          className="h-6 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <Minus size={10} />
        </button>
        <input
          type="number"
          min="1"
          value={line.quantity}
          onChange={e => onQtyChange(index, parseInt(e.target.value) || 1)}
          className="w-8 text-center bg-transparent font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => onQtyChange(index, line.quantity + 1)}
          className="h-6 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Row total & remove button */}
      <div className="w-16 text-right font-bold text-slate-800 dark:text-slate-200">
        ${money(lineTotal)}
      </div>

      <button
        onClick={() => onRemove(index)}
        className="text-slate-300 hover:text-red-500 transition-colors p-1"
        title="Remove"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}