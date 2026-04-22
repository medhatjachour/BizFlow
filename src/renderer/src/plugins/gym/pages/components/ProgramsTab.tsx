import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2, Dumbbell, Pencil, X, ChevronLeft, User, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

const GOAL_OPTIONS = ['weight loss', 'muscle gain', 'endurance', 'flexibility', 'general fitness']

const GOAL_BADGE: Record<string, string> = {
  'weight loss':    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'muscle gain':    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'endurance':      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'flexibility':    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'general fitness':'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

/* ─── Program Create / Edit Modal ─── */
function ProgramFormModal({ initial, coaches, onClose, onSaved }: {
  initial?: any; coaches: any[]; onClose: () => void; onSaved: (p: any) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    goal:        initial?.goal        ?? 'general fitness',
    weeksTotal:  initial?.weeksTotal  ?? 4,
    daysPerWeek: initial?.daysPerWeek ?? 3,
    coachId:     initial?.coachId     ?? initial?.coach?.id ?? '',
    isActive:    initial?.isActive    ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        goal: form.goal,
        weeksTotal: Number(form.weeksTotal),
        daysPerWeek: Number(form.daysPerWeek),
        isActive: form.isActive,
        coachId: form.coachId || undefined,
      }
      let result: any
      if (initial) {
        result = await (window.api.gym as any)?.programs.update({ id: initial.id, data: payload })
        toast.success('Program updated')
      } else {
        result = await (window.api.gym as any)?.programs.create(payload)
        toast.success('Program created')
      }
      onSaved(result)
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{initial ? 'Edit Program' : 'New Program'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Program Name *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. 12-Week Fat Loss Challenge" required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={set('description')} placeholder="What is this program about? Who is it for?" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Goal</label>
              <select className={inputCls} value={form.goal} onChange={set('goal')}>
                {GOAL_OPTIONS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration (weeks)</label>
              <input type="number" min={1} max={52} className={inputCls} value={form.weeksTotal} onChange={set('weeksTotal')} />
            </div>
            <div>
              <label className={labelCls}>Days per Week</label>
              <input type="number" min={1} max={7} className={inputCls} value={form.daysPerWeek} onChange={set('daysPerWeek')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Assigned Coach</label>
            <select className={inputCls} value={form.coachId} onChange={set('coachId')}>
              <option value="">— No specific coach —</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name}{c.specialty ? ` · ${c.specialty}` : ''}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
            <input type="checkbox" id="prog-active" className="w-4 h-4 accent-orange-500 cursor-pointer"
              checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            <label htmlFor="prog-active" className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              Active — visible and assignable to members
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Add Day Modal ─── */
function DayFormModal({ program, onClose, onSaved }: { program: any; onClose: () => void; onSaved: (d: any) => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ weekNumber: 1, dayNumber: 1, name: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await (window.api.gym as any)?.programs.addDay({
        programId: program.id,
        weekNumber: Number(form.weekNumber),
        dayNumber: Number(form.dayNumber),
        name: form.name.trim() || undefined,
      })
      toast.success('Day added')
      onSaved(created)
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Add Training Day</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Week #</label>
              <input type="number" min={1} max={program.weeksTotal ?? 52} className={inputCls} value={form.weekNumber} onChange={set('weekNumber')} />
            </div>
            <div>
              <label className={labelCls}>Day # (1–7)</label>
              <input type="number" min={1} max={7} className={inputCls} value={form.dayNumber} onChange={set('dayNumber')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Day Name / Focus</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Push Day, Leg Day, Rest…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Add Exercise Modal ─── */
function ExerciseFormModal({ day, onClose, onSaved }: { day: any; onClose: () => void; onSaved: (ex: any) => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', sets: '3', reps: '10', weight: '', restSec: '60', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const created = await (window.api.gym as any)?.programs.addExercise({
        dayId: day.id,
        name: form.name.trim(),
        sets: Number(form.sets),
        reps: form.reps || '10',
        weight: form.weight.trim() || undefined,
        restSec: Number(form.restSec) || undefined,
        notes: form.notes.trim() || undefined,
      })
      toast.success('Exercise added')
      onSaved(created)
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Add Exercise</h3>
            <p className="text-xs text-slate-500">W{day.weekNumber} D{day.dayNumber}{day.name ? ` · ${day.name}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Exercise Name *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Barbell Squat" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sets</label>
              <input type="number" min={1} className={inputCls} value={form.sets} onChange={set('sets')} />
            </div>
            <div>
              <label className={labelCls}>Reps / Duration</label>
              <input className={inputCls} value={form.reps} onChange={set('reps')} placeholder="e.g. 10, 8–12, AMRAP" />
            </div>
            <div>
              <label className={labelCls}>Weight / Load</label>
              <input className={inputCls} value={form.weight} onChange={set('weight')} placeholder="e.g. 60kg, Bodyweight" />
            </div>
            <div>
              <label className={labelCls}>Rest (seconds)</label>
              <input type="number" min={0} className={inputCls} value={form.restSec} onChange={set('restSec')} placeholder="60" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes / Cues</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} placeholder="Form tips, tempo, modifications…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Assign to Member Modal ─── */
function AssignMemberModal({ program, onClose, onSaved }: { program: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await (window.api.gym as any)?.trainees.searchLite(search).catch(() => [])
      setResults(res ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      await (window.api.gym as any)?.programs.assign({
        programId: program.id,
        traineeId: selected.id,
        startDate: startDate || undefined,
        notes: notes.trim() || undefined,
      })
      toast.success(`"${program.name}" assigned to ${selected.name}`)
      onSaved()
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <User size={16} className="text-orange-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Assign to Member</h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">{program.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Member *</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder="Search by name or phone…" value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }} />
            </div>
            {results.length > 0 && !selected && (
              <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-lg">
                {results.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelected(m); setSearch(m.name); setResults([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors">
                    <span className="font-medium text-slate-900 dark:text-white">{m.name}</span>
                    {m.phone && <span className="text-slate-400 ml-2 text-xs">{m.phone}</span>}
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{selected.name.charAt(0)}</div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{selected.name}</span>
                {selected.phone && <span className="text-xs text-slate-400">{selected.phone}</span>}
                <button type="button" onClick={() => { setSelected(null); setSearch('') }} className="ml-auto p-1 text-slate-400 hover:text-red-500 rounded transition-colors"><X size={12} /></button>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific instructions for this member…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving || !selected} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Assigning…' : 'Assign Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Program Detail View ─── */
function ProgramDetail({ program: initial, coaches, onBack, onProgramUpdated }: {
  program: any; coaches: any[]; onBack: () => void; onProgramUpdated: (p: any) => void
}) {
  const toast = useToast()
  const [program, setProgram] = useState<any>(initial)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [dayFormOpen, setDayFormOpen] = useState(false)
  const [exFormDay, setExFormDay] = useState<any | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const full = await (window.api.gym as any)?.programs.getById(program.id)
      setProgram(full)
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [program.id])

  useEffect(() => { reload() }, [reload])

  async function deleteDay(dayId: string) {
    try {
      await (window.api.gym as any)?.programs.deleteDay(dayId)
      setProgram((p: any) => ({ ...p, days: p.days.filter((d: any) => d.id !== dayId) }))
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  async function deleteExercise(dayId: string, exId: string) {
    try {
      await (window.api.gym as any)?.programs.deleteExercise(exId)
      setProgram((p: any) => ({
        ...p,
        days: p.days.map((d: any) => d.id === dayId ? { ...d, exercises: d.exercises.filter((ex: any) => ex.id !== exId) } : d)
      }))
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  const days: any[] = [...(program.days ?? [])].sort((a, b) => (a.weekNumber - b.weekNumber) || (a.dayNumber - b.dayNumber))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors mt-0.5">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{program.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${GOAL_BADGE[program.goal] ?? GOAL_BADGE['general fitness']}`}>{program.goal}</span>
                  <span className="text-xs text-slate-500">{program.weeksTotal} weeks · {program.daysPerWeek} days/wk</span>
                  {program.coach && <span className="text-xs text-slate-500">· 👤 {program.coach.name}</span>}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${program.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{program.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                {program.description && <p className="text-sm text-slate-500 mt-1.5">{program.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setAssignOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors">
                  <User size={12} /> Assign
                </button>
                <button onClick={() => setEditOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Day */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{days.length} Training Day{days.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setDayFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={14} /> Add Day
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-slate-400">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-sm font-medium">No days added yet</p>
          <p className="text-xs mt-1">Click "Add Day" to build the schedule</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <div key={day.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                onClick={() => setExpandedDays(prev => ({ ...prev, [day.id]: !prev[day.id] }))}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-600">W{day.weekNumber}<br className="hidden" />D{day.dayNumber}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Week {day.weekNumber} · Day {day.dayNumber}
                      {day.name ? <span className="text-slate-500 font-normal"> — {day.name}</span> : null}
                    </p>
                    <p className="text-xs text-slate-400">{day.exercises?.length ?? 0} exercise{day.exercises?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); deleteDay(day.id) }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {expandedDays[day.id] ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </div>

              {/* Exercises */}
              {expandedDays[day.id] && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-2">
                  {(day.exercises ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No exercises yet</p>
                  ) : (
                    <div className="space-y-2">
                      {[...(day.exercises ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((ex: any) => (
                        <div key={ex.id}
                          className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2.5 group">
                          <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-500">{ex.order ?? '—'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ex.name}</p>
                            <p className="text-xs text-slate-500">
                              {ex.sets} sets × {ex.reps} reps
                              {ex.weight ? ` · ${ex.weight}` : ''}
                              {ex.restSec ? ` · ${ex.restSec}s rest` : ''}
                            </p>
                            {ex.notes && <p className="text-xs text-slate-400 italic mt-0.5">{ex.notes}</p>}
                          </div>
                          <button onClick={() => deleteExercise(day.id, ex.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setExFormDay(day)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-orange-600 border border-dashed border-orange-300 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                    <Plus size={13} /> Add Exercise
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {editOpen && (
        <ProgramFormModal initial={program} coaches={coaches} onClose={() => setEditOpen(false)} onSaved={p => { setProgram(p); onProgramUpdated(p); setEditOpen(false) }} />
      )}
      {dayFormOpen && (
        <DayFormModal program={program} onClose={() => setDayFormOpen(false)} onSaved={d => { setProgram((p: any) => ({ ...p, days: [...(p.days ?? []), d] })); setDayFormOpen(false) }} />
      )}
      {exFormDay && (
        <ExerciseFormModal day={exFormDay} onClose={() => setExFormDay(null)} onSaved={ex => {
          setProgram((p: any) => ({ ...p, days: p.days.map((d: any) => d.id === exFormDay.id ? { ...d, exercises: [...(d.exercises ?? []), ex] } : d) }))
          setExFormDay(null)
        }} />
      )}
      {assignOpen && (
        <AssignMemberModal program={program} onClose={() => setAssignOpen(false)} onSaved={() => setAssignOpen(false)} />
      )}
    </div>
  )
}

/* ─── Main Tab ─── */
export default function ProgramsTab() {
  const toast = useToast()
  const [programs, setPrograms] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [detailTarget, setDetailTarget] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [progs, coachRes] = await Promise.all([
        (window.api.gym as any)?.programs.getAll(),
        (window.api.gym as any)?.coaches.getAll(),
      ])
      setPrograms(Array.isArray(progs) ? progs : (progs?.data ?? []))
      setCoaches(Array.isArray(coachRes) ? coachRes : (coachRes?.data ?? []))
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setSearch(searchInput) }

  const filtered = programs.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.goal?.toLowerCase().includes(search.toLowerCase()) ||
    p.coach?.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Show detail view
  if (detailTarget) {
    return (
      <ProgramDetail
        program={detailTarget}
        coaches={coaches}
        onBack={() => setDetailTarget(null)}
        onProgramUpdated={updated => {
          setPrograms(ps => ps.map(p => p.id === updated.id ? updated : p))
          setDetailTarget(updated)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Search by name, goal, coach…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Search</button>
        </form>
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap">
          <Plus size={14} /> New Program
        </button>
      </div>

      {!loading && <p className="text-xs text-slate-400">{filtered.length} program{filtered.length !== 1 ? 's' : ''}</p>}

      {/* Content */}
      {loading && programs.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🏋️</span>
          <p className="text-sm font-medium">{programs.length === 0 ? 'No programs yet' : 'No programs match your search'}</p>
          {programs.length === 0 && <p className="text-xs mt-1">Click "New Program" to create your first training program</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800/40 transition-all"
              onClick={() => setDetailTarget(p)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <Dumbbell size={16} className="text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{p.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${GOAL_BADGE[p.goal] ?? GOAL_BADGE['general fitness']}`}>{p.goal}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${p.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <p>📅 {p.weeksTotal} weeks · {p.daysPerWeek} days/week</p>
                {p.coach && <p>👤 {p.coach.name}</p>}
                {p.description && <p className="line-clamp-2 italic">{p.description}</p>}
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <button onClick={e => { e.stopPropagation(); setEditTarget(p) }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-600 transition-colors">
                  <Pencil size={11} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {formOpen && (
        <ProgramFormModal coaches={coaches} onClose={() => setFormOpen(false)} onSaved={p => { setPrograms(ps => [p, ...ps]); setFormOpen(false) }} />
      )}
      {editTarget && (
        <ProgramFormModal initial={editTarget} coaches={coaches} onClose={() => setEditTarget(null)}
          onSaved={p => { setPrograms(ps => ps.map(x => x.id === p.id ? p : x)); setEditTarget(null) }} />
      )}
    </div>
  )
}
