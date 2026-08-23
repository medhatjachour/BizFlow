import React from 'react'
import {
  ArrowRight,
  Truck,
  CheckCircle2,
  Package,
  Calendar,
  ChevronRight,
  Trash2,
  Ban,
  Building2
} from 'lucide-react'
import { Transfer, LocationRef } from '../types'
import { STATUS_CONFIG } from '../constants'
import { getNextTransferStatus } from '../utils'

interface Props {
  transfer: Transfer
  locationMap: Map<string, LocationRef>
  onInspect: (tr: Transfer) => void
  onRequestAdvance: (tr: Transfer, nextStatus: string) => void
  onRequestCancel: (tr: Transfer) => void
  onDelete: (id: string) => void
  isActing: boolean
}

export const TransferCard: React.FC<Props> = ({
  transfer,
  locationMap,
  onInspect,
  onRequestAdvance,
  onRequestCancel,
  onDelete,
  isActing
}) => {
  const from = transfer.fromLocation || locationMap.get(transfer.fromLocationId)
  const to = transfer.toLocation || locationMap.get(transfer.toLocationId)
  const statusCfg = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.draft
  const nextStatus = getNextTransferStatus(transfer.status)
  const totalItemQty = (transfer.items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <div className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all duration-200 space-y-3.5">
      {/* Header: Route + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        {/* Origin to Destination Route Visualization */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[130px]">{from?.name || 'Origin'}</span>
            <span className="text-[10px] font-mono text-slate-400">({from?.code || 'N/A'})</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <span className="w-3 h-0.5 bg-slate-300 dark:bg-slate-700" />
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
            <span className="w-3 h-0.5 bg-slate-300 dark:bg-slate-700" />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[130px]">{to?.name || 'Destination'}</span>
            <span className="text-[10px] font-mono text-slate-400">({to?.code || 'N/A'})</span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.badge} self-start sm:self-auto`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Manifest Preview Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
          <Package className="w-3.5 h-3.5 text-indigo-500" />
          <span>{transfer.items?.length || 0} unique SKUs</span>
          <span className="text-slate-400">•</span>
          <span>{totalItemQty} total units</span>
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>Dispatched: {new Date(transfer.transferDate).toLocaleDateString()}</span>
        </div>

        {transfer.completedAt && (
          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Reconciled: {new Date(transfer.completedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Itemized Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {(transfer.items ?? []).slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
          >
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
              {item.productName}
            </span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {item.quantity} {item.unit}
            </span>
          </div>
        ))}
        {(transfer.items?.length ?? 0) > 3 && (
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-xs font-semibold text-slate-400 flex items-center justify-center">
            +{transfer.items.length - 3} more items...
          </div>
        )}
      </div>

      {/* Footer / Workflow Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onInspect(transfer)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>View Detailed Manifest</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2">
          {transfer.status === 'draft' && (
            <button
              onClick={() => onRequestCancel(transfer)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel Transfer
            </button>
          )}

          {(transfer.status === 'cancelled' || transfer.status === 'draft') && (
            <button
              onClick={() => onDelete(transfer.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {nextStatus && (
            <button
              onClick={() => onRequestAdvance(transfer, nextStatus)}
              disabled={isActing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              {nextStatus === 'in_transit' ? (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  Dispatch In-Transit
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Receive & Reconcile Stock
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}