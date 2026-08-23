import React, { useState, useEffect } from 'react'
import { Loader2, History } from 'lucide-react'
import { PharmacyProductItem, ProductDetailData } from '../types'
import { pharma, money, expiryTone } from '../../components/_shared'
import { Modal } from '../../components/ui'
import { computeExpiryDays } from '../utils'

interface ProductDetailModalProps {
  product: PharmacyProductItem
  onClose: () => void
  t: (k: string) => string
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, t }) => {
  const [data, setData] = useState<ProductDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline' | 'batches'>('timeline')

  useEffect(() => {
    let active = true
    pharma()
      ?.products.getHistory(product.id, { take: 100 })
      .then((res: any) => {
        if (active) setData(res)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [product.id])

  const stats = data?.stats
  const kpiItems = stats
    ? [
        { label: 'Current Stock', value: `${stats.currentStock} ${data?.product?.unit || product.unit}`, color: 'text-slate-800 dark:text-slate-100' },
        { label: 'Asset Value', value: `$${money(stats.stockValue)}`, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Sold Units', value: `${stats.soldUnits}`, sub: `${stats.saleCount} sales transactions`, color: 'text-violet-600 dark:text-violet-400' },
        { label: 'Total Revenue', value: `$${money(stats.revenue)}`, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Net Profit', value: `$${money(stats.profit)}`, sub: `${stats.margin}% margin`, color: stats.profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
        { label: 'Active Batches', value: `${stats.activeBatches}/${stats.batchCount}`, color: 'text-slate-600 dark:text-slate-300' },
      ]
    : []

  const EVENT_BADGES: Record<string, { color: string; sign: string; label: string }> = {
    received: { color: 'text-emerald-600 dark:text-emerald-400', sign: '+', label: 'Received' },
    sold: { color: 'text-blue-600 dark:text-blue-400', sign: '−', label: 'Sold' },
    disposed: { color: 'text-red-500', sign: '−', label: 'Disposed' },
    edited: { color: 'text-amber-600 dark:text-amber-400', sign: '', label: 'Edited' },
  }

  return (
    <Modal
      title={product.name}
      subtitle={`${product.category || 'General'}${product.barcode ? ` · Barcode: ${product.barcode}` : ''}`}
      icon={History}
      size="lg"
      onClose={onClose}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
          <p className="text-xs">Loading product analytics...</p>
        </div>
      ) : !data ? (
        <p className="text-xs text-slate-400 text-center py-16">Failed to load analytics for this product.</p>
      ) : (
        <div className="p-5 space-y-4 text-xs">
          {/* KPI Dashboard Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {kpiItems.map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{k.label}</p>
                <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Segmented View Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Stock Movements & Logs
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'batches'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Batch Breakdown
            </button>
          </div>

          {activeTab === 'timeline' ? (
            <div className="space-y-1.5 max-h-[36vh] overflow-y-auto pr-1">
              {data.events.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No inventory events logged yet.</p>
              ) : (
                data.events.map((e, i) => {
                  const meta = EVENT_BADGES[e.type] ?? EVENT_BADGES.sold
                  const isStockAdjust = e.action === 'adjust_stock'

                  return (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <span className={`font-bold w-16 shrink-0 ${meta.color}`}>
                        {isStockAdjust ? 'Adjusted' : meta.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {e.type === 'sold'
                            ? `Sale #${e.saleNumber ?? ''}${e.customer ? ` · ${e.customer}` : ''}`
                            : e.type === 'received'
                            ? `Batch #${e.batchNumber ?? ''}`
                            : e.reason || 'Inventory adjustment'}
                        </p>
                        {e.userName && <p className="text-[10px] text-slate-400 mt-0.5">By: {e.userName}</p>}
                        <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString()}</p>
                      </div>
                      {e.qty != null && (
                        <span className={`font-bold tabular-nums shrink-0 ${meta.color}`}>
                          {meta.sign}{e.qty}
                        </span>
                      )}
                      {e.value != null && (
                        <span className="text-slate-400 font-medium tabular-nums w-16 text-right shrink-0">
                          ${money(e.value)}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                    <th className="py-2">Batch #</th>
                    <th className="py-2 text-right">Available Qty</th>
                    <th className="py-2 text-right">Cost Price</th>
                    <th className="py-2">Expiry Date</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.batches.map(b => {
                    const days = computeExpiryDays(b.expiryDate)
                    return (
                      <tr key={b.id}>
                        <td className="py-2 font-mono font-medium">{b.batchNumber || '—'}</td>
                        <td className="py-2 text-right font-bold">{b.quantity} / {b.initialQty ?? b.quantity}</td>
                        <td className="py-2 text-right">${money(b.costPerUnit)}</td>
                        <td className="py-2">
                          <span className={days !== null ? expiryTone(days) : ''}>
                            {new Date(b.expiryDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2 capitalize font-semibold text-slate-500">{b.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}