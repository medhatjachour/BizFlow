import { Plus } from 'lucide-react'
import type { EmployeeAttendance, AttendanceStatus } from '../types'

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', 'half-day': 'Half Day', leave: 'Leave'
}

function formatTime(dt?: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  attendance: EmployeeAttendance[]
  onLog: () => void
}

export default function AttendanceTab({ attendance, onLog }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Attendance Records</h3>
        <button onClick={onLog} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Log Attendance
        </button>
      </div>
      {attendance.length === 0 ? (
        <p className="text-slate-500 text-center py-12">No attendance records yet</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Date', 'Status', 'Check In', 'Check Out', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {attendance.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : a.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : a.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : a.status === 'leave' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>{ATTENDANCE_LABELS[a.status as AttendanceStatus] ?? a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatTime(a.checkIn)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatTime(a.checkOut)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{a.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
