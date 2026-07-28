import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useNewOrder } from '../hooks/useNewOrder';
import { useAuth } from '@renderer/contexts/AuthContext';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { CoffeeTable, NewItem } from '../types';
import { CAT_PILL } from '../constants';

const INTEGER_UNITS = ['piece', 'box', 'cup', 'packet', 'bottle'];

// Sub-component for debounced cart row
function NewOrderCartRow({ item, onChangeQty, onSetQty }: { 
  item: NewItem; 
  onChangeQty: (id: string, delta: number) => void; 
  onSetQty: (id: string, qty: number) => void;
}) {
  const [qtyInput, setQtyInput] = useState(String(item.quantity));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntegerUnit = INTEGER_UNITS.includes(item.unit || 'piece');
  const step = isIntegerUnit ? 1 : 0.5;

  useEffect(() => {
    setQtyInput(String(item.quantity));
  }, [item.quantity]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleQtyChange = (val: string) => {
    if (isIntegerUnit && val.includes('.')) return;
    setQtyInput(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const v = parseFloat(val);
      if (!isNaN(v) && v >= 0) {
        onSetQty(item.productId, v);
      } else {
        setQtyInput(String(item.quantity));
      }
    }, 500);
  };

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-700">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.productName}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">${item.price.toFixed(2)} / {item.unit}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onChangeQty(item.productId, -step)} 
          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          step="any"
          value={qtyInput}
          onChange={(e) => handleQtyChange(e.target.value)}
          className="w-16 text-center text-sm font-medium border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button 
          onClick={() => onChangeQty(item.productId, step)} 
          className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

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
  const { 
    products, categories, loading, cart, cartTotal, search, activeCat, 
    setSearch, setActiveCat, addToCart, changeQty, setQty, clearCart 
  } = useNewOrder();
  
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
        items: cart.map(i => ({ 
          productId: i.productId, 
          productName: i.productName, 
          unitPrice: i.price, 
          quantity: i.quantity,
          unit: i.unit 
        }))
      });
      toast.success(t('cfOrderCreated'));
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? t('cfFailedToCreateOrder'));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Order — Table {table.number}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{table.section ?? 'No section'} · {table.capacity} seats</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Products */}
          <div className="w-2/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search products..." 
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-3 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setActiveCat('all')} 
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                All
              </button>
              {categories.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setActiveCat(c.id)} 
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === c.id ? 'bg-amber-500 text-white' : CAT_PILL[c.color ?? 'default'] ?? CAT_PILL.default}`}
                >
                  {c.icon && <span>{c.icon}</span>}{c.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="text-center text-sm text-slate-500 py-10">Loading products...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {products.map(p => {
                    const qty = cart.find(i => i.productId === p.id)?.quantity ?? 0;
                    return (
                      <button 
                        key={p.id} 
                        onClick={() => addToCart(p)} 
                        className={`relative bg-white dark:bg-slate-900 rounded-xl border-2 p-3 text-left hover:border-amber-400 hover:shadow-sm transition-all active:scale-95 ${qty > 0 ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        {qty > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{qty}</span>}
                        <div className="text-2xl mb-1">☕</div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                        
                        <div className="text-xs text-slate-500 dark:text-slate-400">${p.price.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-1/3 flex flex-col bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Cart
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <ShoppingCart className="w-10 h-10 mb-2" />
                  <p className="text-xs">Tap products to add</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {cart.map(item => (
                    <NewOrderCartRow 
                      key={item.productId} 
                      item={item} 
                      onChangeQty={changeQty} 
                      onSetQty={setQty} 
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Special instructions..." 
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 outline-none resize-none h-12" 
                />
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={saving || cart.length === 0} 
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {saving ? 'Creating...' : 'Open Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
