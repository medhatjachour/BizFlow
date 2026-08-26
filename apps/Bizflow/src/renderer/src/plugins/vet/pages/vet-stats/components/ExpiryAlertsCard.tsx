import { PackageX, AlertTriangle } from 'lucide-react'
import { MedicineBatch } from '../types'
import { formatCurrency } from '../utils'

interface ExpiryAlertsCardProps {
  expiredBatches: MedicineBatch[]
  expiring7Batches: MedicineBatch[]
  expiring30Batches: MedicineBatch[]
  expiredValue: number
  expiring7Value: number
  expiring30Value: number
  totalExpiryValue: number
  topExpired: MedicineBatch[]
}

export function ExpiryAlertsCard({
  expiredBatches,
  expiring7Batches,
  expiring30Batches,
  expiredValue,
  expiring7Value,
  expiring30Value,
  totalExpiryValue,
  topExpired
}: ExpiryAlertsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <PackageX size={16} className="text-rose-500" /> Batch Expiry Risk Monitor
        </h3>
        {totalExpiryValue > 0 && (
          <span className="text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
            {formatCurrency(totalExpiryValue)} at risk
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className={`rounded-xl p-3 text-center border ${expiredBatches.length > 0 ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700'}`}>
          <p className={`text-2xl font-black ${expiredBatches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{expiredBatches.length}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Expired</p>
          {expiredBatches.length > 0 && <p className="text-[10px] text-rose-500 font-bold mt-0.5">{formatCurrency(expiredValue)}</p>}
        </div>

        <div className={`rounded-xl p-3 text-center border ${expiring7Batches.length > 0 ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700'}`}>
          <p className={`text-2xl font-black ${expiring7Batches.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{expiring7Batches.length}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">In 7 Days</p>
          {expiring7Batches.length > 0 && <p className="text-[10px] text-amber-500 font-bold mt-0.5">{formatCurrency(expiring7Value)}</p>}
        </div>

        <div className={`rounded-xl p-3 text-center border ${expiring30Batches.length > 0 ? 'bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/60' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700'}`}>
          <p className={`text-2xl font-black ${expiring30Batches.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400'}`}>{expiring30Batches.length}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">In 30 Days</p>
          {expiring30Batches.length > 0 && <p className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold mt-0.5">{formatCurrency(expiring30Value)}</p>}
        </div>
      </div>

      {topExpired.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={12} className="text-rose-500" /> High-Value Expired Batches
          </p>
          <div className="space-y-1">
            {topExpired.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                  {i + 1}. {b.medicineName}
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(b.quantity * (b.costPerUnit || 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}