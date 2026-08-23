import React from 'react'
import {
  X,
  Package,
  Calendar,
  User,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { Transfer, LocationRef } from '../types'
import { STATUS_CONFIG } from '../constants'

interface Props {
  transfer: Transfer | null
  locations: LocationRef[]
  onClose: () => void
}

export const TransferDetailDrawer: React.FC<Props> = ({ transfer, locations, onClose }) => {

  if (!transfer) return null

  const locationMap = new Map(locations.map(l => [l.id, l]))
  const from = transfer.fromLocation || locationMap.get(transfer.fromLocationId)
  const to = transfer.toLocation || locationMap.get(transfer.toLocationId)
  const statusCfg = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.draft
  const totalItemQty = (transfer.items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">TRANSFER #{transfer.id.slice(-6).toUpperCase()}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Transfer Manifest Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Pathway Segment */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Transit Route</div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">From Origin</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{from?.name || 'Origin'}</div>
                <div className="text-xs font-mono text-slate-500">{from?.code || 'N/A'}</div>
              </div>

              <ArrowRight className="w-5 h-5 text-indigo-500" />

              <div className="space-y-0.5 text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">To Destination</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{to?.name || 'Destination'}</div>
                <div className="text-xs font-mono text-slate-500">{to?.code || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date Dispatched
              </span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(transfer.transferDate).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Handled By
              </span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {transfer.completedBy || transfer.createdBy || 'warehouse.operator'}
              </div>
            </div>
          </div>

          {transfer.notes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5" /> Operator Dispatch Notes
              </span>
              <p className="text-slate-700 dark:text-slate-300">{transfer.notes}</p>
            </div>
          )}

          {/* Itemized Bill of Lading */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-500" />
                Manifest Cargo Items ({transfer.items?.length || 0})
              </span>
              <span className="font-mono text-slate-500">{totalItemQty} Total Units</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              {(transfer.items ?? []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-slate-900 text-xs flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">{item.sku || 'No SKU'}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {item.quantity.toLocaleString()} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}