import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Info, QrCode, History, Pencil, Calendar, Phone, Mail, User, Ruler, Target, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import QRModal from '../../components/QRModal'
import TraineeFormModal from './TraineeFormModal'

type InnerTab = 'info' | 'measurements' | 'goals' | 'history' | 'qr'

interface Props {
  trainee: any
  onClose: () => void
  onEdited: (t: any) => void
}

function ProgressBar({ pct, color = 'bg-orange-500' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

function subStatusColor(status: string) {
  const map: Record<string, string> = { active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700', frozen: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700', expired: 'bg-red-100 dark:bg-red-900/30 text-red-600', cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500' }
  return map[status] ?? map.expired
}

export default function TraineeProfileModal({ trainee: initial, onClose, onEdited }: Props) {
  const toast = useToast()
  const [tab, setTab] = useState<InnerTab>('info')
  const [trainee, setTrainee] = useState<any>(initial)
  const [fullData, setFullData] = useState<any | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // ── Measurements ──
  const [measurements, setMeasurements] = useState<any[]>([])
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measForm, setMeasForm] = useState<any>({ date: new Date().toISOString().slice(0, 10), weight: '', bodyFat: '', muscle: '', waist: '', chest: '', arms: '', legs: '', notes: '' })
  const [savingMeas, setSavingMeas] = useState(false)

  // ── Goals ──
  const [goals, setGoals] = useState<any[]>([])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState<any>({ title: '', type: 'weight', targetValue: '', unit: 'kg', deadline: '', notes: '' })
  const [savingGoal, setSavingGoal] = useState(false)

  const loadFull = useCallback(async () => {
    setLoadingFull(true)
    try {
      const data = await (window.api as any).gym?.trainees?.getById(trainee.id)
      setFullData(data)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load details') }
    finally { setLoadingFull(false) }
  }, [trainee.id])

  useEffect(() => { loadFull() }, [loadFull])

  useEffect(() => {
    ;(window.api as any).gym?.measurements?.getAll(trainee.id).then(setMeasurements).catch(() => {})
    ;(window.api as any).gym?.goals?.getAll(trainee.id).then(setGoals).catch(() => {})
  }, [trainee.id])

  const d = fullData ?? trainee
  const activeSub = d.subscriptions?.find((s: any) => s.status === 'active') ?? d.subscriptions?.[0]

  let daysLeft = 0, totalDays = 0, progressPct = 0
  if (activeSub) {
    const now = Date.now()
    const start = new Date(activeSub.startDate).getTime()
    const end = new Date(activeSub.endDate).getTime()
    totalDays = Math.ceil((end - start) / 86_400_000)
    daysLeft = Math.ceil((end - now) / 86_400_000)
    progressPct = totalDays > 0 ? ((totalDays - Math.max(0, daysLeft)) / totalDays) * 100 : 100
  }

  function handleEdited(updated: any) {
    setTrainee(updated)
    onEdited(updated)
    setEditOpen(false)
    loadFull()
  }

  async function saveMeasurement() {
    setSavingMeas(true)
    try {
      const payload: any = { traineeId: trainee.id, date: measForm.date }
      const nums = ['weight', 'bodyFat', 'muscle', 'waist', 'chest', 'arms', 'legs']
      nums.forEach(k => { if (measForm[k] !== '') payload[k] = parseFloat(measForm[k]) })
      if (measForm.notes) payload.notes = measForm.notes
      const created = await (window.api as any).gym?.measurements?.create(payload)
      setMeasurements(prev => [created, ...prev])
      setShowMeasForm(false)
      setMeasForm({ date: new Date().toISOString().slice(0, 10), weight: '', bodyFat: '', muscle: '', waist: '', chest: '', arms: '', legs: '', notes: '' })
      toast.success('Measurement saved')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setSavingMeas(false) }
  }

  async function deleteMeasurement(id: string) {
    await (window.api as any).gym?.measurements?.delete(id)
    setMeasurements(prev => prev.filter(m => m.id !== id))
    toast.success('Deleted')
  }

  async function saveGoal() {
    setSavingGoal(true)
    try {
      const payload: any = { traineeId: trainee.id, title: goalForm.title, type: goalForm.type, notes: goalForm.notes, status: 'active' }
      if (goalForm.targetValue !== '') payload.targetValue = parseFloat(goalForm.targetValue)
      if (goalForm.unit) payload.unit = goalForm.unit
      if (goalForm.deadline) payload.deadline = goalForm.deadline
      const created = await (window.api as any).gym?.goals?.create(payload)
      setGoals(prev => [created, ...prev])
      setShowGoalForm(false)
      setGoalForm({ title: '', type: 'weight', targetValue: '', unit: 'kg', deadline: '', notes: '' })
      toast.success('Goal added')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setSavingGoal(false) }
  }

  async function markGoalAchieved(id: string) {
    const updated = await (window.api as any).gym?.goals?.markAchieved(id)
    setGoals(prev => prev.map(g => g.id === id ? updated : g))
    toast.success('Goal achieved! 🏅')
  }

  async function deleteGoal(id: string) {
    await (window.api as any).gym?.goals?.delete(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const tabCls = (t: InnerTab) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-sm font-bold text-orange-600">{trainee.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{trainee.name}</h3>
                <p className="text-xs text-slate-500">{trainee.phone ?? trainee.email ?? 'No contact info'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditOpen(true)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Inner tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
            <button className={tabCls('info')}         onClick={() => setTab('info')}><Info size={12} /> Info</button>
            <button className={tabCls('measurements')} onClick={() => setTab('measurements')}><Ruler size={12} /> Body</button>
            <button className={tabCls('goals')}        onClick={() => setTab('goals')}><Target size={12} /> Goals{goals.length > 0 ? ` (${goals.filter(g => g.status === 'active').length})` : ''}</button>
            <button className={tabCls('history')}      onClick={() => setTab('history')}><History size={12} /> History</button>
            <button className={tabCls('qr')}           onClick={() => setTab('qr')}><QrCode size={12} /> QR</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingFull && !fullData ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
            ) : tab === 'info' ? (
              <div className="space-y-5">
                {/* Active subscription card */}
                {activeSub ? (
                  <div className={`rounded-xl border p-4 ${activeSub.status === 'active' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40' : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{activeSub.plan?.name ?? 'Subscription'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${subStatusColor(activeSub.status)}`}>{activeSub.status}</span>
                    </div>
                    {activeSub.status === 'active' && (
                      <>
                        <ProgressBar pct={progressPct} />
                        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                          <span>Started {new Date(activeSub.startDate).toLocaleDateString()}</span>
                          <span className="font-medium">{Math.max(0, daysLeft)} days remaining</span>
                        </div>
                      </>
                    )}
                    {activeSub.status === 'frozen' && (
                      <p className="text-xs text-blue-600 mt-1">❄️ Subscription is frozen</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500">Coach: {activeSub.coach?.name ?? 'None'}</span>
                      <span className="text-xs text-slate-500">Paid: {activeSub.amountPaid?.toLocaleString() ?? '—'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 text-center text-sm text-slate-400">No active subscription</div>
                )}

                {/* Personal details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: Phone, label: 'Phone', value: d.phone },
                    { icon: Mail, label: 'Email', value: d.email },
                    { icon: Calendar, label: 'Date of Birth', value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
                    { icon: User, label: 'Gender', value: d.gender ? d.gender.charAt(0).toUpperCase() + d.gender.slice(1) : null },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400">{label}</p>
                        <p className="text-slate-700 dark:text-slate-200 text-xs">{value ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {d.address && <div className="text-xs text-slate-600 dark:text-slate-300"><span className="text-slate-400">Address: </span>{d.address}</div>}
                {(d.emergencyContact || d.emergencyPhone) && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-3 text-xs">
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-1">🚨 Emergency Contact</p>
                    <p className="text-slate-700 dark:text-slate-200">{d.emergencyContact ?? '—'} · {d.emergencyPhone ?? '—'}</p>
                  </div>
                )}
                {d.notes && <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3 text-xs text-slate-600 dark:text-slate-300">{d.notes}</div>}
              </div>

            ) : tab === 'qr' ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Scan this QR to identify this member</p>
                <button
                  onClick={() => setQrOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium rounded-xl transition-colors"
                >
                  <QrCode size={14} /> View QR Code
                </button>
              </div>

            ) : tab === 'measurements' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body Measurements</h4>
                  <button onClick={() => setShowMeasForm(v => !v)} className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700">
                    <Plus size={12} /> Add
                  </button>
                </div>
                {showMeasForm && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Date</p>
                        <input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={measForm.date} onChange={e => setMeasForm((f: any) => ({ ...f, date: e.target.value }))} />
                      </div>
                      {[['weight', 'Weight (kg)'], ['bodyFat', 'Body Fat (%)'], ['muscle', 'Muscle (kg)'], ['waist', 'Waist (cm)'], ['chest', 'Chest (cm)'], ['arms', 'Arms (cm)'], ['legs', 'Legs (cm)']].map(([k, lbl]) => (
                        <div key={k}>
                          <p className="text-[10px] text-slate-400 mb-1">{lbl}</p>
                          <input type="number" step="0.1" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={measForm[k]} onChange={e => setMeasForm((f: any) => ({ ...f, [k]: e.target.value }))} placeholder="—" />
                        </div>
                      ))}
                    </div>
                    <input type="text" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="Notes (optional)" value={measForm.notes} onChange={e => setMeasForm((f: any) => ({ ...f, notes: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={saveMeasurement} disabled={savingMeas} className="flex-1 py-1.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-xs font-medium rounded-lg disabled:opacity-50">
                        {savingMeas ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setShowMeasForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
                {measurements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No measurements recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {measurements.map((m, i) => {
                      const prev = measurements[i + 1]
                      const weightDelta = prev && m.weight != null && prev.weight != null ? (m.weight - prev.weight) : null
                      return (
                        <div key={m.id} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 p-3 group relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-800 dark:text-white">{new Date(m.date).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              {weightDelta != null && (
                                <span className={`text-[10px] font-bold ${weightDelta < 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                                </span>
                              )}
                              <button onClick={() => deleteMeasurement(m.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[['Weight', m.weight, 'kg'], ['Body Fat', m.bodyFat, '%'], ['Muscle', m.muscle, 'kg'], ['Waist', m.waist, 'cm'], ['Chest', m.chest, 'cm'], ['Arms', m.arms, 'cm'], ['Legs', m.legs, 'cm']].filter(([, v]) => v != null).map(([lbl, val, unit]) => (
                              <div key={String(lbl)} className="text-center">
                                <p className="text-[9px] text-slate-400">{lbl}</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{String(val)}<span className="text-[9px] font-normal text-slate-400">{unit}</span></p>
                              </div>
                            ))}
                          </div>
                          {m.notes && <p className="mt-1.5 text-[10px] text-slate-400 italic">{m.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            ) : tab === 'goals' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goals</h4>
                  <button onClick={() => setShowGoalForm(v => !v)} className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700">
                    <Plus size={12} /> Add Goal
                  </button>
                </div>
                {showGoalForm && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 p-4 space-y-2">
                    <input type="text" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="Goal title (e.g. Lose 10kg)" value={goalForm.title} onChange={e => setGoalForm((f: any) => ({ ...f, title: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <select className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={goalForm.type} onChange={e => setGoalForm((f: any) => ({ ...f, type: e.target.value }))}>
                        {[['weight', 'Weight Goal'], ['sessions', 'Sessions Goal'], ['measurement', 'Measurement'], ['custom', 'Custom']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <div className="flex gap-1">
                        <input type="number" className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="Target" value={goalForm.targetValue} onChange={e => setGoalForm((f: any) => ({ ...f, targetValue: e.target.value }))} />
                        <input type="text" className="w-14 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="unit" value={goalForm.unit} onChange={e => setGoalForm((f: any) => ({ ...f, unit: e.target.value }))} />
                      </div>
                    </div>
                    <input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={goalForm.deadline} onChange={e => setGoalForm((f: any) => ({ ...f, deadline: e.target.value }))} />
                    <input type="text" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="Notes" value={goalForm.notes} onChange={e => setGoalForm((f: any) => ({ ...f, notes: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={saveGoal} disabled={savingGoal || !goalForm.title} className="flex-1 py-1.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-xs font-medium rounded-lg disabled:opacity-50">
                        {savingGoal ? 'Saving…' : 'Save Goal'}
                      </button>
                      <button onClick={() => setShowGoalForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
                {goals.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No goals set yet</p>
                ) : (
                  <div className="space-y-2">
                    {goals.map(g => (
                      <div key={g.id} className={`rounded-xl border p-3 group relative ${g.status === 'achieved' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-700/40 border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {g.status === 'achieved' && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                              <p className={`text-xs font-semibold ${g.status === 'achieved' ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{g.title}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 capitalize">{g.type}</span>
                              {g.targetValue != null && <span className="text-[10px] text-slate-500">Target: {g.targetValue}{g.unit ? ` ${g.unit}` : ''}</span>}
                              {g.deadline && <span className="text-[10px] text-slate-400">Due: {new Date(g.deadline).toLocaleDateString()}</span>}
                            </div>
                            {g.notes && <p className="text-[10px] text-slate-400 italic mt-1">{g.notes}</p>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {g.status === 'active' && (
                              <button onClick={() => markGoalAchieved(g.id)} title="Mark achieved" className="p-1 rounded text-slate-400 hover:text-emerald-500">
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button onClick={() => deleteGoal(g.id)} className="p-1 rounded text-slate-400 hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (
              /* History */
              <div className="space-y-4">
                {/* Subscriptions */}
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription History</h4>
                {(d.subscriptions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-400">No subscriptions yet</p>
                ) : (
                  <div className="space-y-2">
                    {d.subscriptions?.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{s.plan?.name ?? 'Plan'}</p>
                          <p className="text-xs text-slate-400">{new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${subStatusColor(s.status)}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent sessions */}
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Recent Sessions</h4>
                {(d.sessions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-400">No sessions recorded</p>
                ) : (
                  <div className="space-y-1">
                    {d.sessions?.slice(0, 20).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                        <span className="text-slate-600 dark:text-slate-300">{new Date(s.date).toLocaleDateString()}</span>
                        <span className="capitalize text-slate-400">{s.type === 'walkin' ? '🚶 Walk-in' : '✅ Visit'}</span>
                        {s.amount > 0 && <span className="text-orange-600 font-medium">{s.amount.toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <TraineeFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={handleEdited} initial={trainee} />
      )}
      <QRModal isOpen={qrOpen} onClose={() => setQrOpen(false)} type="gym_trainee" id={trainee.id} name={trainee.name} />
    </>
  )
}
