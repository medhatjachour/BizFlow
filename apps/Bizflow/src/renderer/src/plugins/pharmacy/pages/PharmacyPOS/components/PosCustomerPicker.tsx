import React, { useState, useEffect } from 'react'
import { User, UserPlus, X } from 'lucide-react'
import { PosCustomer } from '../types'
import { pharma, inputCls } from '../../components/_shared'

interface PosCustomerPickerProps {
  customer: PosCustomer | null
  onSelectCustomer: (cust: PosCustomer | null) => void
  onApplyDiscount?: (percent: number) => void
}

export const PosCustomerPicker: React.FC<PosCustomerPickerProps> = ({
  customer,
  onSelectCustomer,
  onApplyDiscount,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PosCustomer[]>([])

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      pharma()?.customers.searchLite(query).then((res: any) => setResults(res ?? [])).catch(() => {})
    }, 180)
    return () => clearTimeout(id)
  }, [query, open])

  if (customer) {
    return (
      <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 text-xs">
        <div className="flex items-center gap-1.5">
          <User size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.name}</span>
          {(customer.defaultDiscount ?? 0) > 0 && (
            <span className="bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200 font-bold px-1.5 py-0.2 rounded text-[10px]">
              {customer.defaultDiscount}% OFF
            </span>
          )}
        </div>
        <button
          onClick={() => onSelectCustomer(null)}
          className="text-slate-400 hover:text-red-500 p-0.5 rounded"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
      <div className="relative">
        <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="Walk-in Customer (click to link name/loyalty)"
          className={`${inputCls} pl-8 py-1 text-xs`}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 left-3 right-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => {
                onSelectCustomer(c)
                if (c.defaultDiscount && onApplyDiscount) onApplyDiscount(c.defaultDiscount)
                setOpen(false)
                setQuery('')
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
              <span className="text-slate-400 text-[10px]">
                {c.phone || ''} {c.defaultDiscount ? `• ${c.defaultDiscount}%` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}