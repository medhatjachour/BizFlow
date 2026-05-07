/**
 * ScheduleTab – Plan and track daily production runs
 */
import { useState, useEffect } from 'react'
import { Calendar, Plus, CheckCircle, PlayCircle, XCircle, Trash2, Clock, ChefHat, Hash, FileText, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Recipe { id: string; name: string; yieldQty?: number; yieldUnit?: string }
interface ScheduleItem {
  id: string
  scheduledDate: string
  plannedQuantity: number
  actualQuantity: number | null
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled'
  notes: string | null
  recipe: { id: string; name: string; yieldQty: number; yieldUnit: string }
}

type Status = 'planned' | 'in-progress' | 'completed' | 'cancelled'

const STATUS_STYLES: Record<Status, { chip: string; dot: string }> = {
  planned:      { chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   dot: 'bg-blue-500' },
  'in-progress':{ chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  completed:    { chip: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
  cancelled:    { chip: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',   dot: 'bg-slate-400' }
}

const FIELD_CLS = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors'
const LABEL_CLS = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'

function dateOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  recipeId: '',
  scheduledDate: dateOffset(0),
  plannedQuantity: 1,
  notes: ''
}

export default function ScheduleTab() {
  const { t } = useLanguage()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [scheduleData, recipeData] = await Promise.all([
        window.api.bakery.getSchedule(),
        window.api.bakery.getRecipes()
      ])
      const rawSchedule = scheduleData?.data ?? scheduleData
      setItems(Array.isArray(rawSchedule) ? rawSchedule : [])
      setRecipes(Array.isArray(recipeData) ? recipeData : recipeData ?? [])
    } catch {
      setError(t('bakeryScheduleLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openForm = () => { setForm({ ...EMPTY_FORM }); setFormError(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setFormError('') }

  const save = async () => {
    if (!form.recipeId) { setFormError('Please select a recipe'); return }
    if (!form.scheduledDate) { setFormError('Please pick a date'); return }
    if (Number(form.plannedQuantity) < 1) { setFormError('Quantity must be at least 1'); return }
    setFormError('')
    setSaving(true)
    try {
      await window.api.bakery.createScheduleItem({
        recipeId: form.recipeId,
        scheduledDate: form.scheduledDate,
        plannedQuantity: Number(form.plannedQuantity),
        notes: form.notes || undefined
      })
      closeForm()
      load()
    } catch {
      setFormError(t('bakeryScheduleSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: Status, actualQuantity?: number) => {
    try {
      await window.api.bakery.updateScheduleItem({ id, status, ...(actualQuantity !== undefined && { actualQuantity }) })
      load()
    } catch {
      setError(t('bakeryScheduleSaveFailed'))
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('bakeryDeleteScheduleConfirm'))) return
    try {
      await window.api.bakery.deleteScheduleItem(id)
      load()
    } catch {
      setError(t('bakeryScheduleLoadFailed'))
    }
  }

  // Group by date
  const grouped = items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const date = new Date(item.scheduledDate).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    ;(acc[date] = acc[date] || []).push(item)
    return acc
  }, {})

  const statusLabel = (s: Status) => {
    const map: Record<Status, string> = {
      planned: t('bakeryStatusPlanned'),
      'in-progress': t('bakeryStatusInProgress'),
      completed: t('bakeryStatusCompleted'),
      cancelled: t('bakeryStatusCancelled')
    }
    return map[s] ?? s
  }

  // Counts for header chips
  const counts = { planned: 0, 'in-progress': 0, completed: 0, cancelled: 0 }
  items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1 })

  // Selected recipe details for preview in form
  const selectedRecipe = recipes.find(r => r.id === form.recipeId)

  const DATE_CHIPS = [
    { label: 'Today', value: dateOffset(0) },
    { label: 'Tomorrow', value: dateOffset(1) },
    { label: 'In 2 days', value: dateOffset(2) },
    { label: 'Next week', value: dateOffset(7) }
  ]

  const QTY_PRESETS = [1, 2, 5, 10, 25, 50]

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('bakeryScheduleTab')}</h2>
          <p className="text-sm text-slate-500">{t('bakeryScheduleSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary chips */}
          {items.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {counts['in-progress'] > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                  {counts['in-progress']} active
                </span>
              )}
              {counts.planned > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  {counts.planned} planned
                </span>
              )}
            </div>
          )}
          <button
            onClick={openForm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t('bakeryAddSchedule')}
          </button>
        </div>
      </div>

      {/* ── Add to Schedule modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('bakeryAddSchedule')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Schedule a production run</p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors text-lg leading-none"
              >&times;</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Recipe ── */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><ChefHat className="h-3.5 w-3.5" /> Recipe <span className="text-red-500">*</span></span>
                </label>
                <select
                  className={FIELD_CLS}
                  value={form.recipeId}
                  onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
                >
                  <option value="">— Select a recipe —</option>
                  {recipes.map((r: Recipe) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {selectedRecipe && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <ChefHat className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{selectedRecipe.name}</span>
                    {selectedRecipe.yieldQty && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-auto">
                        Yields {selectedRecipe.yieldQty} {selectedRecipe.yieldUnit ?? 'pcs'} per batch
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Date ── */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t('bakeryScheduledDate')} <span className="text-red-500">*</span></span>
                </label>
                {/* Quick chips */}
                <div className="flex gap-2 mb-2 flex-wrap">
                  {DATE_CHIPS.map(chip => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, scheduledDate: chip.value }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        form.scheduledDate === chip.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >{chip.label}</button>
                  ))}
                </div>
                <input
                  type="date"
                  className={FIELD_CLS}
                  value={form.scheduledDate}
                  onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>

              {/* ── Quantity ── */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {t('bakeryPlannedQty')} <span className="text-red-500">*</span></span>
                </label>
                {/* Preset chips */}
                <div className="flex gap-2 mb-2 flex-wrap">
                  {QTY_PRESETS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, plannedQuantity: q }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        form.plannedQuantity === q
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >{q}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, plannedQuantity: Math.max(1, f.plannedQuantity - 1) }))}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg leading-none font-bold"
                  >−</button>
                  <input
                    type="number" min="1"
                    className={`${FIELD_CLS} text-center font-semibold text-base`}
                    value={form.plannedQuantity}
                    onChange={e => setForm(f => ({ ...f, plannedQuantity: Math.max(1, Number(e.target.value)) }))}
                  />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, plannedQuantity: f.plannedQuantity + 1 }))}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg leading-none font-bold"
                  >+</button>
                </div>
                {selectedRecipe?.yieldQty && form.plannedQuantity > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Total yield: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{(form.plannedQuantity * selectedRecipe.yieldQty).toLocaleString()} {selectedRecipe.yieldUnit ?? 'pcs'}</span>
                  </p>
                )}
              </div>

              {/* ── Notes ── */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {t('bakeryNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></span>
                </label>
                <textarea
                  rows={3}
                  className={`${FIELD_CLS} resize-none`}
                  placeholder="Any special instructions, priorities, or reminders..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
              {formError && (
                <div className="flex items-center gap-2 mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="text-xs text-slate-400">
                  {form.scheduledDate && (
                    <span>
                      {new Date(form.scheduledDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeForm}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  >
                    {t('bakeryCancelBtn')}
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || !form.recipeId}
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {saving ? <><span className="animate-spin inline-block">⟳</span> Scheduling…</> : <><Calendar className="h-3.5 w-3.5" /> Schedule Run</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule list ── */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('bakeryLoadingRecipes')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t('bakeryNoSchedule')}</p>
          <p className="text-slate-400 text-sm">{t('bakeryNoScheduleDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{date}</span>
                </div>
                <span className="text-xs text-slate-400">{dayItems.length} run{dayItems.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {dayItems.map(item => (
                  <div key={item.id} className="px-4 py-3.5 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status].chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[item.status].dot}`} />
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.recipe.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('bakeryPlannedQty')}: <span className="font-medium text-slate-700 dark:text-slate-300">{item.plannedQuantity}</span>
                        {item.actualQuantity !== null && (
                          <> · {t('bakeryActualQty')}: <span className="font-medium text-green-600">{item.actualQuantity}</span></>
                        )}
                        {item.recipe.yieldQty && (
                          <> · Yield: ~{(item.plannedQuantity * item.recipe.yieldQty).toLocaleString()} {item.recipe.yieldUnit}</>
                        )}
                        {item.notes && <> · <span className="italic">{item.notes}</span></>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === 'planned' && (
                        <button
                          onClick={() => updateStatus(item.id, 'in-progress')}
                          title={t('bakeryMarkInProgress')}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </button>
                      )}
                      {item.status === 'in-progress' && (
                        <button
                          onClick={() => updateStatus(item.id, 'completed', item.plannedQuantity)}
                          title={t('bakeryMarkComplete')}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {item.status !== 'cancelled' && item.status !== 'completed' && (
                        <button
                          onClick={() => updateStatus(item.id, 'cancelled')}
                          title={t('bakeryStatusCancelled')}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
