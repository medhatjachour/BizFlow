import  { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV, pharma } from '../components/_shared'
import { Toolbar, SearchBox, Segmented, FilterSelect, Button, Pagination } from '../components/ui'

import { usePharmacyProducts } from './hooks/usePharmacyProducts'
import { ProductMetricsBar } from './components/ProductMetricsBar'
import { ProductsTable } from './components/ProductsTable'
import { ProductFormModal } from './components/ProductFormModal'
import { BatchManagerModal } from './components/BatchManagerModal'
import { ProductDetailModal } from './components/ProductDetailModal'
import { ProductDeleteModal } from './components/ProductDeleteModal'
import { STOCK_FILTER_OPTIONS } from './constants'
import { exportProductsToCSV } from './utils'
import { PharmacyProductItem } from './types'

export default function PharmacyProducts() {
  const toast = useToast()
  const { t } = useLanguage()

  const [editTarget, setEditTarget] = useState<PharmacyProductItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [batchTarget, setBatchTarget] = useState<PharmacyProductItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PharmacyProductItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<PharmacyProductItem | null>(null)

  const {
    rows,
    total,
    page,
    pageCount,
    loading,
    search,
    category,
    stockFilter,
    categories,
    metrics,
    setPage,
    setSearch,
    setCategory,
    setStockFilter,
    reload,
  } = usePharmacyProducts(toast)

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error('No products available to export')
      return
    }
    const csvData = exportProductsToCSV(rows)
    downloadCSV(csvData, `pharmacy-catalog-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Catalog exported successfully')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      const res = await pharma()?.products.delete(deleteTarget.id)
      toast.success(
        res?.softDeleted
          ? t('phProductDisabled') || 'Product disabled (has existing sales records)'
          : t('phProductDeleted') || 'Product deleted'
      )
      setDeleteTarget(null)
      reload()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Metrics Counter Bar */}
      <ProductMetricsBar metrics={metrics} />

      {/* Filter and Control Toolbar */}
      <Toolbar
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditTarget(null)
                setShowForm(true)
              }}
            >
              {t('phAddProduct') || 'Add Product'}
            </Button>
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('phSearchProduct') || 'Search medicines, barcode, formula...'}
        />
        <FilterSelect value={category} onChange={setCategory}>
          <option value="all">{t('phAllCategories') || 'All Categories'}</option>
          {categories.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </FilterSelect>
        <Segmented
          value={stockFilter}
          onChange={v => setStockFilter(v as any)}
          options={STOCK_FILTER_OPTIONS}
        />
      </Toolbar>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <ProductsTable
          products={rows}
          loading={loading}
          onOpenHistory={setDetailTarget}
          onOpenBatches={setBatchTarget}
          onEdit={p => {
            setEditTarget(p)
            setShowForm(true)
          }}
          onDelete={setDeleteTarget}
          t={t}
        />

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            page={page}
            pageCount={pageCount}
            total={total}
            onPage={setPage}
            label={t('phProductsLc') || 'products'}
          />
        </div>
      </div>

      {/* Product Detail & Analytics Modal */}
      {detailTarget && (
        <ProductDetailModal
          product={detailTarget}
          onClose={() => setDetailTarget(null)}
          t={t}
        />
      )}

      {/* Product Create / Edit Modal */}
      {showForm && (
        <ProductFormModal
          initial={editTarget}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            reload()
          }}
          toast={toast}
          t={t}
        />
      )}

      {/* Batch Manager Modal */}
      {batchTarget && (
        <BatchManagerModal
          product={batchTarget}
          onClose={() => {
            setBatchTarget(null)
            reload()
          }}
          toast={toast}
          t={t}
        />
      )}

      {/* Delete / Disable Confirmation Modal */}
      {deleteTarget && (
        <ProductDeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          t={t}
        />
      )}
    </div>
  )
}