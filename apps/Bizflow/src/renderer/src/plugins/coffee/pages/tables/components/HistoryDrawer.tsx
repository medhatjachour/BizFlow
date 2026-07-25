import { useState, useEffect, useCallback } from 'react';
import { X, History, ChevronDown, ChevronUp } from 'lucide-react';
import { CoffeeTable, HistoryOrder } from '../types';
import { useToast } from '@renderer/contexts/ToastContext';

interface Props {
  table: CoffeeTable;
  onClose: () => void;
}

export default function HistoryDrawer({ table, onClose }: Props) {
  const toast = useToast();
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrd, setExpandedOrd] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await window.api.coffee.tables.getHistory({ tableId: table.id, page: pageNum, pageSize: 8 });
      setHistory(res?.items ?? []);
      setTotalPages(res?.totalPages ?? 1);
      setPage(pageNum);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [table.id, toast]);

  useEffect(() => { loadHistory(1); }, [loadHistory]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-400" />
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">Table {table.number} History</h2>
              {table.section && <p className="text-xs text-slate-500">{table.section}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-20 text-slate-400">Loading...</div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <History size={32} className="mb-2 opacity-50" />
              <p>No orders yet</p>
            </div>
          ) : (
            history.map(ord => (
              <div key={ord.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setExpandedOrd(expandedOrd === ord.id ? null : ord.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${ord.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ord.status}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">#{ord.orderNumber}</p>
                      <p className="text-xs text-slate-500">{ord.closedAt ? new Date(ord.closedAt).toLocaleString() : new Date(ord.openedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">${ord.total.toFixed(2)}</span>
                    {expandedOrd === ord.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>
                
                {expandedOrd === ord.id && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-1.5">
                    {ord.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>{item.quantity}× {item.productName}</span>
                        <span>${item.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {ord.cashier && <div className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">Cashier: {ord.cashier.fullName ?? ord.cashier.username}</div>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 text-xs">
            <button disabled={page <= 1} onClick={() => loadHistory(page - 1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
            <span className="text-slate-500">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => loadHistory(page + 1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
