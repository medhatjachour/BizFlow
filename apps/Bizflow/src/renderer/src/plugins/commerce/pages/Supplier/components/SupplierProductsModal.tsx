import React, { useState } from 'react'
import { X, Package, Plus, Trash2, Star } from 'lucide-react'
import { formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SupplierResponseDTO, SupplierProductResponseDTO, ProductResponseDTO } from '../types'
import { AddSupplierProductModal } from './AddSupplierProductModal'

interface SupplierProductsModalProps {
  supplier: SupplierResponseDTO | null
  products: SupplierProductResponseDTO[]
  allProducts: ProductResponseDTO[]
  loading: boolean
  onClose: () => void
  onAddProduct: (payload: any) => Promise<boolean>
  onRemoveProduct: (supplierProductId: string) => void
}

export const SupplierProductsModal: React.FC<SupplierProductsModalProps> = ({
  supplier,
  products,
  allProducts,
  loading,
  onClose,
  onAddProduct,
  onRemoveProduct
}) => {
  const { t } = useLanguage()
  const [showAddModal, setShowAddModal] = useState(false)

  if (!supplier) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          role="dialog"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {supplier.name} — {t('catalogItems') || 'Catalog Items'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  
                  {t('manageNegotiatedPurchaseUnitCosts') || 'Manage negotiated purchase unit costs, lead times, and preferred vendor mappings.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('linkProduct') || 'Link Product'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">{t('retrievingLinkedSKUs') || 'Retrieving linked SKUs...'}</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('noSKUsMappedYet') || 'No SKUs mapped yet'}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  {t('attachProductsToEstablishCosts') || 'Attach products that this supplier supplies to establish automated purchase order costs.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="px-3.5 py-2.5 text-start">{t('productSKU') || 'Product / SKU'}</th>
                      <th className="px-3.5 py-2.5 text-end">{t('negotiatedCost') || 'Negotiated Cost'}</th>
                      <th className="px-3.5 py-2.5 text-center">{t('leadTime') || 'Lead Time'}</th>
                      <th className="px-3.5 py-2.5 text-center">{t('minQty') || 'Min Qty'}</th>
                      <th className="px-3.5 py-2.5 text-end">{t('action') || 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {products.map((sp) => (
                      <tr key={sp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 text-start">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{sp.productName}</span>
                            {sp.isPreferred && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 font-bold">
                                <Star className="w-2.5 h-2.5 fill-current" /> {t('preferred') || 'PREFERRED'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            SKU: {sp.productSKU || sp.sku || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-end font-mono font-bold text-slate-900 dark:text-emerald-400">
                          {formatCurrency(sp.cost)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-slate-600 dark:text-slate-300">
                          {sp.leadTime ? `${sp.leadTime} days` : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                          {sp.minOrderQty || 1}
                        </td>
                        <td className="px-3.5 py-2.5 text-end">
                          <button
                            type="button"
                            onClick={() => onRemoveProduct(sp.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Unlink Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/60 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 transition-colors"
            >
              {t('confirm') || 'Done'}
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddSupplierProductModal
          isOpen={showAddModal}
          allProducts={allProducts}
          alreadyLinkedProductIds={products.map((p) => p.productId)}
          onClose={() => setShowAddModal(false)}
          onAdd={async (payload) => {
            const success = await onAddProduct(payload)
            if (success) setShowAddModal(false)
          }}
        />
      )}
    </>
  )
}