// src/pages/Kitchen/components/KdsTicketCard.tsx
import React from 'react'
import { Clock, Users, CheckCheck, MapPin } from 'lucide-react'
import { KdsTicket } from '../types'
import { KdsItemRow } from './KdsItemRow'
import { URGENCY_CONFIG } from '../constants'
import { getElapsedInfo } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  ticket: KdsTicket
  onBumpItem: (itemId: string) => void
  onBumpTicket: (ticketId: string) => void
}

export const KdsTicketCard: React.FC<Props> = ({ ticket, onBumpItem, onBumpTicket }) => {
  const elapsed = getElapsedInfo(ticket.openedAt)
  const cfg = URGENCY_CONFIG[elapsed.urgency]
  const allItemsReady = ticket.items.every((i) => i.status === 'ready' || i.status === 'served')

  return (
    <div
      className={`rounded-3xl border-2 shadow-xs flex flex-col justify-between overflow-hidden transition-all duration-200 ${cfg.bg} ${cfg.border}`}
    >
      <div>
        {/* Ticket Header */}
        <div className={`p-3.5 flex items-start justify-between gap-2 border-b border-black/5 dark:border-white/5 ${cfg.headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
              #{ticket.table?.number || 'T'}
            </div>
            <div>
              <div className="text-xs font-black tracking-tight">
                {ticket.table?.number ? `Table #${ticket.table.number}` : 'Takeout / Quick Tab'}
              </div>
              <div className="text-[10px] opacity-80 flex items-center gap-1.5 font-medium mt-0.5">
                <span>{ticket.serverName || 'Staff'}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> {ticket.guestCount}p
                </span>
                {ticket.table?.section && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {ticket.table.section}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${cfg.badge}`}
            >
              <Clock className="w-3 h-3" />
              {elapsed.text}
            </span>
          </div>
        </div>

        {ticket.notes && (
          <div className="px-3.5 py-1.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
            Note: {ticket.notes}
          </div>
        )}

        {/* Order Items List */}
        <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
          {ticket.items.map((item) => (
            <KdsItemRow key={item.id} item={item} onBump={onBumpItem} />
          ))}
        </div>
      </div>

      {/* Ticket Bump Action */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            sounds.playSuccess()
            onBumpTicket(ticket.id)
          }}
          className={`w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all ${
            allItemsReady
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-blue-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-500/20'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span>{allItemsReady ? 'Clear / Mark Served' : 'Bump All Pending'}</span>
        </button>
      </div>
    </div>
  )
}