import React, { useState } from 'react'
import { X } from 'lucide-react'
import { TableBrief, ReservationFormData } from '../types'
import { GUEST_TAG_SUGGESTIONS, DURATION_OPTIONS } from '../constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  tables: TableBrief[]
  onSave: (data: ReservationFormData) => Promise<boolean>
}

export const ReservationFormModal: React.FC<Props> = ({ isOpen, onClose, tables, onSave }) => {
  const [form, setForm] = useState<ReservationFormData>({
    tableId: '',
    customerName: '',
    customerPhone: '',
    partySize: '2',
    date: new Date().toISOString().slice(0, 16),
    durationMins: 90,
    notes: '',
    guestTags: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleTagToggle = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      guestTags: prev.guestTags.includes(tag)
        ? prev.guestTags.filter((t) => t !== tag)
        : [...prev.guestTags, tag]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onSave(form)
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            New Table Reservation
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Name & Phone */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Guest Name *</span>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Telephone</span>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Date & Time and Party Size */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Booking Time *</span>
            <input
              type="datetime-local"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Party Size *</span>
            <input
              type="number"
              min="1"
              max="24"
              required
              value={form.partySize}
              onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Table Assignment & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Table (Optional)</span>
            <select
              value={form.tableId}
              onChange={(e) => setForm((f) => ({ ...f, tableId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Assign upon arrival</option>
              {tables.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  Table #{tb.number} ({tb.capacity} seats • {tb.section || 'Main'})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Duration</span>
            <select
              value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Tags Selection */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Guest Preference Tags
          </span>
          <div className="flex flex-wrap gap-1">
            {GUEST_TAG_SUGGESTIONS.map((tag) => {
              const isSelected = form.guestTags.includes(tag)
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Special Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Special seating or dietary requests"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}