import { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV, pharma } from '../components/_shared'
import { Toolbar, SearchBox, Button, Pagination } from '../components/ui'

import { usePharmacySuppliers } from './hooks/usePharmacySuppliers'
import { SuppliersMetricsBar } from './components/SuppliersMetricsBar'
import { SuppliersGrid } from './components/SuppliersGrid'
import { SupplierFormModal } from './components/SupplierFormModal'
import { SupplierDeleteModal } from './components/SupplierDeleteModal'
import { exportSuppliersToCSV } from './utils'
import { PharmacySupplierItem } from './types'

export default function PharmacySuppliers() {
  const toast = useToast()
  const { t } = useLanguage()

  const [editTarget, setEditTarget] = useState<PharmacySupplierItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PharmacySupplierItem | null>(null)

  const {
    rows,
    pagedRows,
    totalCount,
    page,
    pageCount,
    loading,
    search,
    metrics,
    setPage,
    setSearch,
    reload,
  } = usePharmacySuppliers(toast)

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error('No supplier records available to export')
      return
    }
    const csvData = exportSuppliersToCSV(rows)
    downloadCSV(csvData, `pharmacy-suppliers-directory-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Supplier directory exported successfully')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await pharma()?.suppliers.delete(deleteTarget.id)
      toast.success(t('phSupplierDeleted') || 'Supplier deleted')
      setDeleteTarget(null)
      reload()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top Overview Metrics */}
      <SuppliersMetricsBar metrics={metrics} />

      {/* Action & Search Toolbar */}
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
              {t('phAddSupplier') || 'Add Supplier'}
            </Button>
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('phSearchSuppliers') || 'Search suppliers by name, phone, or email...'}
        />
      </Toolbar>

      {/* Suppliers Grid View */}
      <div className="space-y-3">
        <SuppliersGrid
          suppliers={pagedRows}
          loading={loading}
          onEdit={s => {
            setEditTarget(s)
            setShowForm(true)
          }}
          onDelete={setDeleteTarget}
          t={t}
        />

        {!loading && rows.length > 0 && (
          <div className="pt-2">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={totalCount}
              onPage={setPage}
              label={t('phSuppliers') || 'suppliers'}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Supplier Modal */}
      {showForm && (
        <SupplierFormModal
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            reload()
          }}
          toast={toast}
          t={t}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <SupplierDeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          t={t}
        />
      )}
    </div>
  )
}