import { Receipt, Loader2 } from 'lucide-react'

interface Props {
  loading?: boolean
  message?: string
}

export function EmptyState({ loading, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      {loading ? (
        <>
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading sales…</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
            <Receipt className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No sales found</p>
          <p className="text-xs text-slate-400">{message ?? 'Try adjusting your filters or time period'}</p>
        </>
      )}
    </div>
  )
}
