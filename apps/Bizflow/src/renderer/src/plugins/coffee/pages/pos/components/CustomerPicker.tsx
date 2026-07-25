import { Search, UserPlus, X, MapPin, User } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CoffeeCustomer } from '../types'

interface Props {
  orderType: string
  search: string
  results: CoffeeCustomer[]
  showDrop: boolean
  selected: CoffeeCustomer | null
  customerName: string
  customerPhone: string
  customerAddress: string
  onSearch: (q: string) => void
  onFocus: () => void
  onBlur: () => void
  onSelect: (c: CoffeeCustomer) => void
  onClear: () => void
  onNewCustomer: () => void
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onAddressChange: (v: string) => void
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

export function CustomerPicker({
  orderType, search, results, showDrop, selected,
  customerName, customerPhone, customerAddress,
  onSearch, onFocus, onBlur, onSelect, onClear, onNewCustomer,
  onNameChange, onPhoneChange, onAddressChange,
}: Props) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      {/* Search + New */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('cfCheckoutFndCustomer')||"Find Customer"}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} // <-- ADDED
              onChange={(e) => onSearch(e.target.value)}
              onFocus={onFocus}
              onBlur={() => setTimeout(onBlur, 150)}
              placeholder="Search by name, phone..."
              className={inputCls + ' pl-9'}
            />
            {showDrop && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                {results.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => onSelect(c)}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {c.phone  || 'No contact info'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onNewCustomer}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Selected customer chip */}
        {selected && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
              <User className="w-4 h-4" />
              <span className="font-medium">{selected.name}</span>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t('cfCheckoutCustomerNM')||"Name"}
          </label>
          <input
            value={customerName} // <-- ADDED
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t('cfCheckoutCustomerPH')||"Phone"}
          </label>
          <input
            value={customerPhone} // <-- ADDED
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="01x..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Delivery address */}
      {orderType === 'delivery' && (
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t('cfCheckoutCustomerADDR')||"Delivery Address"}
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              value={customerAddress} // <-- ADDED
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Street, area, landmark..."
              className={inputCls + ' pl-9'}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  )
}
