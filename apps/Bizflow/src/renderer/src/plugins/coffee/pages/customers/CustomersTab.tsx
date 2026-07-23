import { useState, useCallback } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useCustomers, useCustomerProfile } from './hooks/useCustomers'
import { exportCustomersToCSV } from './utils'
import { CustomersToolbar } from './components/CustomersToolbar'
import { CustomerRow } from './components/CustomerRow'
import { CustomerModal } from './components/CustomerModal'
import { CustomerDrawer } from './components/CustomerDrawer'
import { EmptyState } from './components/EmptyState'
import { Pagination } from './components/Pagination'
import { PAGE_SIZE } from './constants'
import type { Customer, CustomerFilters, CustomerDetail } from './types'

export default function CustomersTab() {
  const { t } = useLanguage()
  
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    sort: 'recent'
  })

  const { 
    customers, loading, page, totalPages, total,
    setPage, createCustomer, updateCustomer, deleteCustomer 
  } = useCustomers(filters)

  const { profile, loading: loadingProfile, loadProfile, clearProfile } = useCustomerProfile()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | CustomerDetail | null>(null)

  const updateFilters = useCallback((patch: Partial<CustomerFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }))
  }, [])

  const handleOpenCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (c: Customer | CustomerDetail) => {
    setEditTarget(c)
    setModalOpen(true)
  }

  const handleSave = async (data: any, id?: string) => {
    if (id) {
      await updateCustomer(id, data)
    } else {
      await createCustomer(data)
    }
  }

  const handleDelete = async (c: Customer) => {
    await deleteCustomer(c.id)
  }

  const handleExport = () => {
    exportCustomersToCSV(customers, `customers-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleViewProfile = (id: string) => {
    loadProfile(id)
  }

  const handleEditFromProfile = (c: CustomerDetail) => {
    clearProfile()
    handleOpenEdit(c)
  }

  return (
    <div className="p-6 mx-auto">

      {/* Toolbar */}
      <CustomersToolbar
        filters={filters}
        onChange={updateFilters}
        onAdd={handleOpenCreate}
        onExport={handleExport}
      />

      {/* List Container */}
      <div className="bg-white dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {customers.length === 0 ? (
          <EmptyState loading={loading} search={filters.search} />
        ) : (
          <>
            {customers.map(customer => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onView={handleViewProfile}
              />
            ))}
            <div className="p-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Modals & Drawers */}
      <CustomerModal
        open={modalOpen}
        editTarget={editTarget as Customer | null}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <CustomerDrawer
        profile={profile}
        loading={loadingProfile}
        onClose={clearProfile}
        onEdit={handleEditFromProfile}
      />
    </div>
  )
}
