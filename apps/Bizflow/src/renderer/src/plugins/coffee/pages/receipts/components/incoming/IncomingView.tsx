import  { useState, useMemo } from 'react'
import { Search, Plus, PackageCheck, DollarSign, Boxes, Users, TrendingUp } from 'lucide-react'
import { useIncomingReceipts } from '../../hooks/useIncomingReceipts'

import { IncomingRow } from './IncomingRow'
import { IncomingForm } from './IncomingForm'
import { formatCurrency } from '../../utils'
import { StatCard } from '../../ui/StatCard'
import { Skeleton } from '@renderer/components/ui/Skeleton'
import { EmptyState } from '../../ui/EmptyState'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function IncomingView({ products, categories }: { products: any[]; categories: any[] }) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const filters = useMemo(() => ({
    page,
    pageSize: 15,
    search: search.trim() || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId
  }), [page, search, categoryId])

  const { receipts, summary, loading, totalPages, reload } = useIncomingReceipts(filters)
  const {t} = useLanguage()
  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : summary ? (
          <>
            <StatCard icon={<PackageCheck size={20} />} label={t('cfTotalReciept')||'Total Receipts'} value={summary.totalReceipts.toString()} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            <StatCard icon={<DollarSign size={20} />} label={t('cfTotalCost')||'Total Cost'} value={formatCurrency(summary.totalCost)} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatCard icon={<Boxes size={20} />} label={t('cfUnitRecieved')||'Units Received'} value={summary.totalUnits.toString()} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard icon={<TrendingUp size={20} />} label={t('cfAvgReceipt')||'Avg Receipt'} value={formatCurrency(summary.averageReceiptCost)} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            <StatCard icon={<Users size={20} />} label="Suppliers" value={summary.supplierCount.toString()} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
          </>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            // onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onChange={(e) => { console.log(e.target.value)}}
            placeholder={t('cfSearchReceipts')||'Search...'}
            // placeholder="comming soon..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
            className="flex-1 md:flex-none px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
          >
            <Plus size={16} />{t('cfAddReciept')||'Add Receipt'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState icon={<PackageCheck size={32} />} title="No Incoming Receipts" description="Start tracking inventory by adding your first incoming receipt." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {receipts.map(receipt => (
              <IncomingRow key={receipt.id} receipt={receipt} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
          <span className="text-sm text-slate-600 dark:text-slate-400">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <IncomingForm
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          products={products}
          onSuccess={reload}
        />
      )}
    </div>
  )
}
