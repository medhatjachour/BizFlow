import { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV, pharma } from '../components/_shared'
import { Toolbar, SearchBox, Button, Pagination } from '../components/ui'

import { usePharmacyCustomers } from './hooks/usePharmacyCustomers'
import { CustomerMetricsBar } from './components/CustomerMetricsBar'
import { CustomersGrid } from './components/CustomersGrid'
import { CustomerFormModal } from './components/CustomerFormModal'
import { CustomerProfileModal } from './components/CustomerProfileModal'
import { CustomerDeleteModal } from './components/CustomerDeleteModal'
import { exportCustomersToCSV } from './utils'
import { PharmacyCustomerItem } from './types'

export default function PharmacyCustomers() {
  const toast = useToast()
  const { t } = useLanguage()

  const [editTarget, setEditTarget] = useState<PharmacyCustomerItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PharmacyCustomerItem | null>(null)

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
  } = usePharmacyCustomers(toast)

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error('No customer records available to export')
      return
    }
    const csvData = exportCustomersToCSV(rows)
    downloadCSV(csvData, `pharmacy-customers-ledger-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Customer ledger exported successfully')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await pharma()?.customers.delete(deleteTarget.id)
      toast.success(t('phCustomerDeleted') || 'Customer deleted')
      setDeleteTarget(null)
      reload()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top Overview Metrics */}
      <CustomerMetricsBar metrics={metrics} />

      {/* Action & Filter Toolbar */}
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
              {t('phAddCustomer') || 'Add Customer'}
            </Button>
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('phSearchCustomers') || 'Search customers by name or phone...'}
        />
      </Toolbar>

      {/* Grid Container */}
      <div className="space-y-3">
        <CustomersGrid
          customers={pagedRows}
          loading={loading}
          onSelectCustomer={setActiveProfileId}
          onEdit={c => {
            setEditTarget(c)
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
              label={t('phCustomers') || 'customers'}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Customer Modal */}
      {showForm && (
        <CustomerFormModal
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

      {/* Customer Full Profile & Ledger Modal */}
      {activeProfileId && (
        <CustomerProfileModal
          customerId={activeProfileId}
          onClose={() => setActiveProfileId(null)}
          onChanged={reload}
          toast={toast}
          t={t}
        />
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteTarget && (
        <CustomerDeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          t={t}
        />
      )}
    </div>
  )
}