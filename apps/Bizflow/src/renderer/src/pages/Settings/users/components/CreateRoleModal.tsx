// features/settings/users-roles/components/CreateRoleModal.tsx

import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { CustomRolePayload, Capability } from '../types'
import { getRelevantCapabilities, CAPABILITIES } from '../constants'
import { validateRoleId } from '../utils'

interface Props {
  onSubmit: (p: CustomRolePayload) => Promise<boolean>
  onClose: () => void
  existingRoleIds: string[]
}

export function CreateRoleModal({ onSubmit, onClose, existingRoleIds }: Props) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCaps, setSelectedCaps] = useState<Set<Capability>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const relevantCaps = getRelevantCapabilities()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleCap(cap: Capability) {
    setSelectedCaps(prev => {
      const next = new Set(prev)
      if (next.has(cap)) next.delete(cap)
      else next.add(cap)
      return next
    })
  }

  async function submit() {
    const idErr = validateRoleId(id)
    if (idErr) { setError(idErr); return }
    if (existingRoleIds.includes(id)) { setError('Role ID already exists'); return }
    if (!label.trim()) { setError('Label is required'); return }

    setError(null)
    setSubmitting(true)
    try {
      const ok = await onSubmit({
        id: id.trim(),
        label: label.trim(),
        description: description.trim(),
        capabilities: [...selectedCaps],
      })
      if (ok) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create Custom Role</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                placeholder="e.g. shift_lead"
              />
              <p className="text-xs text-slate-400 mt-1">Lowercase, no spaces</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. Shift Lead"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="What can this role do?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Capabilities ({selectedCaps.size} selected)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
              {relevantCaps.map(cap => (
                <label key={cap} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCaps.has(cap)}
                    onChange={() => toggleCap(cap)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{CAPABILITIES[cap].label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Role'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
