import { useState, useEffect } from 'react'
import { X, User, Phone, MapPin, StickyNote, Star } from 'lucide-react'
import { INPUT_CLASS } from '../constants'
import type { Customer } from '../types'

interface Props {
  open: boolean
  editTarget: Customer | null
  onClose: () => void
  onSave: (data: any, id?: string) => void
}

export function CustomerModal({ open, editTarget, onClose, onSave }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', isVip: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editTarget) {
      setForm({
        name: editTarget.name,
        phone: editTarget.phone ?? '',
        address: editTarget.address ?? '',
        notes: editTarget.notes ?? '',
        isVip: editTarget.isVip ?? false
      })
    } else {
      setForm({ name: '', phone: '', address: '', notes: '', isVip: false })
    }
  }, [editTarget, open])

  if (!open) return null

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const data = {
      name: form.name.trim(),
      phone: form.phone || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      isVip: form.isVip
    }
    await onSave(data, editTarget?.id)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editTarget ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <User className="w-3.5 h-3.5" /> Full Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="John Doe"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="+20 100 123 4567"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Address
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Cairo, Egypt"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes / Preferences
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              className={INPUT_CLASS + ' resize-none h-20'}
              placeholder="Oat milk only, no sugar..."
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg cursor-pointer">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isVip: !p.isVip }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isVip ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isVip ? 'translate-x-5' : ''}`} />
            </button>
            <div className="flex items-center gap-1.5">
              <Star className={`w-4 h-4 ${form.isVip ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as VIP Customer</span>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
