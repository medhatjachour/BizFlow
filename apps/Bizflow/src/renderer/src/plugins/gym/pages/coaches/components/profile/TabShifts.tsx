import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Loader2 } from 'lucide-react'
import { useCoachShifts } from '../../hooks/useCoachShifts'
import { formatDateLabel } from '../../utils'

interface TabShiftsProps {
  coachId: string
}

export function TabShifts({ coachId }: TabShiftsProps) {
  const {
    shifts,
    setWeekOffset,
    weekInfo,
    showShiftForm,
    setShowShiftForm,
    shiftForm,
    setShiftForm,
    savingShift,
    saveShift,
    deleteShift
  } = useCoachShifts(coachId)

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-2">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
          {weekInfo.label}
        </span>

        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Add Shift Button */}
      <button
        onClick={() => setShowShiftForm(v => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-800 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
      >
        <Plus size={13} />
        <span>{showShiftForm ? 'Cancel' : 'Add Weekly Shift'}</span>
      </button>

      {/* Shift Form */}
      {showShiftForm && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/40 dark:bg-orange-950/10 p-4 space-y-3 shadow-inner">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Shift Date</label>
              <input
                type="date"
                value={shiftForm.date}
                onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Start Time</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">End Time</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Duty Notes</label>
              <input
                type="text"
                placeholder="Floor duty, PT..."
                value={shiftForm.notes}
                onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <button
            onClick={saveShift}
            disabled={savingShift}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {savingShift ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>Save Shift</span>
          </button>
        </div>
      )}

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No shifts scheduled for this week.
        </div>
      ) : (
        <div className="space-y-2">
          {shifts
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(shift => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 p-3 group shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {formatDateLabel(shift.date)}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {shift.startTime} – {shift.endTime}
                    </p>
                    {shift.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">“{shift.notes}”</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteShift(shift.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                  title="Remove shift"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}