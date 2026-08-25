import React from 'react'
import { ShieldCheck, Power, FileSpreadsheet } from 'lucide-react'
import { RestaurantShiftData } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  activeShift: RestaurantShiftData | null
  onOpenShiftModal: () => void
  onCloseShiftModal: () => void
  onViewReportModal: () => void
}

export const ActiveShiftBanner: React.FC<Props> = ({
  activeShift,
  onOpenShiftModal,
  onCloseShiftModal,
  onViewReportModal
}) => {
  if (!activeShift) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <Power className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Cash Drawer is Currently Closed
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Open a cashier/server shift with a starting cash float to begin taking dine-in orders and track drawer reconciliation.
          </p>
        </div>
        <button
          onClick={onOpenShiftModal}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all"
        >
          Open New Server Shift
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900 dark:text-white">
              Shift Active • {activeShift.serverName}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
              Live Drawer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Opened at: {new Date(activeShift.openedAt).toLocaleTimeString()}</span>
            <span>•</span>
            <span>Starting Float: {formatCurrency(activeShift.startCash)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onViewReportModal}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-500" /> Mid-Shift X-Report
        </button>
        <button
          onClick={onCloseShiftModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-2"
        >
          <Power className="w-4 h-4" /> End Shift & Balance Drawer
        </button>
      </div>
    </div>
  )
}