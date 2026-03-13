import { useState } from 'react'
import { Plus, Pencil, CalendarOff } from 'lucide-react'
import type { EmployeeAttendance, AttendanceStatus } from '../types'

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  absent:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  late:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'half-day': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  leave:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}
const STATUS_DOTS: Record<AttendanceStatus, string> = {
  present: 'bg-green-500', absent: 'bg-red-400', late: 'bg-amber-400',
  'half-day': 'bg-yellow-300', leave: 'bg-blue-400',
}
const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', 'half-day': 'Half Day', leave: 'Leave',
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTime(dt?: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function calcDuration(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return '—'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (diff <= 0) return '—'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface Props {
  attendance: EmployeeAttendance[]
  onLog: () => void
  onEdit: (a: EmployeeAttendance) => void
}

export default function AttendanceTab({ attendance, onLog, onEdit }: Props) {
  const now = new Date()
  const [monthFilter, setMonthFilter] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all')

  const filtered = attendance
    .filter(a => {
      const d = new Date(a.date)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (ym !== monthFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const counts = filtered.reduce((acc, a) => {
    acc[a.status as AttendanceStatus] = (acc[a.status as AttendanceStatus] ?? 0) + 1
    return acc
  }, {} as Partial<Record<AttendanceStatus, number>>)

  const [yr, mo] = monthFilter.split('-')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AttendanceStatus | 'all')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onLog}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Log Attendance
        </button>
      </div>

      {/* Summary pills */}
      {filtered.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(s =>
            (counts[s] ?? 0) > 0 ? (
              <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOTS[s]}`} />
                {STATUS_LABELS[s]}: <span className="font-bold ml-0.5">{counts[s]}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400 dark:text-slate-500">
          <CalendarOff size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No records for {MONTHS[parseInt(mo) - 1]} {yr}</p>
          <button onClick={onLog} className="mt-3 text-sm text-primary hover:underline">
            Add attendance record →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Date', 'Status', 'Check In', 'Check Out', 'Duration', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {new Date(a.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status as AttendanceStatus] ?? ''}`}>
                      {STATUS_LABELS[a.status as AttendanceStatus] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatTime(a.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatTime(a.checkOut)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{calcDuration(a.checkIn, a.checkOut)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{a.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit(a)}
                      title="Edit record"
                      className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
