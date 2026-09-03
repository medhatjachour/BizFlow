/**
 * ProductActions Component
 * Toolbar with action buttons for product management
 */

import { memo } from 'react'
import { Plus, Upload, Download, Barcode, RefreshCcw, Grid2X2, List } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProductActionsProps {
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  onScan: () => void
  onRefresh: () => void
  productsCount: number
  view: 'grid' | 'table'
  onViewChange: (view: 'grid' | 'table') => void
}

function ProductActions({
  onAdd,
  onImport,
  onExport,
  onScan,
  onRefresh,
  productsCount,
  view,
  onViewChange
}: Readonly<ProductActionsProps>) {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs shadow-primary/20">
          <Barcode className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t('productCatalog')}</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('manageInventory')} · {productsCount} {t('productsCount')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-slate-200/60 bg-slate-100 p-0.5 dark:border-slate-700/60 dark:bg-slate-800/90">
          <button type="button" onClick={() => onViewChange('grid')} className={`grid h-7 w-7 place-items-center rounded-md transition-all ${view === 'grid' ? 'bg-white text-primary shadow-2xs dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'}`} aria-label="Grid view" title="Grid cards"><Grid2X2 size={14} /></button>
          <button type="button" onClick={() => onViewChange('table')} className={`grid h-7 w-7 place-items-center rounded-md transition-all ${view === 'table' ? 'bg-white text-primary shadow-2xs dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'}`} aria-label="Table view" title="Dense table"><List size={15} /></button>
        </div>
        <button
          onClick={onRefresh}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title={t('refreshProducts')}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onScan}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title={t('scanBarcode')}
        >
          <Barcode className="w-4 h-4" />
        </button>

        <button
          onClick={onImport}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title={t('importProducts')}
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={onExport}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title={t('exportProducts')}
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onAdd}
          className="btn-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs shadow-xs shadow-primary/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addProduct')}</span>
        </button>
      </div>
    </div>
  )
}

export default memo(ProductActions)
