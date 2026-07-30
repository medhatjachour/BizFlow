import { Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'
import { TransactionRow } from './TransactionRow'
import type { Transaction } from '../types'

interface Props {
  transactions: Transaction[]
  search: string
  setSearch: (s: string) => void
  page: number
  totalPages: number
  setPage: (p: number) => void
  loading: boolean
}

export function TransactionsTable({
  transactions, search, setSearch, page, totalPages, setPage, loading,
}: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Transactions
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {transactions.length} on this page
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order, customer, cashier..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div className="col-span-3 text-xs font-medium text-slate-500 dark:text-slate-400">Order</div>
        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">Customer / Table</div>
        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">Payment</div>
        <div className="col-span-1 text-xs font-medium text-slate-500 dark:text-slate-400">Cashier</div>
        <div className="col-span-1 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Subtotal</div>
        <div className="col-span-1 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Discount</div>
        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Total</div>
      </div>

      {/* Table body */}
      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 animate-pulse">
                <div className="col-span-3 space-y-2">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="col-span-2">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="col-span-1">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="col-span-1">
                  <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded ml-auto" />
                </div>
                <div className="col-span-1">
                  <div className="h-3 w-10 bg-slate-100 dark:bg-slate-800 rounded ml-auto" />
                </div>
                <div className="col-span-2">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              No transactions found
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>

          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
