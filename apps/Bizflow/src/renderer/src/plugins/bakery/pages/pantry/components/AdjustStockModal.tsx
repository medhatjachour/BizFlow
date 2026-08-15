import React, { useState } from 'react'
import { SlidersHorizontal, TrendingUp, TrendingDown, Target, AlertTriangle, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ADJUST_PRESETS } from '../constants'
import { PantryIngredient, AdjustStockMode } from '../types'

interface Props {
  target: PantryIngredient | null
  onClose: () => void
  onConfirm: (
    target: PantryIngredient,
    mode: AdjustStockMode,
    amount: number,
    reason?: string
  ) => Promise<void>
}

export const AdjustStockModal: React.FC<Props> = ({ target, onClose, onConfirm }) => {
  const { t } = useLanguage()

  const [mode, setMode] = useState<AdjustStockMode>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  if (!target) return null

  const current = target.currentStock
  const amtNum = parseFloat(amount) || 0

  const projectedStock =
    amount === '' ? current : mode === 'add' ? current + amtNum : mode === 'remove' ? current - amtNum : amtNum

  const willBeNegative = projectedStock < 0
  const isValid = amount !== '' && amtNum >= 0 && !willBeNegative

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      await onConfirm(target, mode, amtNum, reason)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('bakeryAdjustStock') || 'Adjust Stock Level'}
              </h3>
              <p className="text-xs text-slate-400">{target.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Stock Projection Comparison */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">
                {current} {target.unit}
              </p>
            </div>
            <span className="text-xl font-bold text-slate-300 dark:text-slate-600">→</span>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Projected</p>
              <p
                className={`text-lg font-black ${
                  willBeNegative
                    ? 'text-rose-600'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {amount !== '' ? projectedStock.toFixed(2) : '—'} {target.unit}
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            {(
              [
                { key: 'add', label: 'Add (+)', icon: <TrendingUp className="h-3.5 w-3.5" /> },
                { key: 'remove', label: 'Remove (-)', icon: <TrendingDown className="h-3.5 w-3.5" /> },
                { key: 'set', label: 'Set Exact', icon: <Target className="h-3.5 w-3.5" /> },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key)
                  setAmount('')
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Amount input & Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Adjustment Quantity ({target.unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            {mode !== 'set' && (
              <div className="flex gap-1.5 mt-2">
                {ADJUST_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="flex-1 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">— Select reason —</option>
              <option value="Delivery received">Delivery received</option>
              <option value="Inventory count correction">Inventory count correction</option>
              <option value="Used in baking">Used in baking</option>
              <option value="Spoilage / Expiry">Spoilage / Expiry</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          {willBeNegative && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Stock cannot fall below zero.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Confirm Adjustment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}