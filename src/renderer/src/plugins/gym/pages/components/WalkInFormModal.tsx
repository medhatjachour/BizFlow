import { useState, useEffect } from 'react'
import { X, Loader2, Footprints } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

interface Form {
  traineeSearch: string; traineeId: string
  coachId: string; date: string; type: string; amount: string; paymentMethod: string; notes: string
}
const defaultForm = (): Form => ({
  traineeSearch: '', traineeId: '',
  coachId: '', date: new Date().toISOString().slice(0,10), type: 'walkin', amount: '', paymentMethod: 'cash', notes: ''
})

export default function WalkInFormModal({ isOpen, onClose, onSaved }: Props) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<Form>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [coaches, setCoaches] = useState<any[]>([])
  const [traineeResults, setTraineeResults] = useState<any[]>([])
  const [searchingTrainee, setSearchingTrainee] = useState(false)
  const [showTraineeDrop, setShowTraineeDrop] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(defaultForm())
    ;(window.api as any).gym?.coaches?.getAll({ take: 100 }).then((res: any) =>
      setCoaches(Array.isArray(res) ? res : res?.data ?? [])
    ).catch(() => {})
  }, [isOpen])

  async function searchTrainees(q: string) {
    setForm(f => ({ ...f, traineeSearch: q, traineeId: '' }))
    if (!q.trim()) { setTraineeResults([]); setShowTraineeDrop(false); return }
    setSearchingTrainee(true)
    try {
      const res = await (window.api as any).gym?.trainees?.searchLite(q)
      setTraineeResults(Array.isArray(res) ? res : [])
      setShowTraineeDrop(true)
    } catch { setTraineeResults([]) }
    finally { setSearchingTrainee(false) }
  }

  function selectTrainee(t: any) {
    setForm(f => ({ ...f, traineeId: t.id, traineeSearch: t.name }))
    setTraineeResults([]); setShowTraineeDrop(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        traineeId: form.traineeId || null,
        coachId: form.coachId || null,
        date: form.date,
        type: form.type,
        amount: form.amount ? parseFloat(form.amount) : 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || null
      }
      await (window.api as any).gym?.sessions?.create(payload)
      toast.success('Session logged')
      onSaved()
      onClose()
    } catch (err: any) { toast.error(err.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  if (!isOpen) return null

  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('gymLogVisit')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Trainee (optional) */}
          <div className="relative">
            <label className={labelCls}>{t('gymTraineeOptional')}</label>
            <div className="relative">
              {searchingTrainee && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
              <input
                className={inputCls}
                value={form.traineeSearch}
                onChange={e => searchTrainees(e.target.value)}
                onFocus={() => form.traineeSearch && setShowTraineeDrop(true)}
                onBlur={() => setTimeout(() => setShowTraineeDrop(false), 150)}
                placeholder={t('gymSearchMemberPhone')}
              />
            </div>
            {showTraineeDrop && traineeResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                {traineeResults.map(t => (
                  <li key={t.id} onClick={() => selectTrainee(t)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-800 dark:text-slate-200">
                    {t.name} {t.phone ? `· ${t.phone}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Session type */}
          <div>
            <label className={labelCls}>{t('gymVisitType')}</label>
            <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="walkin">{t('gymWalkInPaid')}</option>
              <option value="subscription_visit">{t('gymSubVisit')}</option>
            </select>
          </div>

          {/* Coach */}
          <div>
            <label className={labelCls}>{t('gymCoachOptional')}</label>
            <select className={inputCls} value={form.coachId} onChange={e => setForm(f => ({ ...f, coachId: e.target.value }))}>
              <option value="">{t('gymNoCoach')}</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Date + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymDate')}</label>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>{form.type === 'walkin' ? t('gymAmountWalkin') : t('gymAmountOptional')}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
          </div>

          {form.amount && parseFloat(form.amount) > 0 && (
            <div>
              <label className={labelCls}>{t('gymPaymentMethod')}</label>
              <select className={inputCls} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {['cash','card','transfer','other'].map(m => <option key={m} value={m}>{m === 'cash' ? t('gymCash') : m === 'card' ? t('gymCard') : m === 'transfer' ? t('gymTransfer') : t('gymOther')}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>{t('gymNotes')}</label>
            <input className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm">{t('gymCancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : t('gymLogVisit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
