import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Package, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  CheckCircle2, X, Search, RefreshCw, AlertCircle, Layers, Tag, Boxes
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Material, Category, MaterialStats } from './materialsTab.types'
import { categoryBadgeCls, expiryStatus, formatDate } from './materialsTab.shared'
import MaterialFormModal from './MaterialFormModal'
import CategoryManagementModal from './CategoryManagementModal'
import BatchManagementModal from './MaterialBatchModals'

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('confirmDelete')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function MaterialsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<MaterialStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all')
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiryDate' | 'updatedAt'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [managingBatchesFor, setManagingBatchesFor] = useState<Material | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try { setCategories(await window.api.clinic.materialCategories.getAll()) } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, pageSize])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const [res, s] = await Promise.all([
        window.api.clinic.materials.getAll({
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
          stockStatus: stockFilter,
          expiryStatus: expiryFilter,
          sortBy,
          sortDir,
          skip,
          take: pageSize,
        }),
        window.api.clinic.materials.stats(),
      ])
      setMaterials(res.data ?? [])
      setTotal(res.total ?? 0)
      setHasMore(Boolean(res.hasMore))
      setStats(s)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, page, pageSize, showToast, t])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCategories() }, [loadCategories])

  async function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    setDeleting(id)
    try {
      await window.api.clinic.materials.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load()
    } catch (err: any) {
      if (err?.message?.includes('MATERIAL_IN_USE')) {
        showToast('error', t('materialInUseError'))
      } else {
        showToast('error', t('errorDeletingRecord'))
      }
    } finally {
      setDeleting(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setCategoryFilter('')
    setStockFilter('all')
    setExpiryFilter('all')
    setSortBy('name')
    setSortDir('asc')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim() || categoryFilter || stockFilter !== 'all' || expiryFilter !== 'all' || sortBy !== 'name' || sortDir !== 'asc')

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} label={t('materialStatsTotal')} value={stats.total} color="teal" onClick={() => { setStockFilter('all'); setExpiryFilter('all') }} active={stockFilter === 'all' && expiryFilter === 'all'} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label={t('materialStatsLowStock')} value={stats.lowStock} color={stats.lowStock > 0 ? 'amber' : 'teal'} onClick={() => setStockFilter('low_stock')} active={stockFilter === 'low_stock'} />
          <StatCard icon={<AlertCircle className="h-5 w-5" />} label={t('materialStatsExpired')} value={stats.expired} color={stats.expired > 0 ? 'red' : 'teal'} onClick={() => setExpiryFilter('expired')} active={expiryFilter === 'expired'} />
          <StatCard icon={<Layers className="h-5 w-5" />} label={t('materialStatsExpiringSoon')} value={stats.expiringSoon} color={stats.expiringSoon > 0 ? 'orange' : 'teal'} onClick={() => setExpiryFilter('expiring_soon')} active={expiryFilter === 'expiring_soon'} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-shadow"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('materialSearch')}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>

          {/* Stock filter */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
          >
            <option value="all">{t('materialStockAll') ?? 'All stock'}</option>
            <option value="in_stock">{t('materialStockIn') ?? 'In stock'}</option>
            <option value="out_of_stock">{t('materialStockOut') ?? 'Out of stock'}</option>
            <option value="low_stock">{t('materialStatsLowStock')}</option>
          </select>

          {/* Expiry filter */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value as typeof expiryFilter)}
          >
            <option value="all">{t('materialExpiryAll') ?? 'All expiry'}</option>
            <option value="expired">{t('materialExpiryExpired') ?? 'Expired'}</option>
            <option value="expiring_soon">{t('materialExpirySoon') ?? 'Expiring soon'}</option>
            <option value="valid">{t('materialExpiryValid') ?? 'Valid'}</option>
            <option value="no_expiry">{t('materialExpiryNone') ?? 'No expiry'}</option>
          </select>

          {/* Sort by */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="name">{t('materialSortName') ?? 'Sort: Name'}</option>
            <option value="quantity">{t('materialSortQuantity') ?? 'Sort: Quantity'}</option>
            <option value="expiryDate">{t('materialSortExpiry') ?? 'Sort: Expiry'}</option>
            <option value="updatedAt">{t('materialSortUpdated') ?? 'Sort: Updated'}</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            {sortDir === 'asc' ? (t('ascending') ?? 'Asc') : (t('descending') ?? 'Desc')}
          </button>

          <button
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('clearFilters') ?? 'Clear filters'}
            </button>
          )}

          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-white bg-violet-600 hover:bg-violet-700 text-sm font-semibold transition-colors"
          >
            <Tag className="h-4 w-4" />
            {t('categories') ?? 'Categories'}
          </button>

          <button
            onClick={() => { setEditingMaterial(null); setShowFormModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="h-4 w-4" />
            {t('newMaterial')}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <MaterialsTableSkeleton />
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Package className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">{t('noMaterials')}</p>
          <button
            onClick={() => { setEditingMaterial(null); setShowFormModal(true) }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> {t('newMaterial')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">{t('materialName')}</th>
                <th className="text-left px-5 py-3">{t('materialCategory')}</th>
                <th className="text-center px-5 py-3">{t('materialQuantity')}</th>
                <th className="text-center px-5 py-3">{t('materialExpiryDate')}</th>
                <th className="text-center px-5 py-3">{t('status')}</th>
                <th className="text-right px-5 py-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {materials.map(m => {
                const expStatus = expiryStatus(m.expiryDate)
                const isLow = m.minQuantity > 0 && m.quantity <= m.minQuantity
                return (
                  <tr key={m.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!m.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                      {m.supplier && <div className="text-xs text-slate-400 mt-0.5">{m.supplier}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.category ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryBadgeCls(categories.find(c => c.name === m.category)?.color ?? 'slate')}`}>
                          {m.category}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${m.quantity <= 0 ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {m.quantity}
                      </span>
                      <span className="text-slate-400 text-xs"> {m.unit}</span>
                      {m.quantity <= 0 && <span className="ml-1 text-red-500 text-xs">●</span>}
                      {m.quantity > 0 && isLow && <span className="ml-1 text-amber-500 text-xs">⚠</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs">
                      {expStatus === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <AlertCircle className="h-3 w-3" />{formatDate(m.expiryDate)}
                        </span>
                      )}
                      {expStatus === 'soon' && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="h-3 w-3" />{formatDate(m.expiryDate)}
                        </span>
                      )}
                      {expStatus === 'ok' && <span className="text-slate-600 dark:text-slate-300">{formatDate(m.expiryDate)}</span>}
                      {expStatus === 'none' && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {m.isActive
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{t('active')}</span>
                        : <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium"><X className="h-3.5 w-3.5" />{t('inactive')}</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setManagingBatchesFor(m)}
                          title={t('manageBatches') ?? 'Manage Batches'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Boxes className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingMaterial(m); setShowFormModal(true) }}
                          title={t('edit')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          title={t('delete')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          {deleting === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('clinicMaterialShowing') ?? 'Showing'} {materials.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('clinicMaterialOf') ?? 'of'} {total}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 dark:text-slate-400">{t('rowsPerPage') ?? 'Rows'}:</label>
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t('clinicMaterialPrevious') ?? 'Previous'}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('clinicMaterialPage') ?? 'Page'} {page}</span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t('clinicMaterialNext') ?? 'Next'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showFormModal && (
        <MaterialFormModal
          existing={editingMaterial}
          onClose={() => { setShowFormModal(false); setEditingMaterial(null) }}
          onSaved={() => { setShowFormModal(false); setEditingMaterial(null); load() }}
        />
      )}
      {managingBatchesFor && (
        <BatchManagementModal
          material={managingBatchesFor}
          onClose={() => { setManagingBatchesFor(null); load() }}
        />
      )}
      {showCategoryModal && (
        <CategoryManagementModal
          onClose={() => { setShowCategoryModal(false); loadCategories() }}
        />
      )}
      {deleteConfirmId && (
        <DeleteConfirmModal
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function MaterialsTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            <th className="px-4 py-3"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></th>
            <th className="px-4 py-3"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
              <td className="px-4 py-3"><div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded" /></td>
              <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
              <td className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Stat card helper ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, onClick, active }: { icon: ReactNode; label: string; value: number; color: string; onClick?: () => void; active?: boolean }) {
  const iconCls: Record<string, string> = {
    teal:   'bg-teal-100   dark:bg-teal-900/30   text-teal-600   dark:text-teal-400',
    amber:  'bg-amber-100  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
    red:    'bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border bg-white dark:bg-slate-800 p-5 flex items-start gap-4 transition-all ${active ? 'border-teal-400 dark:border-teal-500 ring-2 ring-teal-200/60 dark:ring-teal-700/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCls[color] ?? iconCls.teal}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </button>
  )
}
