import React from 'react'
import { Truck, History, UserCircle2, Clock } from 'lucide-react'
import { Movement, AuditLog } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  movements: Movement[]
  auditLogs: AuditLog[]
}

export const ActivityFeedView: React.FC<Props> = ({ movements, auditLogs }) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Movements Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('warehouseRecentStockMovements') || 'Stock Movement Stream'}
          </h3>
        </div>
        <div className="p-3 space-y-2 max-h-[30rem] overflow-y-auto">
          {movements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">{t('warehouseNoMovementHistoryYet') || 'No movement records.'}</p>
          ) : (
            movements.map(m => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex flex-col gap-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-800 dark:text-slate-200">{m.productName}</span>
                  <span className={`font-mono font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity} {m.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{m.movementType} · {m.location?.name || 'N/A'}</span>
                  <span>{m.actedBy || 'System'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('warehouseWhoDidWhat') || 'Security & Action Audit'}
          </h3>
        </div>
        <div className="p-3 space-y-2 max-h-[30rem] overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">{t('warehouseNoAuditRecordsYet') || 'No audit logs found.'}</p>
          ) : (
            auditLogs.map(a => (
              <div
                key={a.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{a.action}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(a.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{a.entityType}: {a.details || '—'}</div>
                <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
                  <UserCircle2 className="w-3.5 h-3.5" />
                  {a.actor || 'System'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}