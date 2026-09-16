// src/pages/tables/components/TableDetailDrawer.tsx
import React, { useEffect, useRef } from 'react'
import {
  X,
  Clock,
  Users,
  Receipt,
  UserCheck,
  ArrowRightLeft,
  GitMerge,
  Calendar,
  Sparkles,
  CreditCard
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { RestaurantTableData, TableStatus } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'
import { formatOccupancyDuration } from '../utils'
import { formatCurrency } from '../../menu/utils'
import { sounds } from '../../utils/sound'

interface Props {
  table: RestaurantTableData | null
  onClose: () => void
  onOpenPos: (table: RestaurantTableData) => void
  onQuickSeat: (table: RestaurantTableData) => void
  onTransfer: (table: RestaurantTableData) => void
  onMerge: (table: RestaurantTableData) => void
  onStatusChange: (id: string, status: TableStatus) => void
}

export const TableDetailDrawer: React.FC<Props> = ({
  table,
  onClose,
  onOpenPos,
  onQuickSeat,
  onTransfer,
  onMerge,
  onStatusChange
}) => {
  const { t } = useLanguage()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!table) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [table, onClose])

  if (!table) return null

  const cfg = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available
  const openOrder = table.orders?.[0]
  const statusLabel = t(cfg.labelKey)

  const itemStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return t('restTableItemPending')
      case 'preparing':
        return t('restTableItemPreparing')
      case 'ready':
        return t('restTableItemReady')
      case 'served':
        return t('restTableItemServed')
      case 'voided':
        return t('restTableItemVoided')
      default:
        return status
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('restTableDrawerClose')}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs cursor-default animate-in fade-in duration-150"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('restTableTitle', { number: table.number })}
        className="fixed inset-y-0 end-0 z-50 w-full sm:max-w-md bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right rtl:slide-in-from-left duration-200"
      >
        {/* ─── Drawer Top Header ─────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('restTableTitle', { number: table.number })}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${cfg.text} ${cfg.bg} border ${cfg.border}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('restTableSectionCapacity', { section: table.section, count: table.capacity })}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('restTableDrawerClose')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Drawer Body Content ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {openOrder ? (
            <>
              {/* Active Bill Metrics Card */}
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
                    {t('restTableCheck')} #{openOrder.orderNumber || openOrder.id.slice(0, 5)}
                  </span>
                  <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 font-bold whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    {t('restTableSeatedAgo', {
                      duration: formatOccupancyDuration(openOrder.openedAt)
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-amber-500/10">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      {t('restTableServer')}
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
                      {openOrder.serverName || t('restTableLeadStaff')}
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-amber-500/10">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      {t('restTablePartySize')}
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {t('restTablePartySizeValue', { count: openOrder.guestCount })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Items Feed */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  {t('restTableOrderedItems', { count: openOrder.items.length })}
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-200/60 dark:border-slate-700/60 max-h-56 overflow-y-auto">
                  {openOrder.items.map((it) => (
                    <div
                      key={it.id}
                      className="py-2 px-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {it.quantity}x {it.itemName}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {itemStatusLabel(it.status)}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  ))}

                  {openOrder.items.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-slate-400">
                      {t('restTableNoItemsYet')}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between px-2 text-sm font-black text-slate-900 dark:text-white">
                  <span>{t('restTableCheckBalance')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                    {formatCurrency(openOrder.total)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-14 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {t('restTableReadyTitle')}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                  {t('restTableReadyHint')}
                </p>
              </div>
            </div>
          )}

          {/* Upcoming Reservations for this table */}
          {table.reservations && table.reservations.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> {t('restTableUpcomingBookings')}
              </h4>
              <div className="space-y-1.5">
                {table.reservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-black text-blue-900 dark:text-blue-300 block">
                        {res.customerName}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {t('restTableReservationMeta', {
                          time: new Date(res.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          }),
                          count: res.partySize
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Drawer Action Footer ─────────────────────────────────── */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/80 dark:bg-slate-800/60">
          {openOrder ? (
            <>
              <button
                type="button"
                onClick={() => {
                  sounds.playSuccess()
                  onOpenPos(table)
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Receipt className="w-4 h-4" />
                <span>{t('restTableOpenPos')}</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBump()
                    onTransfer(table)
                  }}
                  className="py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> {t('restTableTransfer')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBump()
                    onMerge(table)
                  }}
                  className="py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <GitMerge className="w-3.5 h-3.5" /> {t('restTableMerge')}
                </button>
              </div>

              {table.status === 'occupied' ? (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess()
                    onStatusChange(table.id, 'billing')
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 font-black text-xs flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('restTableMoveToBilling')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess()
                    onStatusChange(table.id, 'occupied')
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-black text-xs flex items-center justify-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{t('restTableReopenCheck')}</span>
                </button>
              )}
            </>
          ) : table.status === 'cleaning' ? (
            <button
              type="button"
              onClick={() => {
                sounds.playSuccess()
                onStatusChange(table.id, 'available')
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('restTableMarkClean')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sounds.playSuccess()
                onQuickSeat(table)
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('restTableSeatGuests')}</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
