import { useState } from 'react'
import { Download } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { downloadCSV } from '../components/_shared'
import { Toolbar, SearchBox, Segmented, Pagination, Button } from '../components/ui'

import { usePharmacySales } from './hooks/usePharmacySales'
import { SalesMetricsBar } from './components/SalesMetricsBar'
import { SalesTable } from './components/SalesTable'
import { SaleDetailModal } from './components/SaleDetailModal'
import { PAYMENT_STATUS_OPTIONS, SALE_STATUS_OPTIONS } from './constants'
import { exportSalesToCSV } from './utils'
import { PharmacySale } from './types'
import { SaleTransactionResult } from '../PharmacyPOS/types'
import { PosReceiptModal } from '../PharmacyPOS/components/PosReceiptModal'

export default function PharmacySales() {
  const toast = useToast()
  const { t } = useLanguage()
  const [selectedSale, setSelectedSale] = useState<PharmacySale | null>(null)
  const [printModalSale, setPrintModalSale] = useState<SaleTransactionResult | null>(null)

  const {
    sales,
    totalCount,
    page,
    pageCount,
    loading,
    search,
    paymentStatus,
    status,
    metrics,
    setPage,
    setSearch,
    setPaymentStatus,
    setStatus,
    reload,
  } = usePharmacySales(toast)

  const handleExportCSV = () => {
    if (sales.length === 0) {
      toast.error('No sales available to export')
      return
    }
    const csvData = exportSalesToCSV(sales)
    downloadCSV(csvData, `pharmacy-sales-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Sales exported successfully')
  }

  const handleOpenReceiptPrint = (s: PharmacySale) => {
    setPrintModalSale({
      id: s.id,
      saleNumber: s.saleNumber,
      items: s.items.map(it => ({
        productId: it.productId,
        name: it.productName,
        unit: it.unit || 'unit',
        subUnit: it.subUnit,
        baseSellingPrice: it.unitPrice,
        saleUnit: it.saleUnit || 'base',
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        stockBase: 100,
      })),
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      amountPaid: s.amountPaid,
      change: Math.max(0, s.amountPaid - s.total),
      paymentMethod: s.paymentMethod as any,
      customer: s.customerName ? { id: s.customerId || '', name: s.customerName } : null,
      createdAt: new Date(s.saleDate).toLocaleString(),
    })
  }

  return (
    <div className="p-4 space-y-4">
      {/* Top Metrics Cards */}
      <SalesMetricsBar metrics={metrics} />

      {/* Filter & Action Toolbar */}
      <Toolbar
        right={
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('phSearchSales') || 'Search sale #, customer, medicine...'}
        />
        <Segmented
          value={paymentStatus}
          onChange={v => setPaymentStatus(v as any)}
          options={PAYMENT_STATUS_OPTIONS}
        />
        <Segmented
          value={status}
          onChange={v => setStatus(v as any)}
          options={SALE_STATUS_OPTIONS}
        />
      </Toolbar>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <SalesTable
          sales={sales}
          loading={loading}
          onSelectSale={setSelectedSale}
          t={t}
        />

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            page={page}
            pageCount={pageCount}
            total={totalCount}
            onPage={setPage}
            label="sales transactions"
          />
        </div>
      </div>

      {/* Sale Detail Drawer / Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onChanged={() => {
            setSelectedSale(null)
            reload()
          }}
          onThermalPrint={handleOpenReceiptPrint}
          toast={toast}
          t={t}
        />
      )}

      {/* Thermal Receipt Print Preview */}
      {printModalSale && (
        <PosReceiptModal
          sale={printModalSale}
          onClose={() => setPrintModalSale(null)}
        />
      )}
    </div>
  )
}