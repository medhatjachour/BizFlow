import React from 'react'
import {
  Users,
  Phone,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Trash2,

} from 'lucide-react'
import { ReservationData } from '../types'
import { RESERVATION_STATUS_CONFIG } from '../constants'
import { formatTimeSlot, parseGuestTags } from '../utils'

interface Props {
  reservation: ReservationData
  onSeat: (reservation: ReservationData) => void
  onUpdateStatus: (id: string, status: string) => void
  onDelete: (id: string) => void
}

export const ReservationCard: React.FC<Props> = ({
  reservation,
  onSeat,
  onUpdateStatus,
  onDelete
}) => {
  const cfg = RESERVATION_STATUS_CONFIG[reservation.status] || RESERVATION_STATUS_CONFIG.confirmed
  const tags = parseGuestTags(reservation.guestTags)
  const isSeatAvailable = reservation.status === 'confirmed' || reservation.status === 'pending'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
      {/* Top Header: Time, Guest Name, Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {reservation.customerName}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cfg.bg} border`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeSlot(reservation.date)} ({reservation.durationMins}m)
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {reservation.partySize} Guests
            </span>
            {reservation.table && (
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Table #{reservation.table.number} ({reservation.table.section || 'Main'})
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(reservation.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
          title="Delete booking"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Middle Context: Phone, Tags & Notes */}
      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
        {reservation.customerPhone && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{reservation.customerPhone}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {reservation.notes && (
          <div className="text-slate-500 italic text-[11px]">"{reservation.notes}"</div>
        )}
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
        {isSeatAvailable ? (
          <button
            onClick={() => onSeat(reservation)}
            className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" /> Seat Guest Now
          </button>
        ) : reservation.status === 'seated' ? (
          <button
            onClick={() => onUpdateStatus(reservation.id, 'completed')}
            className="flex-1 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Dining Completed
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400">Booking finalized</span>
        )}

        {/* Secondary Status Modifiers */}
        {['pending', 'confirmed'].includes(reservation.status) && (
          <button
            onClick={() => onUpdateStatus(reservation.id, 'cancelled')}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1"
            title="Cancel booking"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}