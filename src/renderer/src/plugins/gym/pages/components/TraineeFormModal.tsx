import { useState, useEffect } from 'react'
import { X, Loader2, User } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: (trainee: any) => void
  initial?: any | null
}

interface Form {
  name: string; phone: string; email: string; age: string; gender: string
  nationalId: string; address: string; emergencyContact: string; emergencyPhone: string; notes: string
}

const defaultForm = (): Form => ({
  name: '', phone: '', email: '', age: '', gender: '', nationalId: '',
  address: '', emergencyContact: '', emergencyPhone: '', notes: ''
})

export default function TraineeFormModal({ isOpen, onClose, onSaved, initial }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<Form>(defaultForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      const age = initial.dateOfBirth
        ? String(Math.floor((Date.now() - new Date(initial.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)))
        : ''
      setForm({
        name: initial.name ?? '', phone: initial.phone ?? '', email: initial.email ?? '',
        age,
        gender: initial.gender ?? '', nationalId: initial.nationalId ?? '',
        address: initial.address ?? '', emergencyContact: initial.emergencyContact ?? '',
        emergencyPhone: initial.emergencyPhone ?? '', notes: initial.notes ?? ''
      })
    } else {
      setForm(defaultForm())
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        dateOfBirth: form.age ? new Date(new Date().getFullYear() - parseInt(form.age), 0, 1).toISOString() : null,
        gender: form.gender || null,
        nationalId: form.nationalId.trim() || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
        emergencyPhone: form.emergencyPhone.trim() || null,
        notes: form.notes.trim() || null
      }
      let result: any
      if (initial) {
        result = await (window.api as any).gym?.trainees?.update(initial.id, payload)
        toast.success('Trainee updated')
      } else {
        result = await (window.api as any).gym?.trainees?.create(payload)
        toast.success('Trainee added')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <User size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {initial ? 'Edit Trainee' : 'New Trainee'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Member full name" required />
          </div>
          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            </div>
          </div>
          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Age</label>
              <input className={inputCls} type="number" min="5" max="100" value={form.age} onChange={set('age')} placeholder="e.g. 25" />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={form.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {/* National ID */}
          <div>
            <label className={labelCls}>National ID</label>
            <input className={inputCls} value={form.nationalId} onChange={set('nationalId')} placeholder="Government ID number" />
          </div>
          {/* Address */}
          <div>
            <label className={labelCls}>Address</label>
            <input className={inputCls} value={form.address} onChange={set('address')} placeholder="Home address" />
          </div>
          {/* Emergency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Emergency Contact</label>
              <input className={inputCls} value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="Contact name" />
            </div>
            <div>
              <label className={labelCls}>Emergency Phone</label>
              <input className={inputCls} type="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} placeholder="Health conditions, goals, etc." />
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : initial ? 'Update' : 'Add Trainee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
