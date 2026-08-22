import { Lock, Unlock, Pencil, Trash2, Phone, Calendar, UserCheck } from 'lucide-react'
import { Locker } from '../types'
import { ZONE_STYLES } from '../constants'
import { isLockerOccupied, formatExpiryDate, isAssignmentExpiringSoon } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface LockerCardProps {
  locker: Locker
  onAssignClick: () => void
  onUnassignClick: () => void
  onEditClick: () => void
  onDeleteClick: () => void
}

export function LockerCard({
  locker,
  onAssignClick,
  onUnassignClick,
  onEditClick,
  onDeleteClick
}: LockerCardProps) {
  const { t } = useLanguage()
  const assignment = locker.assignments?.[0]
  const isOccupied = isLockerOccupied(locker)
  const zoneStyle = ZONE_STYLES[locker.zone] || ZONE_STYLES.general
  const isExpiring = isAssignmentExpiringSoon(assignment?.endDate)

  return (
    <div
      className={`rounded-3xl border p-4 bg-white dark:bg-slate-800 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
        isOccupied
          ? 'border-rose-200/80 dark:border-rose-950/50 bg-gradient-to-br from-rose-50/20 to-transparent'
          : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/40'
      }`}
    >
      <div>
        {/* Header / Locker Number + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                isOccupied
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
              }`}
            >
              {isOccupied ? <Lock size={18} /> : <Unlock size={18} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                  {locker.number}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${zoneStyle.badgeCls}`}>
                  {zoneStyle.label}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {isOccupied ? 'Assigned' : 'Vacant & Ready'}
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
              isOccupied
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {isOccupied ? t('gymOccupied') || 'Occupied' : t('gymAvailable') || 'Available'}
          </span>
        </div>

        {/* Member Details or Vacancy State */}
        {isOccupied && assignment ? (
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 mb-2 text-xs">
            <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
              {assignment.trainee?.name || 'Unknown Member'}
            </p>

            {assignment.trainee?.phone && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <Phone size={11} className="text-slate-400" />
                <span>{assignment.trainee.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Calendar size={11} className="text-slate-400" />
              <span className={isExpiring ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                Until {formatExpiryDate(assignment.endDate)}
              </span>
            </div>

            {assignment.notes && (
              <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-700/40 truncate">
                “{assignment.notes}”
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-700 mb-2 min-h-[70px] flex items-center">
            <p className="text-xs text-slate-400 italic">
              {locker.notes || 'No notes. Ready for key handoff.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-1.5 pt-3 mt-1 border-t border-slate-100 dark:border-slate-700/60">
        {isOccupied ? (
          <button
            onClick={onUnassignClick}
            className="flex-1 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors"
          >
            {t('gymUnassign') || 'Release Locker'}
          </button>
        ) : (
          <button
            onClick={onAssignClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl transition-colors"
          >
            <UserCheck size={13} />
            <span>{t('gymAssignMember') || 'Assign Member'}</span>
          </button>
        )}

        <button
          onClick={onEditClick}
          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-colors"
          title="Edit Details"
        >
          <Pencil size={13} />
        </button>

        <button
          onClick={onDeleteClick}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          title="Delete Locker"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}