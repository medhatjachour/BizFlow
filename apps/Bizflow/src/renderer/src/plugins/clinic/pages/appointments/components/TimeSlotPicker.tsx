import React from 'react'
import { Clock, Loader2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SlotStatusResult } from '../types'

interface Props {
  timeSlots: string[]
  selectedTime: string
  duration: number
  loadingSlots: boolean
  getSlotStatus: (slot: string) => SlotStatusResult
  onSelectSlot: (slot: string) => void
}

export const TimeSlotPicker: React.FC<Props> = ({
  timeSlots,
  selectedTime,
  duration,
  loadingSlots,
  getSlotStatus,
  onSelectSlot
}) => {
  const { t } = useLanguage()
  const conflict = selectedTime ? getSlotStatus(selectedTime) : { state: 'available' as const }

  const gridCols =
    duration <= 15
      ? 'grid-cols-8 sm:grid-cols-10'
      : duration <= 20
        ? 'grid-cols-6 sm:grid-cols-8'
        : duration >= 60
          ? 'grid-cols-4 sm:grid-cols-6'
          : 'grid-cols-5 sm:grid-cols-7'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t('selectTime')} *
        </label>
        {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>

      <div className={`grid ${gridCols} gap-1.5`}>
        {timeSlots.map((slot) => {
          const { state, patient } = getSlotStatus(slot)
          const isSelected = slot === selectedTime

          return (
            <button
              key={slot}
              type="button"
              title={state !== 'available' ? `${patient ?? t('slotBooked')}` : t('slotAvailable')}
              disabled={state === 'booked' || state === 'overlap' || state === 'past'}
              onClick={() => onSelectSlot(slot)}
              className={`
                text-[11px] py-1.5 rounded-lg font-bold transition-all text-center leading-none
                ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400 dark:ring-teal-500 scale-105'
                    : state === 'past'
                      ? 'bg-slate-100 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600 cursor-not-allowed opacity-40'
                      : state === 'booked'
                        ? 'bg-red-100 text-red-400 dark:bg-red-950/30 dark:text-red-500 cursor-not-allowed line-through opacity-70'
                        : state === 'overlap'
                          ? 'bg-amber-100 text-amber-500 dark:bg-amber-950/30 dark:text-amber-500 cursor-not-allowed line-through opacity-70'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-600'
                }
              `}
            >
              {slot}
            </button>
          )
        })}
      </div>

      {/* Conflict Notice */}
      {conflict.state !== 'available' && selectedTime && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            {t('timeSlotConflict')} {conflict.patient ? `— ${conflict.patient}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}