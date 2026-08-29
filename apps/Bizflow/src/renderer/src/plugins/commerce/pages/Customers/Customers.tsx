import { Plus, Download, FileSpreadsheet, FileText, User, Heart, ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { useCustomers } from './hooks/useCustomers'
import { CustomerCard } from './components/CustomerCard'
import { CustomerForm } from './components/CustomerForm'
import { CustomerStatsCards } from './components/CustomerStatsCards'
import { CustomerSearchBar } from './components/CustomerSearchBar'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Modal from '@renderer/components/ui/Modal'
import SmartDeleteDialog from '@renderer/components/SmartDeleteDialog'
import { InstallmentManager } from '@renderer/components/InstallmentManager'

export default function Customers(): JSX.Element {
  const { t } = useLanguage()
  const ctx = useCustomers()

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text">
            {t('customerManagement')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('manageCustomerRelationships')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export dropdown */}
          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => ctx.setShowExportDropdown(!ctx.showExportDropdown)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))
                  ctx.setShowExportDropdown(false)
              }}
              aria-expanded={ctx.showExportDropdown}
              aria-haspopup="true"
            >
              <Download size={20} />
              {t('export')}
            </button>
            {ctx.showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-10" role="menu">
                {([
                  { fmt: 'excel' as const, icon: <FileSpreadsheet size={18} className="text-green-600" />, label: `${t('excel')} (.xlsx)` },
                  { fmt: 'csv'   as const, icon: <FileText        size={18} className="text-blue-600"  />, label: `${t('csv')} (.csv)`   },
                  { fmt: 'vcf'   as const, icon: <User            size={18} className="text-purple-600"/>, label: `${t('vcard')} (.vcf)` }
                ]).map(({ fmt, icon, label }, i, arr) => (
                  <button
                    key={fmt}
                    onClick={() => { ctx.handleExport(fmt); ctx.setShowExportDropdown(false) }}
                    onKeyDown={(e) => { if (e.key === 'Escape') ctx.setShowExportDropdown(false) }}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${i === 0 ? 'rounded-t-lg' : ''} ${i === arr.length - 1 ? 'rounded-b-lg' : ''}`}
                    role="menuitem"
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => ctx.setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            {t('addNewCustomer')}
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <CustomerStatsCards
        totalCount={ctx.totalCount}
        totalRevenue={ctx.totalRevenue}
        averageSpent={ctx.averageSpent}
      />

      {/* ── Search + Pagination ────────────────────────────────────────── */}
      <CustomerSearchBar
        searchQuery={ctx.searchQuery}
        onSearchChange={ctx.setSearchQuery}
        pageSize={ctx.pageSize}
        onPageSizeChange={(size) => { ctx.setPageSize(size); ctx.setPage(0) }}
        page={ctx.page}
        totalCount={ctx.totalCount}
        totalPages={ctx.totalPages}
        startIndex={ctx.startIndex}
        endIndex={ctx.endIndex}
        hasMore={ctx.hasMore}
        onPageChange={ctx.setPage}
      />

      {/* ── Customer Grid ──────────────────────────────────────────────── */}
      {ctx.loading ? (
        <div className="glass-card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingCustomers')}</p>
        </div>
      ) : ctx.customers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Heart size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {ctx.debouncedSearch ? t('noCustomersFound') : t('noCustomersYet')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {ctx.debouncedSearch ? t('tryDifferentSearch') : t('addFirstCustomer')}
          </p>
          {!ctx.debouncedSearch && (
            <button onClick={() => ctx.setShowAddModal(true)} className="btn-primary">
              <Plus size={20} className="inline mr-2" />
              {t('addNewCustomer')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ctx.customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={ctx.openEditModal}
              onDelete={ctx.handleDeleteCustomer}
            />
          ))}
        </div>
      )}

      {/* ── Add Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={ctx.showAddModal} onClose={ctx.closeAddModal} title={t('addNewCustomer')}>
        <CustomerForm
          formData={ctx.formData}
          onChange={ctx.setFormData}
          mode="add"
          onSubmit={ctx.handleAddCustomer}
          onCancel={ctx.closeAddModal}
        />
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={ctx.showEditModal} onClose={ctx.closeEditModal} title={t('updateCustomer')}>
        <CustomerForm
          formData={ctx.formData}
          onChange={ctx.setFormData}
          mode="edit"
          onSubmit={ctx.handleEditCustomer}
          onCancel={ctx.closeEditModal}
        />
      </Modal>

      {/* ── Purchase History Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={ctx.showHistoryModal}
        onClose={() => { ctx.setShowHistoryModal(false); ctx.setSelectedCustomer(null); ctx.setSelectedCustomerHistory([]) }}
        title={`${t('purchaseHistory')} - ${ctx.selectedCustomer?.name}`}
      >
        <div className="space-y-4">
          {ctx.selectedCustomerHistory.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart size={48} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">{t('noPurchasesYet')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ctx.selectedCustomerHistory.map((transaction: any) => (
                <div key={transaction.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${transaction.status === 'completed' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                      {transaction.status}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {transaction.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{item.quantity}x {item.product.name}</span>
                        <span className="font-medium text-slate-900 dark:text-white">${item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{transaction.paymentMethod.toUpperCase()}</span>
                    <span className="text-lg font-bold text-primary">${transaction.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalPurchases')}</p>
              <p className="text-2xl font-bold text-primary">
                {ctx.selectedCustomer ? formatCurrency(ctx.selectedCustomer.totalSpent) : '$0.00'}
              </p>
            </div>
            <button
              onClick={() => { ctx.setShowHistoryModal(false); ctx.setSelectedCustomer(null); ctx.setSelectedCustomerHistory([]) }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Smart Delete Dialog ────────────────────────────────────────── */}
      <SmartDeleteDialog
        isOpen={ctx.showDeleteDialog}
        onClose={ctx.closeDeleteDialog}
        entityType="customer"
        entityName={ctx.customerToDelete?.name || ''}
        checkResult={ctx.deleteCheckResult}
        onDelete={ctx.handleConfirmDelete}
        onArchive={ctx.handleArchiveCustomer}
      />

      {/* ── Installment Manager ────────────────────────────────────────── */}
      {ctx.showInstallmentManager && ctx.selectedCustomerForInstallments && (
        <InstallmentManager
          isOpen={ctx.showInstallmentManager}
          onClose={() => { ctx.setShowInstallmentManager(false); ctx.setSelectedCustomerForInstallments(null) }}
          customerId={ctx.selectedCustomerForInstallments.id}
          customerName={ctx.selectedCustomerForInstallments.name}
        />
      )}
    </div>
  )
}
