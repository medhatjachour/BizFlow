import { useState, useEffect } from 'react'
import { X, Loader2, CalendarRange } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  prefillTraineeId?: string
  prefillTraineeName?: string
}

interface Form {
  traineeSearch: string; traineeId: string; traineeName: string
  planId: string; coachId: string
  startDate: string; amountPaid: string; paymentMethod: string; notes: string
}
const defaultForm = (): Form => ({
  traineeSearch: '', traineeId: '', traineeName: '',
  planId: '', coachId: '', startDate: new Date().toISOString().slice(0,10),
  amountPaid: '', paymentMethod: 'cash', notes: ''
})

export default function SubscriptionFormModal({ isOpen, onClose, onSaved, prefillTraineeId, prefillTraineeName }: Props) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<Form>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [traineeResults, setTraineeResults] = useState<any[]>([])
  const [searchingTrainee, setSearchingTrainee] = useState(false)
  const [showTraineeDrop, setShowTraineeDrop] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const init = async () => {
      const [pl, co] = await Promise.all([
        (window.api as any).gym?.plans?.getAll(),
        (window.api as any).gym?.coaches?.getAll({ take: 100 })
      ])
      setPlans(Array.isArray(pl) ? pl.filter((p: any) => p.isActive) : [])
      setCoaches(Array.isArray(co) ? co : co?.data ?? [])
    }
    const f = defaultForm()
    if (prefillTraineeId) { f.traineeId = prefillTraineeId; f.traineeName = prefillTraineeName ?? ''; f.traineeSearch = prefillTraineeName ?? '' }
    setForm(f)
    setSelectedPlan(null)
    init()
  }, [isOpen, prefillTraineeId, prefillTraineeName])

  // Compute end date from selected plan
  const endDate = selectedPlan && form.startDate
    ? (() => {
        const d = new Date(form.startDate)
        d.setDate(d.getDate() + selectedPlan.durationDays)
        return d.toISOString().slice(0,10)
      })()
    : null

  async function searchTrainees(q: string) {
    setForm(f => ({ ...f, traineeSearch: q, traineeId: '', traineeName: '' }))
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
    setForm(f => ({ ...f, traineeId: t.id, traineeName: t.name, traineeSearch: t.name }))
    setTraineeResults([]); setShowTraineeDrop(false)
  }

  function selectPlan(planId: string) {
    const plan = plans.find(p => p.id === planId) ?? null
    setSelectedPlan(plan)
    setForm(f => ({ ...f, planId, amountPaid: plan ? String(plan.price) : f.amountPaid }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.traineeId || !form.planId || !form.startDate) return
    setSaving(true)
    try {
      const payload = {
        traineeId: form.traineeId,
        planId: form.planId,
        coachId: form.coachId || null,
        startDate: form.startDate,
        endDate: endDate ?? (() => { const d = new Date(form.startDate); d.setDate(d.getDate() + (selectedPlan?.durationDays ?? 30)); return d.toISOString().slice(0,10) })(),
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || null
      }
      await (window.api as any).gym?.subscriptions?.create(payload)
      toast.success('Subscription created')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('gymNewSubscription')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Trainee search */}
          <div className="relative">
            <label className={labelCls}>{t('gymTraineeName')} *</label>
            {prefillTraineeId ? (
              <div className={`${inputCls} bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300`}>{form.traineeName}</div>
            ) : (
              <>
                <div className="relative">
                  {searchingTrainee && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                  <input
                    className={inputCls}
                    value={form.traineeSearch}
                    onChange={e => searchTrainees(e.target.value)}
                    onFocus={() => form.traineeSearch && setShowTraineeDrop(true)}
                    onBlur={() => setTimeout(() => setShowTraineeDrop(false), 150)}
                    placeholder={t('gymSearchMemberPhone')}
                    required={!form.traineeId}
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
              </>
            )}
          </div>

          {/* Plan */}
          <div>
            <label className={labelCls}>{t('gymPlanName')} *</label>
            <select className={inputCls} value={form.planId} onChange={e => selectPlan(e.target.value)} required>
              <option value="">{t('gymSelectPlan')}</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.durationDays}d — {p.price.toLocaleString()}</option>)}
            </select>
          </div>

          {/* Coach */}
          <div>
            <label className={labelCls}>{t('gymProgramCoach')}</label>
            <select className={inputCls} value={form.coachId} onChange={e => setForm(f => ({ ...f, coachId: e.target.value }))}>
              <option value="">{t('gymNoCoach')}</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name}{c.specialty ? ` (${c.specialty})` : ''}</option>)}
            </select>
          </div>

          {/* Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymStartDate')} *</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>{t('gymEndDate')}</label>
              <div className={`${inputCls} bg-slate-50 dark:bg-slate-700/40 text-slate-500 cursor-default`}>
                {endDate ?? '—'}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymAmount')}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.amountPaid} onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <select className={inputCls} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {['cash','card','transfer','other'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('gymNotes')}</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {selectedPlan && (
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 p-3 text-xs text-orange-700 dark:text-orange-400">
              <strong>{selectedPlan.name}</strong> · {selectedPlan.durationDays} days · up to {selectedPlan.maxFreezeDays} freeze days
              {selectedPlan.features && <span> · {selectedPlan.features}</span>}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('gymCancel')}</button>
            <button type="submit" disabled={saving || !form.traineeId || !form.planId} className="flex-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : t('gymNewSubscription')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
