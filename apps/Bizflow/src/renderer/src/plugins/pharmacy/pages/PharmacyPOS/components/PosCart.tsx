import React, { useState } from 'react'
import { ShoppingCart, Trash2, CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react'
import { CartLine, PosCustomer, PaymentMethod } from '../types'
import { PosCartItemRow } from './PosCartItemRow'
import { QUICK_CASH_DENOMINATIONS, PAYMENT_METHODS } from '../constants'
import { money } from '../../components/_shared'
import { Button } from '../../components/ui'
import { PosCustomerPicker } from './POSCustomerPicker'

interface PosCartProps {
  cart: CartLine[]
  customer: PosCustomer | null
  discount: string
  paymentMethod: PaymentMethod
  amountPaid: string
  subtotal: number
  parsedDiscount: number
  total: number
  changeDue: number
  busy: boolean
  heldSales: { id: string; time: string; customer?: PosCustomer | null; cart: CartLine[] }[]
  canDiscount: boolean
  autoThermalPrint: boolean
  onToggleThermalPrint: (val: boolean) => void
  onSetCustomer: (cust: PosCustomer | null) => void
  onSetDiscount: (val: string) => void
  onSetPaymentMethod: (pm: PaymentMethod) => void
  onSetAmountPaid: (val: string) => void
  onQtyChange: (index: number, qty: number) => void
  onPriceChange: (index: number, price: number) => void
  onToggleUnit: (index: number) => void
  onRemoveItem: (index: number) => void
  onClearCart: () => void
  onParkSale: () => void
  onResumeHeldSale: (id: string) => void
  onCheckout: () => void
}

export const PosCart: React.FC<PosCartProps> = ({
  cart,
  customer,
  discount,
  paymentMethod,
  amountPaid,
  subtotal,
  total,
  changeDue,
  busy,
  heldSales,
  canDiscount,
  autoThermalPrint,
  onToggleThermalPrint,
  onSetCustomer,
  onSetDiscount,
  onSetPaymentMethod,
  onSetAmountPaid,
  onQtyChange,
  onPriceChange,
  onToggleUnit,
  onRemoveItem,
  onClearCart,
  onParkSale,
  onResumeHeldSale,
  onCheckout,
}) => {
  const [showHeldList, setShowHeldList] = useState(false)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShoppingCart size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">Sale Cart</h2>
            <span className="text-[10px] text-slate-400">{cart.length} item{cart.length !== 1 ? 's' : ''} queued</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {heldSales.length > 0 && (
            <button
              onClick={() => setShowHeldList(!showHeldList)}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-amber-100"
            >
              <PlayCircle size={12} /> Held ({heldSales.length})
            </button>
          )}

          {cart.length > 0 && (
            <>
              <button
                onClick={onParkSale}
                title="Hold current sale to attend next customer"
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
              >
                <PauseCircle size={13} /> Hold
              </button>
              <button
                onClick={onClearCart}
                className="text-[11px] text-slate-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Held Sales Popup Bar */}
      {showHeldList && heldSales.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 p-2 space-y-1 max-h-32 overflow-y-auto">
          {heldSales.map(hs => (
            <div key={hs.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-1.5 rounded border border-amber-200/60 dark:border-amber-800">
              <span>#{hs.id} ({hs.time}) - {hs.cart.length} items</span>
              <button
                onClick={() => {
                  onResumeHeldSale(hs.id)
                  setShowHeldList(false)
                }}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 underline"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customer Selector */}
      <PosCustomerPicker
        customer={customer}
        onSelectCustomer={onSetCustomer}
        onApplyDiscount={pct => onSetDiscount(((subtotal * pct) / 100).toFixed(2))}
      />

      {/* High-density cart rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-[160px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <ShoppingCart size={32} className="opacity-20 mb-2" />
            <p className="text-xs font-medium">Cart is currently empty</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Scan barcodes or click items to begin checkout</p>
          </div>
        ) : (
          cart.map((line, idx) => (
            <PosCartItemRow
              key={`${line.productId}-${line.saleUnit}-${idx}`}
              index={idx}
              line={line}
              onQtyChange={onQtyChange}
              onPriceChange={onPriceChange}
              onToggleUnit={onToggleUnit}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Footer & Checkout Panel */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 p-3 space-y-2 shrink-0">
        {/* Calculations */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">${money(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span>Discount ($)</span>
            <input
              type="number"
              min="0"
              disabled={!canDiscount}
              value={discount}
              onChange={e => onSetDiscount(e.target.value)}
              placeholder="0.00"
              className="w-20 text-right px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800 text-sm font-bold">
            <span className="text-slate-800 dark:text-white">Payable Total</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-base">${money(total)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          {PAYMENT_METHODS.slice(0, 3).map(pm => (
            <button
              key={pm.id}
              onClick={() => onSetPaymentMethod(pm.id)}
              className={`py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                paymentMethod === pm.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              {pm.label}
            </button>
          ))}
        </div>

        {/* Quick Cash Presets & Tendered Amount */}
        {paymentMethod === 'cash' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <button
                onClick={() => onSetAmountPaid(total.toString())}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 whitespace-nowrap"
              >
                Exact (${money(total)})
              </button>
              {QUICK_CASH_DENOMINATIONS.filter(denom => denom >= total || denom === 50 || denom === 100).slice(0, 4).map(denom => (
                <button
                  key={denom}
                  onClick={() => onSetAmountPaid(denom.toString())}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                >
                  ${denom}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  placeholder={`Cash Received (${money(total)})`}
                  value={amountPaid}
                  onChange={e => onSetAmountPaid(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {changeDue > 0 && (
                <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-lg text-xs font-bold shrink-0">
                  Change: ${money(changeDue)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thermal Print Toggle & Complete Button */}
        <div className="pt-1 space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoThermalPrint}
              onChange={e => onToggleThermalPrint(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <span>Auto-print thermal receipt upon checkout</span>
          </label>

          <Button
            block
            size="md"
            loading={busy}
            disabled={cart.length === 0}
            icon={CheckCircle2}
            onClick={onCheckout}
          >
            Complete Sale (${money(total)})
          </Button>
        </div>
      </div>
    </div>
  )
}