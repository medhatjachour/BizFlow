import React from 'react'
import { X, Printer } from 'lucide-react'
import { ZReportData } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  report: ZReportData | null
}

export const ZReportModal: React.FC<Props> = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">End-of-Shift Z-Report</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Simulation */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3">
          <div className="text-center space-y-0.5">
            <h2 className="font-black text-sm uppercase">Z-REPORT RECONCILIATION</h2>
            <p className="text-[10px] text-slate-400">Server: {report.shift.serverName}</p>
            <p className="text-[10px] text-slate-400">
              Shift ID: {report.shift.id.slice(0, 8)}
            </p>
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>Opened:</span>
              <span>{new Date(report.shift.openedAt).toLocaleTimeString()}</span>
            </div>
            {report.shift.closedAt && (
              <div className="flex justify-between">
                <span>Closed:</span>
                <span>{new Date(report.shift.closedAt).toLocaleTimeString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Total Orders:</span>
              <span>{report.ordersCount}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
            <div className="flex justify-between">
              <span>Opening Float:</span>
              <span>{formatCurrency(report.startCash)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Gross Sales:</span>
              <span>{formatCurrency(report.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tips Collected:</span>
              <span>{formatCurrency(report.totalTips)}</span>
            </div>
            {report.totalDiscounts > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>Total Discounts:</span>
                <span>-{formatCurrency(report.totalDiscounts)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
            <span className="font-bold block text-[10px] uppercase text-slate-400">
              Payment Breakdown
            </span>
            {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="flex justify-between capitalize">
                <span>{method}:</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>

          {report.endCash !== null && (
            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 font-bold text-sm">
              <div className="flex justify-between">
                <span>Counted Cash:</span>
                <span>{formatCurrency(report.endCash)}</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
        >
          <Printer className="w-4 h-4" /> Print Z-Report
        </button>
      </div>
    </div>
  )
}