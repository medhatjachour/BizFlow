import React, { useState } from 'react'
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  Coins,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import {
  INPUT_BASE_CLS,
  PAYMENT_METHODS,
  QUICK_DISCOUNT_PERCENTAGES,
  COMMON_CASH_DENOMINATIONS
} from '../constants'
import type { CustomerLite, SaleSubmitPayload } from '../types'
import { CustomerSelector } from './CustomerSelector'

interface Props {
  cartTotals: {
    rawSubtotal: number
    itemDiscounts: number
    netItemsTotal: number
  }
  isSubmitting: boolean
  selectedCustomer: CustomerLite | null
  customerSearch: string
  customerResults: CustomerLite[]
  customerSearching: boolean
  customerDropdownOpen: boolean
  onCustomerSearchChange: (q: string) => void
  onSelectCustomer: (c: CustomerLite) => void
  onClearCustomer: () => void
  setCustomerDropdownOpen: (open: boolean) => void
  onOpenNewCustomerModal: () => void
  onSubmitSale: (payload: SaleSubmitPayload) => void
}

export const CheckoutSummary: React.FC<Props> = ({
  cartTotals,
  isSubmitting,
  selectedCustomer,
  customerSearch,
  customerResults,
  customerSearching,
  customerDropdownOpen,
  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
  setCustomerDropdownOpen,
  onOpenNewCustomerModal,
  onSubmitSale
}) => {
  const { t } = useLanguage()
  const [showOptions, setShowOptions] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [cartDiscount, setCartDiscount] = useState<string>('')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const discountVal = Math.min(
    cartTotals.netItemsTotal,
    Math.max(0, parseFloat(cartDiscount) || 0)
  )
  const grandTotal = Math.max(0, cartTotals.netItemsTotal - discountVal)
  const paidVal = parseFloat(amountPaid)

  // POS Cash Calculations
  const isPartial = !isNaN(paidVal) && paidVal < grandTotal
  const remainingBal = isPartial ? grandTotal - paidVal : 0
  const isOverpaid = !isNaN(paidVal) && paidVal > grandTotal
  const changeDue = isOverpaid ? paidVal - grandTotal : 0

  const handleApplyPctDiscount = (pct: number) => {
    const calculated = (cartTotals.netItemsTotal * pct) / 100
    setCartDiscount(calculated.toFixed(2))
  }

  const handleQuickCashTender = (denom: number) => {
    setAmountPaid(String(denom))
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmitSale({
      items: [],
      ownerId: selectedCustomer?.id,
      ownerName: selectedCustomer?.name,
      paymentMethod,
      notes: notes || undefined,
      cartDiscount: discountVal || undefined,
      amountPaid: !isNaN(paidVal) && paidVal < grandTotal ? paidVal : grandTotal
    })
  }

  return (
    <form onSubmit={handleFormSubmit} className="p-4 space-y-3 bg-white dark:bg-slate-900">
      {/* ── Net Payable Bar ─────────────────────────────────────────────── */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            ${cartTotals.rawSubtotal.toFixed(2)}
          </span>
        </div>

        {cartTotals.itemDiscounts > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Item Discounts</span>
            <span>-${cartTotals.itemDiscounts.toFixed(2)}</span>
          </div>
        )}

        {discountVal > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Order Discount</span>
            <span>-${discountVal.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Net Payable</span>
          <span className="text-lg text-violet-600 dark:text-violet-400 font-mono">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Payment Method 4-Way Selector ────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1">
        {PAYMENT_METHODS.map(pm => {
          const isSelected = paymentMethod === pm.id
          return (
            <button
              key={pm.id}
              type="button"
              onClick={() => setPaymentMethod(pm.id)}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-all ${
                isSelected
                  ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
              }`}
            >
              {pm.id === 'cash' && <Banknote size={14} />}
              {pm.id === 'card' && <CreditCard size={14} />}
              {pm.id === 'insurance' && <ShieldCheck size={14} />}
              {pm.id === 'other' && <Coins size={14} />}
              <span>{pm.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Cash Tender & Change Due Calculator ──────────────────────────── */}
      {paymentMethod === 'cash' && grandTotal > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 text-[10px] uppercase">Cash Tendered</span>
            <button
              type="button"
              onClick={() => setAmountPaid(grandTotal.toFixed(2))}
              className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Exact (${grandTotal.toFixed(2)})
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Amount received..."
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              className={`${INPUT_BASE_CLS} font-black text-sm`}
            />
            {COMMON_CASH_DENOMINATIONS.filter(d => d >= grandTotal)
              .slice(0, 3)
              .map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleQuickCashTender(d)}
                  className="px-2.5 text-xs font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 shrink-0"
                >
                  ${d}
                </button>
              ))}
          </div>

          {/* Change Due Display */}
          {changeDue > 0 && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300">
              <span className="text-xs font-bold">Change Due (الباقي):</span>
              <span className="text-base font-black font-mono">${changeDue.toFixed(2)}</span>
            </div>
          )}

          {isPartial && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300">
              <span className="text-xs font-bold">Remaining Due:</span>
              <span className="text-sm font-black font-mono">${remainingBal.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Client & Discount Accordion ──────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowOptions(v => !v)}
        className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:border-violet-400 transition-colors"
      >
        <span>Client & Discount Options</span>
        {showOptions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showOptions && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-100">
          <CustomerSelector
            selectedCustomer={selectedCustomer}
            search={customerSearch}
            results={customerResults}
            searching={customerSearching}
            dropdownOpen={customerDropdownOpen}
            onSearchChange={onCustomerSearchChange}
            onSelect={onSelectCustomer}
            onClear={onClearCustomer}
            onOpenNewModal={onOpenNewCustomerModal}
            setDropdownOpen={setCustomerDropdownOpen}
          />

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Order Discount ($)
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={cartDiscount}
                onChange={e => setCartDiscount(e.target.value)}
                className={`${INPUT_BASE_CLS} py-1.5 text-xs`}
              />
              {QUICK_DISCOUNT_PERCENTAGES.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyPctDiscount(pct)}
                  className="px-2 text-[10px] font-bold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Primary Submit Button ────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting || cartTotals.netItemsTotal <= 0}
        className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 text-white font-black text-xs rounded-2xl shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="h-4 w-4 stroke-[2.5]" />
            <span>Complete Sale (${grandTotal.toFixed(2)})</span>
          </>
        )}
      </button>
    </form>
  )
}