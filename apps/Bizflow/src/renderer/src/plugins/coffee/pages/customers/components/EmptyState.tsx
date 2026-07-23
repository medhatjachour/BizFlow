import { Users, Loader2 } from 'lucide-react'

interface Props {
  loading?: boolean
  search?: string
}

export function EmptyState({ loading, search }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {loading ? (
        <>
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Loading customers...</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No customers found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            {search ? `No results for "${search}". Try a different search term.` : 'Add your first customer to start tracking their orders.'}
          </p>
        </>
      )}
    </div>
  )
}
