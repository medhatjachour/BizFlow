import { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV, pharma } from '../components/_shared'
import { Toolbar, SearchBox, Segmented, Button } from '../components/ui'

import { usePurchaseOrders } from './hooks/usePurchaseOrders'
import { PurchaseOrdersMetricsBar } from './components/PurchaseOrdersMetricsBar'
import { PurchaseOrdersTable } from './components/PurchaseOrdersTable'
import { PurchaseOrderModal } from './components/PurchaseOrderModal'
import { ReceiveScanModal } from './components/ReceiveScanModal'
import { PurchaseOrderDeleteModal } from './components/PurchaseOrderDeleteModal'
import { PO_STATUS_OPTIONS } from './constants'
import { exportPurchaseOrdersToCSV } from './utils'
import { PurchaseOrderItem } from './types'

export default function PharmacyPurchaseOrders() {
  const toast = useToast()
  const { t } = useLanguage()

  const [editOrderTarget, setEditOrderTarget] = useState<PurchaseOrderItem | null | 'new'>(null)
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderItem | null>(null)

  const {
    orders,
    loading,
    search,
    status,
    metrics,
    setSearch,
    setStatus,
    reload,
  } = usePurchaseOrders(toast)

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error('No purchase orders available to export')
      return
    }
    const csvData = exportPurchaseOrdersToCSV(orders)
    downloadCSV(csvData, `pharmacy-purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Purchase orders exported successfully')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await pharma()?.purchaseOrders.delete(deleteTarget.id)
      toast.success(t('phOrderDeleted') || 'Order deleted')
      setDeleteTarget(null)
      reload()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top Metrics Cards */}
      <PurchaseOrdersMetricsBar metrics={metrics} />

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
              onClick={() => setEditOrderTarget('new')}
            >
              {t('phNewOrder') || 'New Order'}
            </Button>
          </div>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search PO #, supplier name, notes..."
        />
        <Segmented
          value={status}
          onChange={v => setStatus(v as any)}
          options={PO_STATUS_OPTIONS}
        />
      </Toolbar>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <PurchaseOrdersTable
          orders={orders}
          loading={loading}
          onReceive={setReceiveTarget}
          onEdit={setEditOrderTarget}
          onDelete={setDeleteTarget}
        />
      </div>

      {/* Create / Edit Purchase Order Modal */}
      {editOrderTarget && (
        <PurchaseOrderModal
          order={editOrderTarget === 'new' ? null : editOrderTarget}
          onClose={() => setEditOrderTarget(null)}
          onSaved={() => {
            setEditOrderTarget(null)
            reload()
          }}
          toast={toast}
          t={t}
        />
      )}

      {/* Barcode-First Receive Scan Verification Modal */}
      {receiveTarget && (
        <ReceiveScanModal
          order={receiveTarget}
          onClose={() => setReceiveTarget(null)}
          onReceived={() => {
            setReceiveTarget(null)
            reload()
          }}
          toast={toast}
          t={t}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <PurchaseOrderDeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}