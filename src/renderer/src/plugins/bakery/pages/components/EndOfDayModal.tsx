import { useState, useEffect } from 'react'
import { X, Loader2, AlertTriangle, Sunset, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type EODEntry = {
  recipeId: string
  recipeName: string
  yieldUnit: string
  unitsProduced: number
  unitsSold: number
  estimatedWaste: number
  batches: string[]
}

interface Props {
  onClose: () => void
  onWasteLogged: () => void
}

export default function EndOfDayModal({ onClose, onWasteLogged }: Props) {
  const [entries, setEntries] = useState<EODEntry[]>([])
  const [unsoldEdits, setUnsoldEdits] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const data: EODEntry[] = await window.api.bakery.getEndOfDaySuggestion()
        setEntries(data)
        // Pre-populate edits from estimates
        const edits: Record<string, number> = {}
        for (const e of data) edits[e.recipeId] = e.estimatedWaste
        setUnsoldEdits(edits)
      } catch (e: any) {
        setError(e.message ?? t('bakeryEODFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleLogWaste = async () => {
    setSaving(true)
    setError(null)
    try {
      const today = new Date().toISOString()
      for (const entry of entries) {
        const wasteQty = unsoldEdits[entry.recipeId] ?? entry.estimatedWaste
        if (wasteQty <= 0) continue
        await window.api.bakery.createWasteLog({
          recipeId: entry.recipeId,
          itemName: entry.recipeName,
          quantity: wasteQty,
          unit: entry.yieldUnit || 'pcs',
          cost: 0,
          reason: 'Overproduction',
          wasteDate: today,
          notes: `Auto-logged from End of Day summary`
        })
      }
      setDone(true)
      onWasteLogged()
    } catch (e: any) {
      setError(e.message ?? t('bakeryEODFailed'))
      setSaving(false)
    }
  }

  const totalWaste = entries.reduce((s, e) => s + (unsoldEdits[e.recipeId] ?? e.estimatedWaste), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-rose-50 dark:bg-rose-900/20">
          <div className="flex items-center gap-2">
            <Sunset className="h-5 w-5 text-rose-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('bakeryEODTitle')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('bakeryEODSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <p className="font-semibold text-gray-900 dark:text-white">{t('bakeryEODSuccess')}</p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                Close
              </button>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" /> {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Sunset className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>{t('bakeryEODNoData')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {entries.map(entry => {
                  const waste = unsoldEdits[entry.recipeId] ?? entry.estimatedWaste
                  return (
                    <div key={entry.recipeId} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">{entry.recipeName}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('bakeryEODProduced')}</p>
                          <p className="font-bold text-gray-900 dark:text-white">{entry.unitsProduced}</p>
                          <p className="text-xs text-gray-400">{entry.yieldUnit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('bakeryEODSold')}</p>
                          <p className="font-bold text-green-600 dark:text-green-400">{entry.unitsSold}</p>
                          <p className="text-xs text-gray-400">{entry.yieldUnit}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('bakeryEODUnsold')}</p>
                          <input
                            type="number" min="0"
                            value={waste}
                            onChange={e => setUnsoldEdits(prev => ({ ...prev, [entry.recipeId]: Math.max(0, Number(e.target.value)) }))}
                            className="w-full text-center font-bold text-rose-600 dark:text-rose-400 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 text-sm bg-rose-50 dark:bg-rose-900/20 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                          <p className="text-xs text-gray-400">{entry.yieldUnit}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                  {t('bakeryEODEstWaste')}: <strong>{totalWaste}</strong> units total
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && !loading && entries.length > 0 && (
          <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('bakeryCancel')}
            </button>
            <button
              onClick={handleLogWaste}
              disabled={saving || totalWaste <= 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('bakeryEODLogWaste')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
