import { useState, useEffect } from 'react'
import { X, Pencil, QrCode, Info, Users, Activity, Zap, Calendar, TrendingUp, AlertTriangle, DollarSign, Clock, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import QRModal from '../../components/QRModal'
import CoachFormModal from './CoachFormModal'

type InnerTab = 'info' | 'trainees' | 'activity' | 'shifts' | 'qr'

interface Props {
  coach: any
  onClose: () => void
  onEdited: (c: any) => void
}

interface Stats {
  sessionsToday: number
  sessionsWeek: number
  sessionsMonth: number
  activeTrainees: number
  uniqueTrainees: number
  totalRevenue: number
  expiringSoon: number
  subscriptions: any[]
}

const statusColors: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  expired:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  frozen:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

export default function CoachProfileModal({ coach: initial, onClose, onEdited }: Props) {
  const [coach, setCoach] = useState<any>(initial)
  const [tab, setTab]     = useState<InnerTab>('info')
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen]     = useState(false)
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts]   = useState<any[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', endTime: '17:00', notes: '' })
  const [savingShift, setSavingShift] = useState(false)

  useEffect(() => {
    setLoading(true)
    ;(window.api.gym as any)?.coaches.getStats(coach.id)
      .then((s: Stats) => setStats(s))
      .finally(() => setLoading(false))
  }, [coach.id])

  function getWeekStart(offset: number) {
    const d = new Date()
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  useEffect(() => {
    const ws = getWeekStart(weekOffset)
    ;(window.api.gym as any)?.shifts.getAll({ coachId: coach.id, weekStart: ws.toISOString() })
      .then(setShifts)
      .catch(() => {})
  }, [coach.id, weekOffset])

  async function saveShift() {
    setSavingShift(true)
    try {
      const created = await (window.api.gym as any)?.shifts.create({ coachId: coach.id, date: shiftForm.date, startTime: shiftForm.startTime, endTime: shiftForm.endTime, notes: shiftForm.notes || undefined })
      setShifts(prev => [...prev, created])
      setShowShiftForm(false)
      setShiftForm({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', endTime: '17:00', notes: '' })
    } catch (e: any) { console.error(e) }
    finally { setSavingShift(false) }
  }

  async function deleteShift(id: string) {
    await (window.api.gym as any)?.shifts.delete(id)
    setShifts(prev => prev.filter(s => s.id !== id))
  }

  function handleEdited(updated: any) {
    setCoach(updated)
    onEdited(updated)
    setEditOpen(false)
  }

  const tabCls = (t: InnerTab) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
      tab === t ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`

  const statCards = [
    { label: 'Active\nMembers', value: stats?.activeTrainees ?? 0, icon: Users,       color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Today',          value: stats?.sessionsToday  ?? 0, icon: Zap,         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'This Week',      value: stats?.sessionsWeek   ?? 0, icon: Calendar,    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'This Month',     value: stats?.sessionsMonth  ?? 0, icon: TrendingUp,  color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-base font-bold text-orange-600">
                {coach.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{coach.name}</h3>
                <p className="text-xs text-slate-500">{coach.specialty ?? 'Coach'} · {coach.isActive ? '🟢 Active' : '⚫ Inactive'}</p>
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

          {/* ── Stat chips (always visible) ── */}
          <div className="grid grid-cols-4 gap-2 px-6 py-3 border-b border-slate-100 dark:border-slate-700">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`flex flex-col items-center gap-1 rounded-xl p-2.5 ${color}`}>
                <Icon size={13} />
                <span className="text-lg font-bold leading-none">{loading ? '…' : value}</span>
                <span className="text-[9px] font-medium text-center leading-tight whitespace-pre-line opacity-75">{label}</span>
              </div>
            ))}
          </div>

          {/* ── Inner tabs ── */}
          <div className="flex gap-1 px-6 py-2 border-b border-slate-100 dark:border-slate-700">
            <button className={tabCls('info')}     onClick={() => setTab('info')}><Info size={12} /> Info</button>
            <button className={tabCls('trainees')} onClick={() => setTab('trainees')}>
              <Users size={12} /> Trainees{stats ? ` (${stats.uniqueTrainees})` : ''}
            </button>
            <button className={tabCls('activity')} onClick={() => setTab('activity')}><Activity size={12} /> Activity</button>
            <button className={tabCls('shifts')}   onClick={() => setTab('shifts')}><Clock size={12} /> Shifts</button>
            <button className={tabCls('qr')}       onClick={() => setTab('qr')}><QrCode size={12} /> QR</button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* INFO */}
            {tab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Phone',    value: coach.phone },
                    { label: 'Email',    value: coach.email },
                    { label: 'National ID', value: coach.nationalId },
                    { label: 'Hire Date',   value: coach.hireDate ? new Date(coach.hireDate).toLocaleDateString() : null },
                    { label: 'Salary',      value: coach.salary != null ? `${coach.salary.toLocaleString()} / ${coach.salaryType?.replace('_', ' ')}` : null },
                    { label: 'Status',      value: coach.isActive ? 'Active' : 'Inactive' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className="text-slate-700 dark:text-slate-200 text-xs">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>

                {stats && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3 text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.uniqueTrainees}</p>
                      <p className="text-[10px] text-slate-400">All Members</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{stats.expiringSoon}</p>
                      <p className="text-[10px] text-slate-400">Expiring ≤7 days</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3 text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">Revenue</p>
                    </div>
                  </div>
                )}

                {coach.notes && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                    {coach.notes}
                  </div>
                )}
              </div>
            )}

            {/* TRAINEES */}
            {tab === 'trainees' && (
              <div className="space-y-2">
                {loading && <p className="text-center text-sm text-slate-400 py-8">Loading…</p>}
                {!loading && (!stats || stats.subscriptions.length === 0) && (
                  <p className="text-center text-sm text-slate-400 py-8">No trainees assigned yet</p>
                )}
                {!loading && stats && [...stats.subscriptions]
                  .sort((a, b) => {
                    if (a.status === 'active' && b.status !== 'active') return -1
                    if (b.status === 'active' && a.status !== 'active') return 1
                    return 0
                  })
                  .map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                          {sub.trainee?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{sub.trainee?.name ?? 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400">{[sub.trainee?.phone, sub.plan?.name].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[sub.status] ?? statusColors.cancelled}`}>
                          {sub.status}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {sub.status === 'active'
                            ? `Until ${new Date(sub.endDate).toLocaleDateString()}`
                            : `Ended ${new Date(sub.endDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ACTIVITY */}
            {tab === 'activity' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Today',      value: stats?.sessionsToday  ?? 0, icon: Zap,        color: 'text-blue-600' },
                    { label: 'This Week',  value: stats?.sessionsWeek   ?? 0, icon: Calendar,   color: 'text-orange-600' },
                    { label: 'This Month', value: stats?.sessionsMonth  ?? 0, icon: TrendingUp, color: 'text-purple-600' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4 text-center">
                      <Icon size={18} className={`mx-auto mb-2 ${color}`} />
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{loading ? '…' : value}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {stats && stats.expiringSoon > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">{stats.expiringSoon}</span> subscription{stats.expiringSoon !== 1 ? 's' : ''} expiring within 7 days
                    </p>
                  </div>
                )}

                {stats && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Total Revenue Generated</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign size={28} className="text-slate-200 dark:text-slate-600" />
                  </div>
                )}
              </div>
            )}

            {/* SHIFTS */}
            {tab === 'shifts' && (
              <div className="space-y-3">
                {/* Week navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const ws = getWeekStart(weekOffset)
                      const we = new Date(ws); we.setDate(ws.getDate() + 6)
                      return `${ws.toLocaleDateString()} – ${we.toLocaleDateString()}`
                    })()}
                  </span>
                  <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><ChevronRight size={14} /></button>
                </div>

                <button onClick={() => setShowShiftForm(v => !v)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-orange-600 border border-dashed border-orange-300 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                  <Plus size={12} /> Add Shift
                </button>

                {showShiftForm && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <p className="text-[10px] text-slate-400 mb-1">Date</p>
                        <input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={shiftForm.date} onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Start</p>
                        <input type="time" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={shiftForm.startTime} onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">End</p>
                        <input type="time" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value={shiftForm.endTime} onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Notes</p>
                        <input type="text" className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white" placeholder="Optional" value={shiftForm.notes} onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveShift} disabled={savingShift} className="flex-1 py-1.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-xs font-medium rounded-lg disabled:opacity-50">
                        {savingShift ? 'Saving…' : 'Save Shift'}
                      </button>
                      <button onClick={() => setShowShiftForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}

                {shifts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No shifts this week</p>
                ) : (
                  <div className="space-y-2">
                    {shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 px-4 py-3 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Clock size={13} className="text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            <p className="text-[10px] text-slate-400">{s.startTime} – {s.endTime}</p>
                            {s.notes && <p className="text-[10px] text-slate-400 italic">{s.notes}</p>}
                          </div>
                        </div>
                        <button onClick={() => deleteShift(s.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QR */}
            {tab === 'qr' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Scan this QR to identify this coach</p>
                <button
                  onClick={() => setQrOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium rounded-xl transition-colors"
                >
                  <QrCode size={14} /> View QR Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <CoachFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={handleEdited} initial={coach} />
      )}
      <QRModal isOpen={qrOpen} onClose={() => setQrOpen(false)} type="gym_coach" id={coach.id} name={coach.name} />
    </>
  )
}
