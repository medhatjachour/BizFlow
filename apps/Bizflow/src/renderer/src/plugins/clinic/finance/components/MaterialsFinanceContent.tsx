import React from 'react'
import {
  Package2,
  TrendingDown,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatMoney, formatCount } from '../utils'
import type { MatFinanceSummary } from '../types'

interface Props {
  matFinance: MatFinanceSummary | null
  loading: boolean
}

export const MaterialsFinanceContent: React.FC<Props> = ({ matFinance, loading }) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!matFinance) return null

  return (
    <div className="space-y-5">
      {/* 4 Financial Valuation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inventory Value */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-2xl text-teal-600">
              <Package2 size={16} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('matInventoryValue') || 'Asset Inventory Value'}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            ${formatMoney(matFinance.inventoryValue)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {t('matCurrentStock') || 'Valuation based on unit costs'}
          </p>
        </div>

        {/* Materials Spend */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-2xl text-rose-600">
              <TrendingDown size={16} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('matPeriodSpend') || 'Supplies Period Spend'}
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            ${formatMoney(matFinance.totalMaterialExpenses)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {t('matPurchasesLogged') || 'Purchases recorded in period'}
          </p>
        </div>

        {/* Material Losses */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600">
              <AlertCircle size={16} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('matLosses') || 'Material Losses & Waste'}
            </span>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            ${formatMoney(matFinance.lossAmount)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {t('matWastedWritten') || 'Damaged or spilled supplies'}
          </p>
        </div>

        {/* Expiry Write-offs */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-2xl text-rose-600">
              <Clock size={16} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('matExpiryWriteoffs') || 'Expiry Write-offs'}
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            ${formatMoney(matFinance.expiryAmount)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {t('matExpiredItems') || 'Expired inventory disposed'}
          </p>
        </div>
      </div>

      {/* Inventory Health Matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          {t('matInventoryHealth') || 'Inventory Health & Expiry Risk Assessment'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="text-center p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCount(matFinance.totalMaterials)}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{t('matTotalMaterials') || 'Tracked Materials'}</p>
          </div>

          <div
            className={`text-center p-3.5 rounded-2xl border ${
              matFinance.lowStockCount > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
            }`}
          >
            <p
              className={`text-2xl font-extrabold ${
                matFinance.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatCount(matFinance.lowStockCount)}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{t('matLowStock') || 'Low Stock Alerts'}</p>
          </div>

          <div
            className={`text-center p-3.5 rounded-2xl border ${
              matFinance.expiredCount > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
            }`}
          >
            <p
              className={`text-2xl font-extrabold ${
                matFinance.expiredCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatCount(matFinance.expiredCount)}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{t('matExpired') || 'Expired Batches'}</p>
          </div>

          <div
            className={`text-center p-3.5 rounded-2xl border ${
              matFinance.expiringSoonCount > 0
                ? 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
            }`}
          >
            <p
              className={`text-2xl font-extrabold ${
                matFinance.expiringSoonCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatCount(matFinance.expiringSoonCount)}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{t('matExpiringSoon') || 'Expiring <30 Days'}</p>
          </div>
        </div>
      </div>

      {/* Spend Breakdown & Top Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spend Category Share */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            {t('matSpendBreakdown') || 'Materials Cost Composition'}
          </h3>

          {matFinance.totalMaterialExpenses === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              {t('noDataAvailable') || 'No material expenses logged for this period'}
            </p>
          ) : (
            <div className="space-y-3">
              {[
                { label: t('matMedicalSupplies') || 'Medical & Dental Supplies', amount: matFinance.suppliesSpend, color: 'bg-blue-500' },
                { label: t('matLosses') || 'Loss & Breakage Waste', amount: matFinance.lossAmount, color: 'bg-rose-500' },
                { label: t('matExpiryWriteoffs') || 'Expired Lot Write-offs', amount: matFinance.expiryAmount, color: 'bg-amber-500' }
              ]
                .filter((r) => r.amount > 0)
                .map((row) => {
                  const pct = Math.round((row.amount / Math.max(1, matFinance.totalMaterialExpenses)) * 100)

                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
                        <span className="text-slate-500">
                          ${formatMoney(row.amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Top 5 Materials by Inventory Asset Value */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            {t('matTopByValue') || 'Highest Value Materials in Stock'}
          </h3>

          {matFinance.topMaterials.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 font-semibold">
              {t('matNoMaterials') || 'No inventory materials available'}
            </p>
          ) : (
            <div className="space-y-2">
              {matFinance.topMaterials.map((mat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700/40 last:border-0"
                >
                  <span className="w-5 text-xs font-black text-slate-400 text-end shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{mat.name}</p>
                    {mat.category && (
                      <span className="inline-block text-[10px] px-2 py-0.2 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold mt-0.5 border border-teal-100 dark:border-teal-900/30">
                        {mat.category}
                      </span>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                      ${formatMoney(mat.value)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {mat.quantity} {mat.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}