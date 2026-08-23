import React from 'react'
import { History, PackageX, Loader2 } from 'lucide-react'
import { ExpiringBatchItem } from '../types'
import { money } from '../../components/_shared'
import { IconButton } from '../../components/ui'
import { getUrgencyTier } from '../utils'

interface ExpiryBatchesTableProps {
  batches: ExpiringBatchItem[]
  loading: boolean
  onInspectProduct: (product: { id: string; name: string; unit: string }) => void
  onDisposeBatch: (batch: ExpiringBatchItem) => void
  t: (k: string) => string
}

export const ExpiryBatchesTable: React.FC<ExpiryBatchesTableProps> = ({
  batches,
  loading,
  onInspectProduct,
  onDisposeBatch,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Analyzing shelf expiry timeline...</p>
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm font-medium">All clear! No stock batches match this expiry threshold.</p>
        <p className="text-xs mt-0.5">Adjust the window to 60 or 90 days to look further ahead.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold bg-slate-50/40 dark:bg-slate-900/30">
            <th className="px-4 py-3">Medicine & Formula</th>
            <th className="px-4 py-3 font-mono">Batch #</th>
            <th className="px-4 py-3 text-right">In Stock</th>
            <th className="px-4 py-3">Expiry Date</th>
            <th className="px-4 py-3">Urgency Status</th>
            <th className="px-4 py-3 text-right">Cost Value</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {batches.map(b => {
            const urgency = getUrgencyTier(b.daysToExpiry)

            return (
              <tr
                key={b.id}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-slate-700 dark:text-slate-300 ${
                  b.isExpired ? 'bg-red-50/30 dark:bg-red-950/15' : ''
                }`}
              >
                {/* Product Name */}
                <td className="px-4 py-2.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{b.product?.name}</div>
                  {b.product?.genericName && (
                    <p className="text-[10px] text-slate-400 italic mt-0.2">{b.product.genericName}</p>
                  )}
                </td>

                {/* Batch Number */}
                <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                  {b.batchNumber || '—'}
                </td>

                {/* Quantity */}
                <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                  {b.quantity} <span className="text-[10px] font-normal text-slate-400">{b.product?.unit}</span>
                </td>

                {/* Expiry Date */}
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {new Date(b.expiryDate).toLocaleDateString()}
                </td>

                {/* Urgency Badge */}
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgency.badgeClass}`}>
                    {urgency.label}
                  </span>
                </td>

                {/* Value at Risk */}
                <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  ${money(b.value)}
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {b.product?.id && (
                      <IconButton
                        icon={History}
                        tone="violet"
                        onClick={() =>
                          onInspectProduct({
                            id: b.product!.id,
                            name: b.product!.name,
                            unit: b.product!.unit,
                          })
                        }
                        title="View history & analytics"
                      />
                    )}
                    <button
                      onClick={() => onDisposeBatch(b)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                    >
                      <PackageX size={12} /> {t('phDispose') || 'Dispose'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}