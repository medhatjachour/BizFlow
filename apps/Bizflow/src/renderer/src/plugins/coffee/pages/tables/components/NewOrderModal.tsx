import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useNewOrder } from '../hooks/useNewOrder';
import { useAuth } from '@renderer/contexts/AuthContext';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { CoffeeTable } from '../types';
import { CAT_PILL } from '../constants';

interface Props {
  table: CoffeeTable;
  activeShift: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewOrderModal({ table, activeShift, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const { products, categories, loading, cart, cartTotal, search, activeCat, setSearch, setActiveCat, addToCart, changeQty, clearCart } = useNewOrder();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // OS Level: Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  async function handleSubmit() {
    if (cart.length === 0) { toast.error(t('cfAddAtLeastOneItem')); return; }
    setSaving(true);
    try {
      await window.api.coffee.orders.create({
        type: 'dine_in',
        tableId: table.id,
        cashierId: user?.id,
        shiftId: activeShift?.id ?? undefined,
        notes: notes || undefined,
        items: cart.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.price, quantity: i.quantity }))
      });
      toast.success(t('cfOrderCreated'));
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? t('cfFailedToCreateOrder'));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      <div className="m-auto w-full h-full max-w-6xl bg-white dark:bg-slate-900 flex flex-col rounded-none md:rounded-xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">New Order — Table {table.number}</h2>
            <p className="text-xs text-slate-500">{table.section ?? 'No section'} · {table.capacity} seats</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-grow overflow-hidden">
          {/* Left: Products */}
          <div className="flex-grow flex flex-col p-4 border-r border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-grow">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search products..." 
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">

              <button onClick={() => setActiveCat('all')} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>All</button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === c.id ? 'bg-amber-500 text-white' : CAT_PILL[c.color ?? 'default'] ?? CAT_PILL.default}`}>
                  {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
                </button>
              ))}
            </div>

            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">Loading products...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map(p => {
                    const qty = cart.find(i => i.productId === p.id)?.quantity ?? 0;
                    return (
                      <button key={p.id} onClick={() => addToCart(p)} className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 p-3 text-left hover:border-amber-400 hover:shadow-sm transition-all active:scale-95 ${qty > 0 ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'}`}>
                        {qty > 0 && <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{qty}</span>}
                        <div className="w-full h-16 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2 flex items-center justify-center text-slate-400">☕</div>
                        <h4 className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</h4>
                        <p className="text-xs text-amber-600 dark:text-amber-400">${p.price.toFixed(2)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-full max-w-xs flex flex-col bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><ShoppingCart size={16} /> Cart</h3>
              {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Clear</button>}
            </div>

            <div className="flex-grow overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                  <ShoppingCart size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Tap products to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-2">
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.productName}</p>
                        <p className="text-xs text-slate-500">${item.price.toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300"><Minus size={12} /></button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart({ id: item.productId, name: item.productName, price: item.price, isAvailable: true })} className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"><Plus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 outline-none resize-none h-12" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white">${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handleSubmit} disabled={saving || cart.length === 0} className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors">
                {saving ? 'Creating...' : 'Open Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
