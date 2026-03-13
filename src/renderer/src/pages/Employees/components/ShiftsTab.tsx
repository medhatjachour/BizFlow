import { Plus, Trash2, Clock } from 'lucide-react'
import type { EmployeeShift } from '../types'

const SHIFT_TYPE_COLORS: Record<string, string> = {
  morning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  evening: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  night:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  custom:  'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
}

function shiftDuration(start: string, end: string, breakMins: number) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMins = (eh * 60 + em) - (sh * 60 + sm) - breakMins
  if (totalMins <= 0) return '—'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface Props {
  shifts: EmployeeShift[]
  onAdd: () => void
  onDelete: (id: string) => void
}

export default function ShiftsTab({ shifts, onAdd, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock size={16} /> Shift Schedule
        </h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Add Shift
        </button>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Clock size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p>No shifts scheduled yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Date', 'Type', 'Start', 'End', 'Break', 'Duration', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {shifts.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SHIFT_TYPE_COLORS[s.shiftType] ?? SHIFT_TYPE_COLORS.custom}`}>
                      {s.shiftType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.startTime}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.endTime}</td>
                  <td className="px-4 py-3 text-slate-500">{s.breakMins > 0 ? `${s.breakMins}m` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{shiftDuration(s.startTime, s.endTime, s.breakMins)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{s.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
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
