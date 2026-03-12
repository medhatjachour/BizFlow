import { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle2, Loader2, Package } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type Requirement = {
  ingredientId: string
  name: string
  needed: number
  unit: string
  currentStock: number | null
  remaining: number | null
  status: 'ok' | 'low' | 'empty' | 'unlinked'
  pantryLinked: boolean
}

type RequirementsResult = {
  requirements: Requirement[]
  recipeName: string
}

interface Props {
  recipeId: string
  quantity: number
  onConfirm: () => Promise<void>
  onClose: () => void
}

const STATUS_CONFIG = {
  ok:       { label: 'bakeryConfirmStatusOk',       cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: <CheckCircle2 className="h-4 w-4" /> },
  low:      { label: 'bakeryConfirmStatusLow',      cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: <AlertTriangle className="h-4 w-4" /> },
  empty:    { label: 'bakeryConfirmStatusEmpty',    cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: <AlertTriangle className="h-4 w-4" /> },
  unlinked: { label: 'bakeryConfirmStatusUnlinked', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400', icon: <Package className="h-4 w-4" /> }
}

export default function ProductionConfirmModal({ recipeId, quantity, onConfirm, onClose }: Props) {
  const [data, setData] = useState<RequirementsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const result = await window.api.bakery.getProductionRequirements({ recipeId, quantity })
        setData(result)
      } catch (e: any) {
        setError(e.message ?? t('bakeryConfirmRequirementsLoadFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, [recipeId, quantity])

  const hasIssues = data?.requirements.some(r => r.status === 'empty' || r.status === 'low')

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
      onClose()
    } catch (e: any) {
      setError(e.message)
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('bakeryConfirmProductionTitle')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('bakeryConfirmProductionSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" /> {error}
            </div>
          ) : data ? (
            <>
              {hasIssues && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{t('bakeryConfirmWarning')}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-2 font-medium">{t('bakeryConfirmIngredient')}</th>
                      <th className="pb-2 font-medium text-right">{t('bakeryConfirmNeeded')}</th>
                      <th className="pb-2 font-medium text-right">{t('bakeryConfirmInStock')}</th>
                      <th className="pb-2 font-medium text-right">{t('bakeryConfirmAfter')}</th>
                      <th className="pb-2 font-medium text-center">{t('bakeryConfirmStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.requirements.map(req => {
                      const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.unlinked
                      return (
                        <tr key={req.ingredientId} className="text-gray-900 dark:text-white">
                          <td className="py-2.5 font-medium">{req.name}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {req.needed.toFixed(2)} <span className="text-gray-400 text-xs">{req.unit}</span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {req.currentStock !== null
                              ? <>{req.currentStock.toFixed(2)} <span className="text-gray-400 text-xs">{req.unit}</span></>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {req.remaining !== null
                              ? (
                                <span className={req.remaining < 0 ? 'text-red-500 font-semibold' : ''}>
                                  {req.remaining.toFixed(2)} <span className="text-gray-400 text-xs">{req.unit}</span>
                                </span>
                              )
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                              {cfg.icon} {t(cfg.label)}
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
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('bakeryCancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors
              ${hasIssues
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-50`}
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('bakeryConfirmProceed')}
          </button>
        </div>
      </div>
    </div>
  )
}
