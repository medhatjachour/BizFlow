/**
 * ScheduleTab – Plan and track daily production runs
 */
import { useState, useEffect } from 'react'
import { Calendar, Plus, CheckCircle, PlayCircle, XCircle, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Recipe { id: string; name: string }
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

const STATUS_STYLES: Record<Status, string> = {
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
}

const EMPTY_FORM = {
  recipeId: '',
  scheduledDate: new Date().toISOString().split('T')[0],
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

  const load = async () => {
    setLoading(true)
    try {
      const [scheduleData, recipeData] = await Promise.all([
        window.api.bakery.getSchedule(),
        window.api.bakery.getRecipes()
      ])
      setItems(scheduleData)
      setRecipes(Array.isArray(recipeData) ? recipeData : recipeData ?? [])
    } catch {
      setError(t('bakeryScheduleLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.recipeId || !form.scheduledDate) return
    setSaving(true)
    try {
      await window.api.bakery.createScheduleItem({
        recipeId: form.recipeId,
        scheduledDate: form.scheduledDate,
        plannedQuantity: Number(form.plannedQuantity),
        notes: form.notes || undefined
      })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch {
      setError(t('bakeryScheduleSaveFailed'))
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('bakeryScheduleTab')}</h2>
          <p className="text-sm text-slate-500">{t('bakeryScheduleSubtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('bakeryAddSchedule')}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('bakeryAddSchedule')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-slate-500 mb-1">{t('bakerySelectRecipe')}</label>
              <select
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.recipeId}
                onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
              >
                <option value="">—</option>
                {recipes.map((r: Recipe) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryScheduledDate')}</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.scheduledDate}
                onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryPlannedQty')}</label>
              <input
                type="number" min="1"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.plannedQuantity}
                onChange={e => setForm(f => ({ ...f, plannedQuantity: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryNotesLabel')}</label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t('bakeryCancelBtn')}
            </button>
            <button
              onClick={save}
              disabled={saving || !form.recipeId}
              className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
            >
              {saving ? '…' : t('bakeryAddSchedule')}
            </button>
          </div>
        </div>
      )}

      {/* Groups */}
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
            <div key={date} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{date}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {dayItems.map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{item.recipe.name}</p>
                      <p className="text-xs text-slate-500">
                        {t('bakeryPlannedQty')}: {item.plannedQuantity}
                        {item.actualQuantity !== null && ` · ${t('bakeryActualQty')}: ${item.actualQuantity}`}
                        {item.notes && ` · ${item.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                        {statusLabel(item.status)}
                      </span>
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
