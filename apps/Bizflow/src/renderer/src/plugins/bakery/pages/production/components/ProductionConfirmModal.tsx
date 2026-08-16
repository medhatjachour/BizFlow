import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle2, Loader2, Package } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ProductionRequirementsResult } from '../types'

interface Props {
  recipeId: string
  quantity: number
  batchDate: string
  notes?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

const STATUS_CONFIG = {
  ok: {
    labelKey: 'bakeryConfirmStatusOk',
    defaultLabel: 'Sufficient',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  low: {
    labelKey: 'bakeryConfirmStatusLow',
    defaultLabel: 'Low Stock',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  empty: {
    labelKey: 'bakeryConfirmStatusEmpty',
    defaultLabel: 'Shortage',
    cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  unlinked: {
    labelKey: 'bakeryConfirmStatusUnlinked',
    defaultLabel: 'Unlinked',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    icon: <Package className="h-3.5 w-3.5" />,
  },
}

export const ProductionConfirmModal: React.FC<Props> = ({
  recipeId,
  quantity,
  onConfirm,
  onClose,
}) => {
  const { t } = useLanguage()
  const [data, setData] = useState<ProductionRequirementsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await window.api.bakery.getProductionRequirements({ recipeId, quantity })
        if (isMounted) setData(result)
      } catch (e: any) {
        if (isMounted) setError(e.message || (t('bakeryConfirmRequirementsLoadFailed') || 'Failed to verify stock.'))
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [recipeId, quantity, t])

  const hasShortage = data?.requirements.some(r => r.status === 'empty' || r.status === 'low')

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
    } catch (e: any) {
      setError(e.message)
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('bakeryConfirmProductionTitle') || 'Confirm Production Run'}
            </h3>
            <p className="text-xs text-slate-400">
              Pantry stock will be automatically deducted based on recipe requirements
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
              <p className="text-xs text-slate-400">Checking pantry stock availability…</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {hasShortage && (
                <div className="mb-4 flex items-center gap-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {t('bakeryConfirmWarning') ||
                      'Warning: Some ingredients are below required quantities. Stock will fall to negative or trigger reorder.'}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                      <th className="pb-2.5">{t('bakeryConfirmIngredient') || 'Ingredient'}</th>
                      <th className="pb-2.5 text-right">{t('bakeryConfirmNeeded') || 'Required'}</th>
                      <th className="pb-2.5 text-right">{t('bakeryConfirmInStock') || 'Current Stock'}</th>
                      <th className="pb-2.5 text-right">{t('bakeryConfirmAfter') || 'After Bake'}</th>
                      <th className="pb-2.5 text-center">{t('bakeryConfirmStatus') || 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {data.requirements.map(req => {
                      const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.unlinked
                      return (
                        <tr key={req.ingredientId} className="text-slate-900 dark:text-white">
                          <td className="py-2.5 font-bold">{req.name}</td>
                          <td className="py-2.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                            {req.needed.toFixed(2)}{' '}
                            <span className="text-slate-400 text-xs font-normal">{req.unit}</span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-slate-500">
                            {req.currentStock !== null ? (
                              <>
                                {req.currentStock.toFixed(2)}{' '}
                                <span className="text-slate-400 text-xs font-normal">{req.unit}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {req.remaining !== null ? (
                              <span
                                className={
                                  req.remaining < 0
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : 'font-semibold text-slate-700 dark:text-slate-300'
                                }
                              >
                                {req.remaining.toFixed(2)}{' '}
                                <span className="text-slate-400 text-xs font-normal">{req.unit}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}
                            >
                              {cfg.icon}
                              <span>{t(cfg.labelKey) || cfg.defaultLabel}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('bakeryCancelBtn') || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || loading}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all ${
              hasShortage
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-50`}
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{t('bakeryConfirmProceed') || 'Commit Production & Deduct'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}