import React, { useState, useMemo } from 'react'
import { Search, Plus, Truck, Clock, CheckCircle2, Boxes, DollarSign, Route } from 'lucide-react'
import { useTransitReceipts } from '../../hooks/useTransitReceipts'

import { TransitRow } from './TransitRow'
import { TransitForm } from './TransitForm'
import { STATUS_CONFIG } from '../../constants'
import { formatCurrency } from '../../utils'
import { StatCard } from '../../ui/StatCard'
import { Skeleton } from '@renderer/components/ui/Skeleton'
import { EmptyState } from '../../ui/EmptyState'

export function TransitView() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const filters = useMemo(() => ({
    page,
    pageSize: 15,
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status
  }), [page, search, status])

  const { receipts, summary, loading, totalPages, reload } = useTransitReceipts(filters)

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : summary ? (
          <>
            <StatCard icon={<Truck size={20} />} label="Total Transit" value={summary.totalReceipts.toString()} color="bg-blue-100 text-blue-600" />
            <StatCard icon={<Clock size={20} />} label="Pending" value={summary.pendingCount.toString()} color="bg-amber-100 text-amber-600" />
            <StatCard icon={<CheckCircle2 size={20} />} label="Delivered" value={summary.deliveredCount.toString()} color="bg-emerald-100 text-emerald-600" />
            <StatCard icon={<Boxes size={20} />} label="Total Items" value={summary.totalItems.toString()} color="bg-purple-100 text-purple-600" />
            <StatCard icon={<DollarSign size={20} />} label="Total Amount" value={formatCurrency(summary.totalAmount)} color="bg-orange-100 text-orange-600" />
            <StatCard icon={<Route size={20} />} label="Delivery Fees" value={formatCurrency(summary.totalDeliveryFees)} color="bg-teal-100 text-teal-600" />
          </>
        ) : null}
      </div>

      {/* Quick Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button 
          onClick={() => setStatus('all')} 
          className={`px-3 py-1.5 text-xs rounded-full transition-all ${status === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
        >
          All ({summary?.totalReceipts || 0})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all ${status === key ? config.color : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
          >
            <config.icon size={12} />
            {config.label} ({summary?.statusCounts[key as keyof typeof summary.statusCounts] || 0})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by sender, recipient, #..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> New Transit
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState icon={<Truck size={32} />} title="No Transit Receipts" description="Create a transit receipt for orders passing through your cafe." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {receipts.map(receipt => (
              <TransitRow key={receipt.id} receipt={receipt} onStatusUpdate={reload} />
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

      {modalOpen && <TransitForm isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={reload} />}
    </div>
  )
}
