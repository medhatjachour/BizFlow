import { memo } from 'react'
import { Archive, Edit2, Eye, Package } from 'lucide-react'
import type { Product } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProductTableProps {
  products: Product[]
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

function ProductTable({ products, onView, onEdit, onDelete }: Readonly<ProductTableProps>) {
  const { t } = useLanguage()

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: t('outOfStock'), className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' }
    if (stock <= 10) return { label: t('lowStock'), className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' }
    return { label: t('inStock'), className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' }
  }

  if (!products.length) {
    return <div className="rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800"><Package className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-500 dark:text-slate-400">{t('noProductsFound')}</p></div>
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <thead className="border-b border-slate-200/80 bg-slate-50/90 font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">{t('sku')}</th><th className="px-3 py-3 font-semibold">{t('category')}</th><th className="px-3 py-3 font-semibold">{t('price')}</th><th className="px-3 py-3 font-semibold">{t('stock')}</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 text-right font-semibold">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {products.map(product => {
              const stock = product.totalStock || 0
              const status = stockStatus(stock)
              return <tr key={product.id} className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">{product.images?.[0] ? <img src={product.images[0].imageData} alt="" className="h-full w-full object-cover" /> : <Package size={18} className="text-slate-400" />}</div><div><p className="font-semibold text-slate-900 dark:text-white">{product.name}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{product.hasVariants ? `${product.variants?.length || 0} ${t('variants')}` : product.baseBarcode || 'No barcode'}</p></div></div></td>
                <td className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{product.baseSKU}</td><td className="px-3 py-3 text-slate-600 dark:text-slate-300">{product.category || t('uncategorized')}</td><td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">${product.basePrice.toFixed(2)}</td><td className="px-3 py-3 text-slate-700 dark:text-slate-200">{stock}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span></td>
                <td className="px-3 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => onView(product)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white" title={t('view')}><Eye size={16} /></button><button type="button" onClick={() => onEdit(product)} className="grid h-8 w-8 place-items-center rounded-lg text-primary transition hover:bg-primary/10" title={t('edit')}><Edit2 size={16} /></button><button type="button" onClick={() => onDelete(product)} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title={t('archive')}><Archive size={16} /></button></div></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(ProductTable)