import React, { useState } from 'react'
import { X } from 'lucide-react'
import { OpenShiftFormData } from '../types'
import { FLOAT_PRESETS } from '../constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  onOpen: (data: OpenShiftFormData) => Promise<boolean>
}

export const OpenShiftModal: React.FC<Props> = ({ isOpen, onClose, onOpen }) => {
  const [form, setForm] = useState<OpenShiftFormData>({
    serverId: 'server_1',
    serverName: 'Head Server',
    startCash: '100'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onOpen(form)
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Open Cash Drawer Shift
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Server / Cashier Name *</span>
          <input
            type="text"
            required
            value={form.serverName}
            onChange={(e) => setForm((f) => ({ ...f, serverName: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Opening Float Presets
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {FLOAT_PRESETS.map((amount) => (
              <button
                type="button"
                key={amount}
                onClick={() => setForm((f) => ({ ...f, startCash: String(amount) }))}
                className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                  form.startCash === String(amount)
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Opening Cash Float ($) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={form.startCash}
            onChange={(e) => setForm((f) => ({ ...f, startCash: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? 'Opening...' : 'Start Shift'}
          </button>
        </div>
      </form>
    </div>
  )
}