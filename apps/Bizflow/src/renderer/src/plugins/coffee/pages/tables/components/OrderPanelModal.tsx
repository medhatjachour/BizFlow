import { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Smartphone, Trash2, CheckCircle } from 'lucide-react';
import { ActiveOrder, CoffeeTable } from '../types';
import { ITEM_ST } from '../constants';
import { useAuth } from '@renderer/contexts/AuthContext';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';

interface Props {
  table: CoffeeTable;
  order: ActiveOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderPanelModal({ table, order, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [payMethod, setPayMethod] = useState('cash');
  const [closing, setClosing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [localOrder, setLocalOrder] = useState(order);

  useEffect(() => setLocalOrder(order), [order]);

  // OS Level: Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  async function cycleItemStatus(itemId: string, current: string) {
    const next = current === 'pending' ? 'preparing' : current === 'preparing' ? 'ready' : current === 'ready' ? 'served' : 'pending';
    // Optimistic UI update
    setLocalOrder(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, status: next as any } : i)
    }));
    try {
      await window.api.coffee.orders.updateItemStatus({ id: itemId, status: next });
    } catch {
      toast.error(t('cfStatusUpdateFailed'));
      setLocalOrder(order); // Revert
    }
  }

  async function handlePay() {
    setClosing(true);
    try {
      await window.api.coffee.orders.close({ orderId: localOrder.id, paymentMethod: payMethod, cashierId: user?.id });
      toast.success(t('cfOrderCompleted'));
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? t('cfFailed'));
      setClosing(false);
    }
  }

  async function handleVoid() {
    if (!confirm('Void this order?')) return;
    setVoiding(true);
    try {
      await window.api.coffee.orders.void(localOrder.id);
      toast.success(t('cfOrderVoided'));
      onSuccess();
    } catch {
      toast.error(t('cfVoidFailed'));
      setVoiding(false);
    }
  }

  const elapsed = (openedAt: string) => {
    const m = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      <div className="m-auto w-full max-w-md bg-white dark:bg-slate-900 flex flex-col rounded-xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Table {table.number}</h2>
            <p className="text-xs text-slate-500">Order #{localOrder.orderNumber} · {elapsed(localOrder.openedAt)} ago</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">${localOrder.total.toFixed(2)}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize">{localOrder.status}</span>
          </div>
          <button onClick={onClose} className="p-2 ml-4 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>

        {/* Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {localOrder.items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex-grow">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{item.quantity}× {item.productName}</p>
                {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
              </div>
              <div className="text-right mr-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">${item.total.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => cycleItemStatus(item.id, item.status)}
                className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide transition-colors ${ITEM_ST[item.status] ?? ITEM_ST.pending}`}
              >
                {item.status}
              </button>
            </div>
          ))}
          {localOrder.notes && <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">Note: {localOrder.notes}</div>}
        </div>

        {/* Payment Actions */}
        {localOrder.status === 'open' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'cash', l: 'Cash', I: Banknote },
                  { v: 'card', l: 'Card', I: CreditCard },
                  { v: 'vodafone_cash', l: 'Vodafone', I: Smartphone }
                ].map(({ v, l, I }) => (
                  <button key={v} onClick={() => setPayMethod(v)} className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${payMethod === v ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    <I size={16} /> {l}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={handleVoid} disabled={voiding} className="flex-1 py-2.5 border border-red-200 dark:border-red-800 text-red-500 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1.5 disabled:opacity-50">
                {voiding ? 'Voiding...' : <><Trash2 size={14} /> Void</>}
              </button>
              <button onClick={handlePay} disabled={closing} className="flex-grow-[2] py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5">
                {closing ? 'Processing...' : <><CheckCircle size={14} /> Pay ${localOrder.total.toFixed(2)}</>}
              </button>
            </div>
          </div>
        )}

        {localOrder.status !== 'open' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500">
            {localOrder.status === 'paid' ? `✓ Paid via ${localOrder.paymentMethod?.replace('_', ' ') ?? '—'}` : '✗ Voided'}
          </div>
        )}
      </div>
    </div>
  );
}
