import React from 'react'
import { X, RotateCcw, Printer } from 'lucide-react'
import { PharmacySale } from '../types'
import { money, PAY_BADGE, SALE_STATUS_BADGE } from '../../components/_shared'
import { Button } from '../../components/ui'
import { SaleItemRefundRow } from './SaleItemRefundRow'
import { SettlePaymentSection } from './SettlePaymentSection'
import { useSaleDetail } from '../hooks/useSaleDetail'

interface SaleDetailModalProps {
  sale: PharmacySale
  onClose: () => void
  onChanged: () => void
  onThermalPrint?: (sale: PharmacySale) => void
  toast: any
  t: (k: string) => string
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale: initialSale,
  onClose,
  onChanged,
  onThermalPrint,
  toast,
  t,
}) => {
  const {
    sale,
    busy,
    outstanding,
    payAmount,
    setPayAmount,
    isPaying,
    setIsPaying,
    refundItemId,
    setRefundItemId,
    refundQty,
    setRefundQty,
    refundWholeSale,
    refundItem,
    settlePayment,
  } = useSaleDetail(initialSale, toast, t, onChanged)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Sale #{sale.saleNumber}</h2>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${SALE_STATUS_BADGE[sale.status] ?? ''}`}>
                {(sale.status || '').replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(sale.saleDate).toLocaleString()} · {sale.customerName || 'Walk-in'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onThermalPrint && (
              <button
                onClick={() => onThermalPrint(sale)}
                title="Print Thermal Receipt"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Printer size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Items List */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchased Items</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sale.items?.map(it => (
                <SaleItemRefundRow
                  key={it.id}
                  item={it}
                  isSaleRefunded={sale.status === 'refunded'}
                  isEditing={refundItemId === it.id}
                  refundQty={refundQty}
                  busy={busy}
                  onStartEditing={() => {
                    setRefundItemId(it.id)
                    setRefundQty(String(it.quantity - (it.refundedQty ?? 0)))
                  }}
                  onCancelEditing={() => setRefundItemId(null)}
                  onRefundQtyChange={setRefundQty}
                  onSubmitRefund={refundItem}
                />
              ))}
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">${money(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-${money(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-900 dark:text-white">Total</span>
              <span className="text-emerald-600 dark:text-emerald-400">${money(sale.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pt-1">
              <span>Paid Amount ({sale.paymentMethod})</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">${money(sale.amountPaid)}</span>
            </div>
            {(sale.refundedAmount ?? 0) > 0 && (
              <div className="flex justify-between text-red-500 font-medium">
                <span>Total Refunded</span>
                <span>-${money(sale.refundedAmount ?? 0)}</span>
              </div>
            )}
            {outstanding > 0.005 && (
              <div className="flex justify-between text-amber-600 font-bold pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                <span>Outstanding Balance</span>
                <span>${money(outstanding)}</span>
              </div>
            )}
          </div>

          {/* Settle Outstanding Section */}
          {sale.status !== 'refunded' && (
            <SettlePaymentSection
              outstanding={outstanding}
              isPaying={isPaying}
              payAmount={payAmount}
              busy={busy}
              onTogglePaying={setIsPaying}
              onPayAmountChange={setPayAmount}
              onSettle={settlePayment}
            />
          )}
        </div>

        {/* Footer Full Refund Action */}
        {sale.status !== 'refunded' && (
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="danger"
              size="sm"
              block
              loading={busy}
              icon={RotateCcw}
              onClick={refundWholeSale}
            >
              {t('phRefundWholeSale') || 'Refund Entire Sale & Restock'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}