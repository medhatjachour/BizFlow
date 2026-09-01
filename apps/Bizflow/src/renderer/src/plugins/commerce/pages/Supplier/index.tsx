  import { useState, useEffect } from 'react'
  import { Users, ShoppingBag, Repeat } from 'lucide-react'
  import { useLanguage } from '@renderer/contexts/LanguageContext'
  import { useSuppliers } from './hooks/useSuppliers'
  import { usePurchaseOrders } from './hooks/usePurchaseOrders'
  import { SuppliersStats } from './components/SuppliersStats'
  import { SupplierFilters } from './components/SupplierFilters'
  import { SuppliersTable } from './components/SuppliersTable'
  import { SupplierModal } from './components/SupplierModal'
  import { SupplierProductsModal } from './components/SupplierProductsModal'
  import { PurchaseOrdersTable } from './components/PurchaseOrdersTable'
  import { PurchaseOrderModal } from './components/PurchaseOrderModal'
  import { ReceiveOrderModal } from './components/ReceiveOrderModal'
  import type { PrefilledPurchaseOrder, SupplierTab } from './types'
  import ReorderAlerts from './components/ReorderAlerts'

  export default function SuppliersModule() {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<SupplierTab>('suppliers')

    // Supplier domain hook
    const {
      suppliers,
      rawSuppliers,
      loading: loadingSuppliers,
      filters: supplierFilters,
      setFilters: setSupplierFilters,
      stats: supplierStats,
      showSupplierModal,
      setShowSupplierModal,
      editingSupplier,
      formData: supplierFormData,
      setFormData: setSupplierFormData,
      openCreateModal: openCreateSupplier,
      openEditModal: openEditSupplier,
      saveSupplier,
      toggleSupplierStatus,
      viewingSupplier,
      setViewingSupplier,
      supplierProducts,
      loadingProducts,
      loadSupplierProducts,
      addProductToSupplier,
      removeProductFromSupplier,
      refetch: refetchSuppliers
    } = useSuppliers()

    // Purchase Order domain hook
    const {
      orders,
      products,
      activeSupplierProducts,
      loading: loadingPOs,
      filters: poFilters,
      setFilters: setPOFilters,
      showPOModal,
      setShowPOModal,
      showReceiveModal,
      setShowReceiveModal,
      selectedOrder,
      setSelectedOrder,
      formData: poFormData,
      setFormData: setPOFormData,
      openCreatePO,
      createOrder,
      updateOrderStatus,
      receiveOrder,
      deleteOrder,
      refetch: refetchPOs
    } = usePurchaseOrders()

    // Handler for creating purchase order from reorder alert
    const handleCreatePurchaseOrderFromAlert = (alertData: PrefilledPurchaseOrder) => {
      const supplierId =
        alertData.supplierInfo?.supplierId ||
        rawSuppliers.find(
          (supplier) =>
            supplier.name.toLowerCase() === alertData.supplierInfo?.supplierName.toLowerCase()
        )?.id ||
        ''

      setPOFormData({
        supplierId,
        expectedDate: '',
        taxAmount: 0,
        shippingCost: 0,
        notes: `Reorder for ${alertData.productName}${
          alertData.variantName && alertData.variantName !== 'Default'
            ? ` (${alertData.variantName})`
            : ''
        } - Low stock alert`,
        items: [
          {
            productId: alertData.productId,
            variantId: alertData.variantId,
            quantity: alertData.suggestedQty,
            unitCost: alertData.supplierInfo?.cost || 0
          }
        ]
      })
      setActiveTab('purchase-orders')
      setShowPOModal(true)
    }
    // Keyboard shortcut: Ctrl + N / Cmd + N to trigger creation modal
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault()
          if (activeTab === 'suppliers') {
            openCreateSupplier()
          } else {
            openCreatePO()
          }
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeTab, openCreateSupplier, openCreatePO])

    return (
      <div className="w-full space-y-4 pb-12 animate-in fade-in duration-150">
        {/* Top Header & Sub-Navigation Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {t('suppliersAndVendors') || 'Suppliers & Procurement'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('manageVendorsDescription') || 'Manage vendor ledgers, catalog price matrices, and purchase restocking orders.'}
              </p>
            </div>
          </div>

          {/* Tab switch buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('suppliersList') || 'Vendor Accounts'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reorders')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'reorders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{t('reorders') || 'Reorders'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('purchase-orders')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'purchase-orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('purchaseOrders') || 'Purchase Invoices'}</span>
            </button>
          </div>
        </div>

        {/* Main Tab Viewports */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <SuppliersStats
              totalSuppliers={supplierStats.totalSuppliers}
              activeSuppliers={supplierStats.activeSuppliers}
              totalOrders={supplierStats.totalOrders}
              totalSpend={supplierStats.totalSpend}
            />

            <SupplierFilters
              filters={supplierFilters}
              onChange={setSupplierFilters}
              onAddSupplier={openCreateSupplier}
              onRefresh={refetchSuppliers}
            />

            <SuppliersTable
              suppliers={suppliers}
              loading={loadingSuppliers}
              onEdit={openEditSupplier}
              onToggleStatus={toggleSupplierStatus}
              onViewProducts={(s) => {
                setViewingSupplier(s)
                loadSupplierProducts(s.id)
              }}
              onOpenCreatePO={(sId) => {
                setActiveTab('purchase-orders')
                openCreatePO(sId)
              }}
            />
          </div>
        )}
        {/* Main Tab Viewports */}
        {activeTab === 'reorders' && (
          <div className="space-y-4">
            <ReorderAlerts onCreatePurchaseOrder={handleCreatePurchaseOrderFromAlert} />
          </div>
        )}
        {activeTab === 'purchase-orders' && (
          <div className="space-y-4">
            <PurchaseOrdersTable
              orders={orders}
              loading={loadingPOs}
              filters={poFilters}
              setFilters={setPOFilters}
              onOpenCreatePO={() => openCreatePO()}
              onReceivePO={(po) => {
                setSelectedOrder(po)
                setShowReceiveModal(true)
              }}
              onUpdateStatus={updateOrderStatus}
              onDeletePO={deleteOrder}
              onRefresh={refetchPOs}
            />
          </div>
        )}

        {/* Modals Container */}
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          formData={supplierFormData}
          setFormData={setSupplierFormData}
          onClose={() => setShowSupplierModal(false)}
          onSave={saveSupplier}
        />

        <SupplierProductsModal
          supplier={viewingSupplier}
          products={supplierProducts}
          allProducts={products}
          loading={loadingProducts}
          onClose={() => setViewingSupplier(null)}
          onAddProduct={async (payload) => {
            if (!viewingSupplier) return false
            return addProductToSupplier(viewingSupplier.id, payload)
          }}
          onRemoveProduct={(spId) => {
            if (viewingSupplier) removeProductFromSupplier(spId, viewingSupplier.id)
          }}
        />

        <PurchaseOrderModal
          isOpen={showPOModal}
          formData={poFormData}
          setFormData={setPOFormData}
          suppliers={rawSuppliers}
          products={products}
          supplierProducts={activeSupplierProducts}
          onClose={() => setShowPOModal(false)}
          onSubmit={createOrder}
        />

        <ReceiveOrderModal
          isOpen={showReceiveModal}
          order={selectedOrder}
          onClose={() => {
            setShowReceiveModal(false)
            setSelectedOrder(null)
          }}
          onConfirm={async () => {
            if (!selectedOrder) return false
            return receiveOrder(selectedOrder.id)
          }}
        />
      </div>
    )
  }
