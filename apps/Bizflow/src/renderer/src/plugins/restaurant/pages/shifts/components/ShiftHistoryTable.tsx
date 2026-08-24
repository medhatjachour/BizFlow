// src/pages/shifts/components/ShiftHistoryTable.tsx
import React from 'react'
import { FileSpreadsheet, CheckCircle2, DollarSign, Clock, Users, ArrowUpRight } from 'lucide-react'
import { RestaurantShiftData } from '../types'
import { formatCurrency, formatShiftDuration } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  shifts: RestaurantShiftData[]
  onViewZReport: (shiftId: string) => void
}

export const ShiftHistoryTable: React.FC<Props> = ({ shifts, onViewZReport }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden select-none">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Shift Audit History & Reconciliation Log
          </h3>
          <p className="text-xs text-slate-400">Past cashier sessions, float amounts, and settled totals</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 uppercase tracking-widest text-[10px] font-black">
              <th className="py-3 px-4">Session & Staff</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Opening Float</th>
              <th className="py-3 px-4">Gross Sales</th>
              <th className="py-3 px-4">Tips Pool</th>
              <th className="py-3 px-4">End Cash</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Audit Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {shifts.map((s) => {
              const isClosed = s.status === 'closed'

              return (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Staff Info */}
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block">{s.serverName}</span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(s.openedAt).toLocaleDateString()} at {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatShiftDuration(s.openedAt, s.closedAt)}</span>
                    </div>
                  </td>

                  {/* Start Float */}
                  <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(s.startCash)}
                  </td>

                  {/* Gross Sales */}
                  <td className="py-3.5 px-4 font-black text-emerald-600">
                    {formatCurrency(s.totalSales)}
                  </td>

                  {/* Tips */}
                  <td className="py-3.5 px-4 font-black text-purple-600">
                    {formatCurrency(s.totalTips)}
                  </td>

                  {/* End Cash */}
                  <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                    {s.endCash !== null ? formatCurrency(s.endCash) : '—'}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isClosed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 animate-pulse'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {s.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playBump()
                        onViewZReport(s.id)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>View Z-Report</span>
                      <ArrowUpRight className="w-3 h-3 opacity-60" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {shifts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-14 text-center text-slate-400 text-xs font-semibold">
                  No historical shifts recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}