import { Users, History, Edit2, Plus, CheckCircle, Timer, Power, PowerOff } from 'lucide-react';
import { CoffeeTable } from '../types';
import { CARD_BG, STATUS_DOT, ITEM_ST } from '../constants';
import { useLanguage } from '@renderer/contexts/LanguageContext';

function elapsed(openedAt: string) {
  const m = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

interface Props {
  table: CoffeeTable;
  onNewOrder: () => void;
  onManageOrder: () => void;
  onSetStatus: (status: string) => void;
  onOpenHistory: () => void;
  onEdit: () => void;
  onToggleActive: () => void; // Replaced onDelete
}

export default function TableCard({ table, ...handlers }: Props) {
  const order = table.orders?.[0] ?? null;
  const isDisabled = !table.isActive;
  const {t} = useLanguage();
  return (
    <div 
      className={`rounded-xl p-3 flex flex-col gap-2 transition-all relative overflow-hidden
        ${isDisabled 
          ? 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 opacity-60' 
          : CARD_BG[table.status]
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {!isDisabled && <span className={`w-2 h-2 rounded-full ${STATUS_DOT[table.status]}`} />}
            <span className="font-bold text-slate-800 dark:text-white">T{table.number}</span>
            {table.name && <span className="text-xs text-slate-500 dark:text-slate-400">({table.name})</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Users size={12} /> {table.capacity}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 py-1">
        {isDisabled ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-4">
            <PowerOff size={20} className="mb-1" />
            <span className="text-xs font-medium">{t('cfTableDisable')||'Disabled'}</span>
          </div>
        ) : order ? (
          <div className="space-y-2 cursor-pointer" onClick={handlers.onManageOrder}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-amber-600 dark:text-amber-400">#{order.orderNumber}</span>
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <Timer size={12} /> {elapsed(order.openedAt)}
              </div>
            </div>
            <div className="space-y-1">
              {order.items.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate">{item.quantity}× {item.productName}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${ITEM_ST[item.status] ?? ITEM_ST.pending}`}>
                    {item.status}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && <div className="text-[10px] text-slate-400">+ {order.items.length - 3} more</div>}
            </div>
          </div>
        ) : table.status === 'available' ? (
          <button 
            onClick={handlers.onNewOrder}
            className="w-full flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <Plus size={18} />
            <span className="text-xs font-medium">{t('cfNewOrder')||'New Order'}</span>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-4 text-blue-500 dark:text-blue-400">
            <CheckCircle size={18} />
            <span className="text-xs font-medium">{t('cfCleaning')||'Cleaning...'}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          {!isDisabled && table.status === 'available' && (
            <button onClick={() => handlers.onSetStatus('cleaning')} className="px-3 py-3 text-[14px] text-white bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 transition-colors">🧹 {t('cfClean')||'Clean'}</button>
          )}
          {!isDisabled && table.status === 'cleaning' && (
            <button onClick={() => handlers.onSetStatus('available')} className="px-3 py-3 text-[14px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded hover:bg-emerald-100 transition-colors">✓ {t('cfDone')||'Done'}</button>
          )}
          
          <button onClick={handlers.onOpenHistory} className="flex items-center gap-1 px-3 py-3 text-[14px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <History size={12} /> {table._count?.orders ?? 0}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handlers.onEdit} className="p-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
            <Edit2 size={12} />
          </button>
          
          {/* Toggle Active/Disable Button */}
          <button 
            onClick={handlers.onToggleActive} 
            className={`p-3 rounded transition-colors ${
              isDisabled 
                ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
            title={isDisabled ? 'Enable Table' : 'Disable Table'}
          >
            {isDisabled ? <Power size={12} /> : <PowerOff size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
