/**
 * ProductActions Component
 * Toolbar with action buttons for product management
 */

import { memo } from 'react'
import { Plus, Upload, Download, Barcode, RefreshCcw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProductActionsProps {
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  onScan: () => void
  onRefresh: () => void
  productsCount: number
}

function ProductActions({
  onAdd,
  onImport,
  onExport,
  onScan,
  onRefresh,
  productsCount
}: Readonly<ProductActionsProps>) {
  const { t } = useLanguage()
  
  return (
    <div className="w-full flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {t('productCatalog')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('manageInventory')} • {productsCount} {t('productsCount')}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          title={t('refreshProducts')}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onScan}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          title={t('scanBarcode')}
        >
          <Barcode className="w-4 h-4" />
          <span className="hidden md:inline">{t('scan')}</span>
        </button>

        <button
          onClick={onImport}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          title={t('importProducts')}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">{t('import')}</span>
        </button>

        <button
          onClick={onExport}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          title={t('exportProducts')}
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">{t('export')}</span>
        </button>

        <button
          onClick={onAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>{t('addProduct')}</span>
        </button>
      </div>
    </div>
  )
}

export default memo(ProductActions)
