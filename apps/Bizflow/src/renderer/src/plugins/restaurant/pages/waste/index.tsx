import  { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, AlertCircle, Trash2 } from 'lucide-react'
import { WasteLogEntry, WasteFormData } from './types'
import { LogWasteModal } from './components/LogWasteModal'

export default function KitchenWasteLogPage() {
  const [logs, setLogs] = useState<WasteLogEntry[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [wList, ingList] = await Promise.all([
        window.api.restaurant.getWasteLogs(),
        window.api.restaurant.getIngredients()
      ])
      setLogs(wList || [])
      setIngredients(ingList || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load waste logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalCostLoss = logs.reduce((acc, l) => acc + (l.costLoss || 0), 0)

  const handleLogWaste = async (data: WasteFormData) => {
    try {
      await window.api.restaurant.logWaste({
        ingredientId: data.ingredientId || undefined,
        itemName: data.itemName,
        quantity: Number(data.quantity),
        unit: data.unit,
        reason: data.reason,
        loggedBy: data.loggedBy,
        notes: data.notes || undefined
      })
      loadData()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to log kitchen waste')
      return false
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this log entry?')) return
    try {
      await window.api.restaurant.deleteWasteLog(id)
      loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete waste log')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Loss KPI */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Kitchen Waste & Loss Log
          </h3>
          <p className="text-xs text-slate-400">
            Track food shrinkage, dropped items, and spoilage to reconcile theoretical vs. actual inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Waste Loss</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              -${totalCostLoss.toFixed(2)}
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-rose-500/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Waste Entry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between text-xs gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{log.itemName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[10px] capitalize">
                    {log.reason.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Quantity: {log.quantity} {log.unit} • Logged by: {log.loggedBy || 'Staff'} •{' '}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  -${log.costLoss.toFixed(2)}
                </span>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              No waste or spoilage entries recorded.
            </div>
          )}
        </div>
      </div>

      <LogWasteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        ingredients={ingredients}
        onLog={handleLogWaste}
      />
    </div>
  )
}