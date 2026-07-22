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
    <div className="space-y-3">
      {/* Search + New */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          {t('cfCheckoutFndCustomer')||"Find Customer"}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              onFocus={onFocus}
              onBlur={() => setTimeout(onBlur, 150)}
              placeholder="Search by name, phone..."
              className={inputCls + ' pl-9'}
            />
            {showDrop && results.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {results.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.phone || c.email || 'No contact info'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onNewCustomer}
            className="px-3 py-2 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Selected customer chip */}
        {selected && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <User className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex-1">
              {selected.name}
            </span>
            <button
              onClick={onClear}
              className="text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {t('cfCheckoutCustomerNM')||"Name"}
          </label>
          <input
            value={customerName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {t('cfCheckoutCustomerPH')||"Phone"}
          </label>
          <input
            value={customerPhone}
            onChange={e => onPhoneChange(e.target.value)}
            placeholder="01x..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Delivery address */}
      {orderType === 'delivery' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {t('cfCheckoutCustomerADDR')||"Delivery Address"}
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={customerAddress}
              onChange={e => onAddressChange(e.target.value)}
              placeholder="Street, area, landmark..."
              className={inputCls + ' pl-9'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
