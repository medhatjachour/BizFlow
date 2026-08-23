import React from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { TransferRawItem } from '../types'

interface Props {
  transfers: TransferRawItem[]
}

export const TransferPipelineCard: React.FC<Props> = ({ transfers }) => {
  const pendingCount = transfers.filter(t => t.status === 'draft' || t.status === 'pending').length
  const inTransitCount = transfers.filter(t => t.status === 'in_transit').length
  const doneCount = transfers.filter(t => t.status === 'completed').length

  const pipelinePills = [
    { label: 'Staged', count: pendingCount, color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' },
    { label: 'In Transit', count: inTransitCount, color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600' },
    { label: 'Completed', count: doneCount, color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' }
  ]

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600">
          <ArrowRightLeft className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Transfer Pipeline
        </h3>
      </div>

      {/* Stage count summary pills */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {pipelinePills.map(p => (
          <div key={p.label} className={`rounded-xl p-2 text-center ${p.color}`}>
            <div className="text-lg font-bold tracking-tight">{p.count}</div>
            <div className="text-[10.5px] font-medium opacity-80">{p.label}</div>
          </div>
        ))}
      </div>

      {/* Recent transfers micro-feed */}
      {transfers.length > 0 ? (
        <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
          {transfers.slice(0, 4).map((tr, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    tr.status === 'completed'
                      ? 'bg-emerald-500'
                      : tr.status === 'in_transit'
                      ? 'bg-sky-500 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300 truncate">
                  {tr.fromLocationName || tr.from || 'Origin'} → {tr.toLocationName || tr.to || 'Dest'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{tr.quantity || 0} units</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-4">No transfer operations logged today</p>
      )}
    </div>
  )
}