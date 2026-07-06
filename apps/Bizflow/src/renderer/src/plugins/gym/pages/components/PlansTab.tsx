import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, CheckCircle, Star,
  Dumbbell, Flame, Droplets, Users, BadgeCheck, X,
  Thermometer, Waves, Lock, Shirt, Apple, BarChart2,
  ClipboardList, Ticket, Snowflake, ListChecks
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string; name: string; description: string | null; category: string
  durationDays: number; price: number; maxFreezeDays: number
  sessionsPerWeek: number | null; sessionsTotal: number | null; coachSessions: number
  hasSauna: boolean; hasJacuzzi: boolean; hasPool: boolean; hasLocker: boolean
  hasTowel: boolean; hasNutritionPlan: boolean; hasBodyAnalysis: boolean
  hasFitnessTest: boolean; hasGroupClass: boolean; guestPasses: number
  color: string; isPopular: boolean; features: string | null; isActive: boolean; createdAt: string
}
interface PlanForm {
  name: string; description: string; category: string; durationDays: string; price: string
  maxFreezeDays: string; sessionsPerWeek: string; sessionsTotal: string; coachSessions: string
  hasSauna: boolean; hasJacuzzi: boolean; hasPool: boolean; hasLocker: boolean; hasTowel: boolean
  hasNutritionPlan: boolean; hasBodyAnalysis: boolean; hasFitnessTest: boolean; hasGroupClass: boolean
  guestPasses: string; color: string; isPopular: boolean; features: string; isActive: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'general',     label: 'General Fitness',  icon: Dumbbell,      desc: 'All-around gym access' },
  { value: 'weight-loss', label: 'Weight Loss',       icon: Flame,         desc: 'Cardio & fat-burning focus' },
  { value: 'muscle-gain', label: 'Muscle Gain',       icon: Dumbbell,      desc: 'Strength & hypertrophy' },
  { value: 'athletic',    label: 'Athletic Training', icon: Droplets,      desc: 'Sport performance & agility' },
  { value: 'wellness',    label: 'Wellness & Spa',    icon: Waves,         desc: 'Recovery, spa & relaxation' },
  { value: 'vip',         label: 'VIP / Premium',     icon: Star,          desc: 'All-inclusive premium access' },
]

const COLORS = [
  { value: 'orange',  label: 'Orange',  from: 'from-orange-50',  to: 'to-amber-50',   text: 'text-orange-600 dark:text-orange-400',   badge: 'bg-orange-500',  btn: 'bg-orange-500 hover:bg-orange-600' },
  { value: 'blue',    label: 'Blue',    from: 'from-blue-50',    to: 'to-sky-50',     text: 'text-blue-600 dark:text-blue-400',       badge: 'bg-blue-500',    btn: 'bg-blue-500 hover:bg-blue-600' },
  { value: 'purple',  label: 'Purple',  from: 'from-purple-50',  to: 'to-violet-50',  text: 'text-purple-600 dark:text-purple-400',   badge: 'bg-purple-500',  btn: 'bg-purple-500 hover:bg-purple-600' },
  { value: 'emerald', label: 'Green',   from: 'from-emerald-50', to: 'to-teal-50',    text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500', btn: 'bg-emerald-500 hover:bg-emerald-600' },
  { value: 'teal',    label: 'Teal',    from: 'from-teal-50',    to: 'to-cyan-50',    text: 'text-teal-600 dark:text-teal-400',       badge: 'bg-teal-500',    btn: 'bg-teal-500 hover:bg-teal-600' },
  { value: 'rose',    label: 'Rose',    from: 'from-rose-50',    to: 'to-pink-50',    text: 'text-rose-600 dark:text-rose-400',       badge: 'bg-rose-500',    btn: 'bg-rose-500 hover:bg-rose-600' },
]

type AmenityKey = 'hasSauna'|'hasJacuzzi'|'hasPool'|'hasLocker'|'hasTowel'|'hasNutritionPlan'|'hasBodyAnalysis'|'hasFitnessTest'|'hasGroupClass'

const AMENITIES: { key: AmenityKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'hasSauna',         label: 'Sauna',              icon: Thermometer,   color: 'text-orange-500' },
  { key: 'hasJacuzzi',       label: 'Jacuzzi',            icon: Waves,         color: 'text-blue-500' },
  { key: 'hasPool',          label: 'Swimming Pool',      icon: Droplets,      color: 'text-cyan-500' },
  { key: 'hasLocker',        label: 'Locker Room',        icon: Lock,          color: 'text-slate-500' },
  { key: 'hasTowel',         label: 'Towel Service',      icon: Shirt,         color: 'text-slate-400' },
  { key: 'hasNutritionPlan', label: 'Nutrition Plan',     icon: Apple,         color: 'text-green-500' },
  { key: 'hasBodyAnalysis',  label: 'Body Analysis',      icon: BarChart2,     color: 'text-violet-500' },
  { key: 'hasFitnessTest',   label: 'Fitness Assessment', icon: ClipboardList, color: 'text-amber-500' },
  { key: 'hasGroupClass',    label: 'Group Classes',      icon: Users,         color: 'text-indigo-500' },
]

const DURATION_PRESETS = [
  { label: '1 Week', days: 7 }, { label: '2 Weeks', days: 14 }, { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 }, { label: '6 Months', days: 180 }, { label: '1 Year', days: 365 },
]

function getColor(v: string) { return COLORS.find(c => c.value === v) ?? COLORS[0] }
function getCat(v: string) { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[0] }

function defaultForm(): PlanForm {
  return {
    name: '', description: '', category: 'general', durationDays: '30', price: '',
    maxFreezeDays: '0', sessionsPerWeek: '', sessionsTotal: '', coachSessions: '0',
    hasSauna: false, hasJacuzzi: false, hasPool: false, hasLocker: false, hasTowel: false,
    hasNutritionPlan: false, hasBodyAnalysis: false, hasFitnessTest: false, hasGroupClass: false,
    guestPasses: '0', color: 'orange', isPopular: false, features: '', isActive: true
  }
}
function planToForm(p: Plan): PlanForm {
  return {
    name: p.name, description: p.description ?? '', category: p.category,
    durationDays: String(p.durationDays), price: String(p.price), maxFreezeDays: String(p.maxFreezeDays),
    sessionsPerWeek: p.sessionsPerWeek != null ? String(p.sessionsPerWeek) : '',
    sessionsTotal: p.sessionsTotal != null ? String(p.sessionsTotal) : '',
    coachSessions: String(p.coachSessions ?? 0),
    hasSauna: p.hasSauna, hasJacuzzi: p.hasJacuzzi, hasPool: p.hasPool, hasLocker: p.hasLocker,
    hasTowel: p.hasTowel, hasNutritionPlan: p.hasNutritionPlan, hasBodyAnalysis: p.hasBodyAnalysis,
    hasFitnessTest: p.hasFitnessTest, hasGroupClass: p.hasGroupClass,
    guestPasses: String(p.guestPasses ?? 0), color: p.color ?? 'orange',
    isPopular: p.isPopular ?? false, features: p.features ?? '', isActive: p.isActive
  }
}
function buildPayload(form: PlanForm) {
  return {
    name: form.name.trim(), description: form.description.trim() || null, category: form.category,
    durationDays: parseInt(form.durationDays) || 30, price: parseFloat(form.price) || 0,
    maxFreezeDays: parseInt(form.maxFreezeDays) || 0,
    sessionsPerWeek: form.sessionsPerWeek !== '' ? parseInt(form.sessionsPerWeek) : null,
    sessionsTotal: form.sessionsTotal !== '' ? parseInt(form.sessionsTotal) : null,
    coachSessions: parseInt(form.coachSessions) || 0,
    hasSauna: form.hasSauna, hasJacuzzi: form.hasJacuzzi, hasPool: form.hasPool,
    hasLocker: form.hasLocker, hasTowel: form.hasTowel, hasNutritionPlan: form.hasNutritionPlan,
    hasBodyAnalysis: form.hasBodyAnalysis, hasFitnessTest: form.hasFitnessTest,
    hasGroupClass: form.hasGroupClass, guestPasses: parseInt(form.guestPasses) || 0,
    color: form.color, isPopular: form.isPopular, features: form.features.trim() || null,
    isActive: form.isActive
  }
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete }: { plan: Plan; onEdit: () => void; onDelete: () => void }) {
  const { t } = useLanguage()
  const col = getColor(plan.color)
  const cat = getCat(plan.category)
  const CatIcon = cat.icon
  const activeAmenities = AMENITIES.filter(a => plan[a.key as keyof Plan] as boolean)

  return (
    <div className={`relative bg-gradient-to-br dark:from-slate-800 dark:to-slate-800 ${col.from} ${col.to} rounded-2xl border ${plan.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 dark:border-slate-600 opacity-60'} overflow-hidden flex flex-col`}>
      {plan.isPopular && (
        <div className={`absolute top-3.5 right-3.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${col.badge}`}>
          <Star size={8} fill="currentColor" /> POPULAR
        </div>
      )}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-700/70 ${col.text}`}>
            <CatIcon size={10} /> {cat.label}
          </span>
          {!plan.isActive && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Inactive</span>}
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight pr-16">{plan.name}</h3>
        {plan.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{plan.description}</p>}
      </div>
      <div className="mx-5 mb-3 rounded-xl px-4 py-2.5 bg-white/60 dark:bg-slate-700/50">
        <p className={`text-2xl font-extrabold tabular-nums ${col.text}`}>${plan.price.toLocaleString()}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{plan.durationDays} days{plan.durationDays >= 365 ? ' (1 year)' : plan.durationDays >= 180 ? ' (6 mo)' : plan.durationDays >= 90 ? ' (3 mo)' : plan.durationDays >= 30 ? ' (1 mo)' : ''}</p>
      </div>
      <div className="px-5 mb-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          { val: plan.sessionsPerWeek != null ? plan.sessionsPerWeek : '∞', lbl: 'per week' },
          { val: plan.sessionsTotal != null ? plan.sessionsTotal : '∞',     lbl: 'total sessions' },
          { val: plan.coachSessions > 0 ? plan.coachSessions : '—',         lbl: 'PT sessions', hi: plan.coachSessions > 0 },
        ].map(({ val, lbl, hi }) => (
          <div key={lbl} className="bg-white/60 dark:bg-slate-700/50 rounded-lg py-2">
            <p className={`text-sm font-bold ${hi ? col.text : 'text-slate-800 dark:text-white'}`}>{val}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{lbl}</p>
          </div>
        ))}
      </div>
      {(activeAmenities.length > 0 || plan.guestPasses > 0) && (
        <div className="px-5 mb-3 flex flex-wrap gap-1.5">
          {activeAmenities.map(a => { const Icon = a.icon; return (
            <span key={a.key} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/70 dark:bg-slate-700/70 font-medium ${a.color}`}>
              <Icon size={9} /> {a.label}
            </span>
          )})}
          {plan.guestPasses > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/70 dark:bg-slate-700/70 font-medium text-amber-600">
              <Ticket size={9} /> {plan.guestPasses} guest pass{plan.guestPasses !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}
      {(plan.maxFreezeDays > 0 || plan.features) && (
        <div className="px-5 mb-3 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          {plan.maxFreezeDays > 0 && <span className="flex items-center gap-1"><Snowflake size={9} /> {plan.maxFreezeDays} freeze days</span>}
          {plan.features && plan.features.split(',').map(f => f.trim()).filter(Boolean).map(f => (
            <span key={f} className="flex items-center gap-1"><BadgeCheck size={9} /> {f}</span>
          ))}
        </div>
      )}
      <div className="mt-auto px-5 py-3 border-t border-white/50 dark:border-slate-600/50 flex gap-2">
        <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium">
          <Pencil size={12} /> {t('gymEdit')}
        </button>
        <button onClick={onDelete} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium ml-auto">
          <Trash2 size={12} /> {t('gymDelete')}
        </button>
      </div>
    </div>
  )
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function PlanFormModal({ isOpen, onClose, initial, onSaved }: {
  isOpen: boolean; onClose: () => void; initial: Plan | null; onSaved: (p: Plan) => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<PlanForm>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'basic'|'sessions'|'amenities'|'display'>('basic')

  useEffect(() => {
    if (!isOpen) return
    setSection('basic')
    setForm(initial ? planToForm(initial) : defaultForm())
  }, [isOpen, initial])

  if (!isOpen) return null

  const set = (k: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price) { setSection('basic'); return }
    setSaving(true)
    try {
      const payload = buildPayload(form)
      let result: Plan
      if (initial) {
        result = await (window.api as any).gym?.plans?.update(initial.id, payload)
        toast.success('Plan updated')
      } else {
        result = await (window.api as any).gym?.plans?.create(payload)
        toast.success('Plan created')
      }
      onSaved(result); onClose()
    } catch (err: any) { toast.error(err.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const col = getColor(form.color)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{initial ? t('gymEditPlan') : t('gymNewPlan')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 px-2">
          {(['basic','sessions','amenities','display'] as const).map(s => (
            <button key={s} type="button" onClick={() => setSection(s)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 capitalize transition-all ${section === s ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">

            {section === 'basic' && (<>
              <div>
                <label className={labelCls}>{t('gymPlanName')} *</label>
                <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Premium Monthly" required />
              </div>
              <div>
                <label className={labelCls}>{t('gymPlanDescription')}</label>
                <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} placeholder="Short marketing description for members…" />
              </div>
              <div>
                <label className={labelCls}>{t('gymPlanCategory')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon; const sel = form.category === c.value
                    return (
                      <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${sel ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}>
                        <Icon size={14} className={sel ? 'text-orange-500' : 'text-slate-400'} />
                        <div><p className="text-xs font-semibold leading-tight">{c.label}</p><p className="text-[10px] opacity-60">{c.desc}</p></div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Duration</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DURATION_PRESETS.map(d => (
                      <button key={d.days} type="button" onClick={() => setForm(f => ({ ...f, durationDays: String(d.days) }))}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all ${form.durationDays === String(d.days) ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <input className={inputCls} type="number" min="1" value={form.durationDays} onChange={set('durationDays')} placeholder="Days" required />
                </div>
                <div>
                    <label className={labelCls}>{t('gymPlanPrice')} *</label>
                  <input className={inputCls} type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" required />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('gymPlanMaxFreeze')}</label>
                <input className={inputCls} type="number" min="0" value={form.maxFreezeDays} onChange={set('maxFreezeDays')} />
                <p className="text-[10px] text-slate-400 mt-1">How many days a member can pause this subscription</p>
              </div>
            </>)}

            {section === 'sessions' && (<>
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400">
                Set session limits. Leave blank for <strong>unlimited</strong>.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sessions per Week</label>
                  <input className={inputCls} type="number" min="1" max="14" value={form.sessionsPerWeek} onChange={set('sessionsPerWeek')} placeholder="Unlimited" />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. 3 visits/week</p>
                </div>
                <div>
                  <label className={labelCls}>Total Sessions Included</label>
                  <input className={inputCls} type="number" min="1" value={form.sessionsTotal} onChange={set('sessionsTotal')} placeholder="Unlimited" />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. 12 total sessions</p>
                </div>
              </div>
              <div>
                <label className={labelCls}>Personal Trainer (PT) Sessions Included</label>
                <input className={inputCls} type="number" min="0" value={form.coachSessions} onChange={set('coachSessions')} placeholder="0" />
                <p className="text-[10px] text-slate-400 mt-1">1-on-1 sessions with a coach. Set 0 if none included.</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Preview</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Per Week', val: form.sessionsPerWeek || '∞' },
                    { label: 'Total',    val: form.sessionsTotal || '∞' },
                    { label: 'PT',       val: form.coachSessions || '0' },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-slate-100 dark:bg-slate-700 rounded-lg py-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{val}</p>
                      <p className="text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>)}

            {section === 'amenities' && (<>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select all facilities & services included in this plan.</p>
              <div className="grid grid-cols-1 gap-2">
                {AMENITIES.map(a => {
                  const Icon = a.icon; const checked = form[a.key as keyof PlanForm] as boolean
                  return (
                    <label key={a.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'border-orange-300 dark:border-orange-700/60 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <input type="checkbox" checked={checked} onChange={e => setForm(f => ({ ...f, [a.key]: e.target.checked }))} className="sr-only" />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${checked ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Icon size={15} className={checked ? a.color : 'text-slate-400'} />
                      </div>
                      <p className={`flex-1 text-sm font-medium ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{a.label}</p>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'border-orange-500 bg-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        {checked && <CheckCircle size={12} className="text-white" />}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div>
                <label className={labelCls}>Guest Passes Included</label>
                <input className={inputCls} type="number" min="0" value={form.guestPasses} onChange={set('guestPasses')} placeholder="0" />
                <p className="text-[10px] text-slate-400 mt-1">Times member can bring a guest for free</p>
              </div>
              <div>
                <label className={labelCls}>Extra Perks (comma-separated)</label>
                <input className={inputCls} value={form.features} onChange={set('features')} placeholder="e.g. Free protein shake, Parking, Yoga mat" />
              </div>
            </>)}

            {section === 'display' && (<>
              <div>
                <label className={labelCls}>{t('gymPlanColor')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className={`relative w-9 h-9 rounded-full ${c.badge} transition-all ${form.color === c.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-400' : ''}`}
                      title={c.label}>
                      {form.color === c.value && <CheckCircle size={14} className="absolute inset-0 m-auto text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br ${col.from} ${col.to} dark:from-slate-700 dark:to-slate-700 p-4`}>
                <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">Card Preview</p>
                <div className="flex items-center gap-3">
                  <div>
                    <p className={`text-lg font-extrabold ${col.text}`}>${form.price || '0'}</p>
                    <p className="text-xs text-slate-500">{form.name || 'Plan Name'} · {form.durationDays || 30} days</p>
                  </div>
                  {form.isPopular && (
                    <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${col.badge}`}>
                      <Star size={8} fill="currentColor" /> POPULAR
                    </span>
                  )}
                </div>
              </div>
              {[
                { key: 'isPopular' as const, icon: Star, label: 'Mark as Popular', desc: 'Shows a "POPULAR" badge on the plan card', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                { key: 'isActive' as const, icon: CheckCircle, label: form.isActive ? 'Active — Available for new subscriptions' : 'Inactive — Hidden from new subscriptions', desc: 'Toggle to enable or disable', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              ].map(({ key, icon: Icon, label, desc, color, bg }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${form[key] ? bg : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Icon size={16} className={form[key] ? color : 'text-slate-400'} fill={key === 'isPopular' && form[key] ? 'currentColor' : 'none'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${form[key] ? 'border-orange-500 bg-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {form[key] && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              ))}
            </>)}
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 px-6 py-4 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              {t('gymCancel')}
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${col.btn}`}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? t('gymSave') : t('gymAddPlan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlansTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCat, setFilterCat] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await (window.api as any).gym?.plans?.getAll()
      setPlans(Array.isArray(data) ? data : [])
    } catch (err: any) { toast.error(err.message ?? 'Failed to load plans') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved(p: Plan) {
    setPlans(ps => {
      const idx = ps.findIndex(x => x.id === p.id)
      return idx >= 0 ? ps.map(x => x.id === p.id ? p : x) : [p, ...ps]
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.plans?.delete(deleteTarget.id)
      setPlans(ps => ps.filter(p => p.id !== deleteTarget.id))
      toast.success('Plan deleted'); setDeleteTarget(null)
    } catch (err: any) { toast.error(err.message ?? 'Delete failed') }
    finally { setDeleting(false) }
  }

  const counts: Record<string, number> = {}
  for (const p of plans) counts[p.category] = (counts[p.category] ?? 0) + 1
  const filtered = filterCat === 'all' ? plans : plans.filter(p => p.category === filterCat)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('gymSubscriptionPlans')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{plans.length} plan{plans.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-semibold rounded-xl transition-colors">
          <Plus size={14} /> {t('gymNewPlan')}
        </button>
      </div>

      {plans.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ value: 'all', label: `All (${plans.length})`, icon: ListChecks }, ...CATEGORIES.filter(c => counts[c.value] > 0).map(c => ({ ...c, label: `${c.label} (${counts[c.value]})` }))].map(c => {
            const Icon = c.icon; const sel = filterCat === c.value
            return (
              <button key={c.value} onClick={() => setFilterCat(c.value)}
                className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${sel ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-300'}`}>
                <Icon size={11} /> {c.label}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-400">
          <ListChecks size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{plans.length === 0 ? t('gymNoPlans') : t('gymNoProgramsMatch')}</p>
          {plans.length === 0 && <p className="text-xs mt-1">Create your first subscription plan to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PlanCard key={p.id} plan={p} onEdit={() => { setEditTarget(p); setShowForm(true) }} onDelete={() => setDeleteTarget(p)} />
          ))}
        </div>
      )}

      <PlanFormModal isOpen={showForm} onClose={() => setShowForm(false)} initial={editTarget} onSaved={handleSaved} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Delete "{deleteTarget.name}"?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Existing subscriptions using this plan will be unaffected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">{t('gymCancel')}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t('gymDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
