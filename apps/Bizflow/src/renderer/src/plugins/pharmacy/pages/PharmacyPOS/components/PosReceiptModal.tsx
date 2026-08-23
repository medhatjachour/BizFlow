import React, { useRef } from 'react'
import { Printer, Check, X } from 'lucide-react'
import { SaleTransactionResult } from '../types'
import { money } from '../../components/_shared'
import { Button } from '../../components/ui'

interface PosReceiptModalProps {
  sale: SaleTransactionResult
  onClose: () => void
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({ sale, onClose }) => {
  const printContentRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={18} className="stroke-[3]" />
            <span className="font-bold text-sm">Sale Completed</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={16} /></button>
        </div>

        {/* Printable Thermal Slip (58mm/80mm simulation) */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-900 dark:text-slate-100" ref={printContentRef}>
          <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            <h3 className="font-bold text-sm">PHARMACY CARE POS</h3>
            <p className="text-[10px] text-slate-500">Invoice: #{sale.saleNumber}</p>
            <p className="text-[10px] text-slate-500">{sale.createdAt}</p>
            {sale.customer && <p className="text-[10px] font-semibold mt-1">Customer: {sale.customer.name}</p>}
          </div>

          <div className="py-2 space-y-1.5 border-b border-dashed border-slate-300 dark:border-slate-700">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="truncate font-semibold">{item.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} x ${money(item.unitPrice)} ({item.saleUnit === 'sub' ? item.subUnit || 'sub' : item.unit})
                  </div>
                </div>
                <div className="font-bold">${money(item.quantity * item.unitPrice)}</div>
              </div>
            ))}
          </div>

          <div className="py-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span>${money(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-${money(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Total:</span>
              <span>${money(sale.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Paid ({sale.paymentMethod}):</span>
              <span>${money(sale.amountPaid)}</span>
            </div>
            {sale.change > 0 && (
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Change Due:</span>
                <span>${money(sale.change)}</span>
              </div>
            )}
          </div>

          <div className="text-center pt-3 text-[10px] text-slate-400 border-t border-dashed border-slate-300 dark:border-slate-700">
            Thank you for your visit!
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <Button variant="secondary" size="sm" block onClick={onClose}>
            New Sale
          </Button>
          <Button variant="primary" size="sm" block icon={Printer} onClick={handlePrint}>
            Thermal Print
          </Button>
        </div>
      </div>
    </div>
  )
}