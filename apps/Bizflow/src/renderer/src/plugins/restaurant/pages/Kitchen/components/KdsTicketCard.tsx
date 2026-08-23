import React from 'react'
import { Clock, Users, CheckCheck } from 'lucide-react'
import { KdsTicket } from '../types'
import { KdsItemRow } from './KdsItemRow'
import { URGENCY_CONFIG } from '../constants'
import { getElapsedInfo } from '../utils'

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
        {/* Ticket Top Header */}
        <div className={`p-3 flex items-start justify-between gap-2 ${cfg.headerBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
              #{ticket.table?.number || '?'}
            </div>
            <div>
              <div className="text-xs font-black">Table {ticket.table?.number || '?'}</div>
              <div className="text-[10px] opacity-80 flex items-center gap-1">
                <span>{ticket.serverName || 'Staff'}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> {ticket.guestCount}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${cfg.badge}`}
            >
              <Clock className="w-3 h-3" />
              {elapsed.text}
            </span>
          </div>
        </div>

        {ticket.notes && (
          <div className="px-3 py-1 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold truncate">
            Note: {ticket.notes}
          </div>
        )}

        {/* Items List */}
        <div className="p-2.5 space-y-1.5 max-h-72 overflow-y-auto">
          {ticket.items.map((item) => (
            <KdsItemRow key={item.id} item={item} onBump={onBumpItem} />
          ))}
        </div>
      </div>

      {/* Card Footer Bump Button */}
      <div className="p-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40">
        <button
          onClick={() => onBumpTicket(ticket.id)}
          className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
            allItemsReady
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {allItemsReady ? 'Clear / Mark Served' : 'Bump Ticket'}
        </button>
      </div>
    </div>
  )
}