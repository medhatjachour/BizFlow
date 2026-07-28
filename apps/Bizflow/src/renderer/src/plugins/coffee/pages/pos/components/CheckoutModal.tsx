import { X, Check, Loader2, Tag, StickyNote } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ORDER_TYPES, PAYMENT_METHODS, orderTypeMeta } from '../constants'
import { CustomerPicker } from './CustomerPicker'
import { hexToRgba, formatMoney } from '../utils'
import type {
  CartItem,
  CoffeeTable,
  OrderType,
  PaymentMethod,
  CheckoutForm,
  CoffeeCustomer,
  SelectOption
} from '../types'
import CustomSelect from '@renderer/components/ui/CustomSelect'

interface Props {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  subtotal: number
  total: number
  // Checkout form
  checkout: CheckoutForm
  patchCheckout: (p: Partial<CheckoutForm>) => void
  // Tables
  tables: CoffeeTable[]
  // Customer
  customerProps: {
    orderType: string
    search: string // ← ADD THIS
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
  // Submit
  onConfirm: () => void
  checking: boolean
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

export function CheckoutModal({
  open,
  onClose,
  cart,
  subtotal,
  total,
  checkout,
  patchCheckout,
  tables,
  customerProps,
  onConfirm,
  checking
}: Props) {
  const { t } = useLanguage()
  if (!open) return null

  // 3. Generate tableOptions dynamically inside the component
  const tableOptions: SelectOption[] = [
    {
      value: '',
      label: `— ${t('cfWalkInNoTable') || 'Walk-in / No table'} —`
    },
    ...tables.map((table) => ({
      value: table.id,
      label: `Table ${table.number}${table.name ? ` (${table.name})` : ''}${table.section ? ` · ${table.section}` : ''}`
    }))
  ]

  const selectedType = orderTypeMeta(checkout.orderType)
  // const selectedPay = payMeta(checkout.paymentMethod)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: hexToRgba(selectedType.color, 0.15),
                color: selectedType.color
              }}
            >
              <selectedType.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Checkout</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-row">
                <span> {cart.length} </span> {t('cfCheckoutItems') || 'Items'} ={' '}
                <span> {formatMoney(total)} $</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Order type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('cfCheckoutOrderType') || 'Order Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map(({ value, label, icon: Icon, color }) => {
                const selected = checkout.orderType === value
                return (
                  <button
                    key={value}
                    onClick={() => patchCheckout({ orderType: value as OrderType })}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      selected
                        ? 'border-transparent'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                    style={
                      selected
                        ? {
                            backgroundColor: hexToRgba(color, 0.12),
                            color: color
                          }
                        : undefined
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table (dine-in) */}
          {checkout.orderType === 'dine_in' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Table (optional)
              </label>
              <CustomSelect
                value={checkout.selectedTable}
                onChange={(val) => patchCheckout({ selectedTable: val as string })}
                options={tableOptions}
                placeholder={t('cfWalkInNoTable') || 'Walk-in / No table'}
              />
            </div>
          )}

          {/* Customer (takeaway/delivery) */}
          <div>
            {(checkout.orderType === 'takeaway' || checkout.orderType === 'delivery') && (
              <CustomerPicker {...customerProps} />
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('cfCheckoutPaymentMethod') || 'Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon, color }) => {
                const selected = checkout.paymentMethod === value
                return (
                  <button
                    key={value}
                    onClick={() => patchCheckout({ paymentMethod: value as PaymentMethod })}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      selected
                        ? 'border-transparent'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                    style={
                      selected
                        ? {
                            backgroundColor: hexToRgba(color, 0.12),
                            color: color
                          }
                        : undefined
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Order items review */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t('cfCheckoutItems') || 'Items'} ({cart.length})
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{item.quantity}×</span> {item.productName}
                    <span className="text-xs text-slate-400">({item.unit})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(item.salePrice * item.quantity)}
                    </span>
                    {item.salePrice !== item.unitPrice && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        @ {formatMoney(item.salePrice)} (was {formatMoney(item.unitPrice)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount + notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                <Tag className="w-3.5 h-3.5 inline mr-1" />
                {t('cfCheckoutDiscount') || 'Discount'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={checkout.discount || ''}
                onChange={(e) => patchCheckout({ discount: Number(e.target.value) })}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                <StickyNote className="w-3.5 h-3.5 inline mr-1" />

                {t('cfCheckoutNotes') || 'Notes'}
              </label>
              <input
                value={checkout.notes}
                onChange={(e) => patchCheckout({ notes: e.target.value })}
                placeholder="Optional…"
                className={inputCls}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-2">
            {checkout.discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{t('cfCartSubTotal') || 'Subtotal'}</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>{t('cfCheckoutDiscount') || 'Discount'}</span>
                  <span className="tabular-nums">−{formatMoney(checkout.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-amber-200 dark:border-amber-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('cfCartTotal') || 'Total'}
              </span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onConfirm}
            disabled={checking}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {checking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {checking ? 'Processing…' : `Pay ${formatMoney(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
