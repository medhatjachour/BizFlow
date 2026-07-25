import { useState } from 'react'
import { ChevronDown, ChevronUp, Receipt, Tag } from 'lucide-react'
import { IncomingReceipt } from '../../types'
import { formatCurrency, formatDateTime } from '../../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function IncomingRow({ receipt }: { receipt: IncomingReceipt }) {
  const [expanded, setExpanded] = useState(false)
  const totalUnits = receipt.items.reduce((sum, item) => sum + item.quantity, 0)
  const {t} = useLanguage()
  return (
    <div className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      <div 
        className="p-4 flex items-center justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <Receipt size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{receipt.receiptNumber}</p>
              {receipt.invoiceNumber && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">Inv #{receipt.invoiceNumber}</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {receipt.supplierName || 'Unknown supplier'} · {formatDateTime(receipt.receivedAt)} · {receipt.items.length} items
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(receipt.totalCost)}</p>
            <p className="text-xs text-slate-500">{totalUnits} {t('cfUnits') || 'units'}</p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-right">{t('cfProduct') || 'Product'}</th>
                <th className="pb-2 font-medium text-center">{t('cfQuantity') || 'Qty'}</th>
                <th className="pb-2 font-medium text-right">{t('cfUnitCost') || 'Unit Cost'}</th>
                <th className="pb-2 font-medium text-right">{t('cfTotal') || 'Total'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {receipt.items.map(item => (
                <tr key={item.id}>
                  <td className="py-3 text-slate-700 dark:text-slate-300">
                    {item.productName}
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Tag size={10} /> {item.product?.category?.name || 'Uncategorized'}
                    </div>
                  </td>
                  <td className="py-3 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.unitCost)}</td>
                  <td className="py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {receipt.notes && (
            <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500">
              <span className="font-medium">Notes: </span> {receipt.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
