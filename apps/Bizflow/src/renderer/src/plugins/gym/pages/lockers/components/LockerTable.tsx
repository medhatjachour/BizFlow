import { Lock, Unlock, Pencil, Trash2 } from 'lucide-react'
import { Locker } from '../types'
import { ZONE_STYLES } from '../constants'
import { isLockerOccupied, formatExpiryDate } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface LockerTableProps {
  lockers: Locker[]
  onAssignClick: (l: Locker) => void
  onUnassignClick: (l: Locker) => void
  onEditClick: (l: Locker) => void
  onDeleteClick: (l: Locker) => void
}

export function LockerTable({
  lockers,
  onAssignClick,
  onUnassignClick,
  onEditClick,
  onDeleteClick
}: LockerTableProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Locker #</th>
              <th className="px-4 py-3.5">Zone Location</th>
              <th className="px-4 py-3.5">Occupant Member</th>
              <th className="px-4 py-3.5">Contact Phone</th>
              <th className="px-4 py-3.5">Validity Expiry</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {lockers.map(locker => {
              const assignment = locker.assignments?.[0]
              const isOccupied = isLockerOccupied(locker)
              const zoneStyle = ZONE_STYLES[locker.zone] || ZONE_STYLES.general

              return (
                <tr
                  key={locker.id}
                  className="hover:bg-orange-500/[0.03] dark:hover:bg-orange-500/[0.05] transition-colors"
                >
                  {/* Number */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                          isOccupied
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {isOccupied ? <Lock size={13} /> : <Unlock size={13} />}
                      </div>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {locker.number}
                      </span>
                    </div>
                  </td>

                  {/* Zone */}
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${zoneStyle.badgeCls}`}>
                      {zoneStyle.label}
                    </span>
                  </td>

                  {/* Member Name */}
                  <td className="px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {assignment?.trainee?.name || <span className="text-slate-400 italic font-normal">Vacant</span>}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                    {assignment?.trainee?.phone || '—'}
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                    {isOccupied ? formatExpiryDate(assignment?.endDate) : '—'}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isOccupied ? t('gymOccupied') || 'Occupied' : t('gymAvailable') || 'Available'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isOccupied ? (
                        <button
                          onClick={() => onUnassignClick(locker)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors"
                        >
                          Release
                        </button>
                      ) : (
                        <button
                          onClick={() => onAssignClick(locker)}
                          className="px-2.5 py-1 text-xs font-bold text-orange-600 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors"
                        >
                          Assign
                        </button>
                      )}

                      <button
                        onClick={() => onEditClick(locker)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                        title="Edit Locker"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        onClick={() => onDeleteClick(locker)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Delete Locker"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}