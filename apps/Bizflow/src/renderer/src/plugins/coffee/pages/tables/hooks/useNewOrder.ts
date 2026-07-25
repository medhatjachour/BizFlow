import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { Product, Category, NewItem } from '../types';

const INTEGER_UNITS = ['piece', 'box', 'cup', 'packet', 'bottle'];

export function useNewOrder() {
  const { t } = useLanguage();
  const toast = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<NewItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [prods, cats] = await Promise.all([
          window.api.coffee.products.getAll({ available: true }),
          window.api.coffee.categories.getAll()
        ]);
        setProducts(prods ?? []);
        setCategories(cats ?? []);
      } catch {
        toast.error(t('cfFailedToLoadProducts'));
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, [toast, t]);

  const addToCart = useCallback((p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        const isIntUnit = INTEGER_UNITS.includes(existing.unit || 'piece');
        const nextQty = Math.round((isIntUnit ? Math.floor(existing.quantity + 1) : existing.quantity + 1) * 1000) / 1000;
        return prev.map(i => i.productId === p.id ? { ...i, quantity: nextQty } : i);
      }
      return [...prev, { 
        productId: p.id, 
        productName: p.name, 
        price: p.price, 
        quantity: 1, 
        unit: p.unit || 'piece' 
      }];
    });
  }, []);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;

      const isIntUnit = INTEGER_UNITS.includes(item.unit || 'piece');
      const rawQty = item.quantity + delta;
      const nextQty = Math.round((isIntUnit ? Math.floor(rawQty) : rawQty) * 1000) / 1000;

      if (nextQty <= 0) {
        return prev.filter(i => i.productId !== productId);
      }
      return prev.map(i => i.productId === productId ? { ...i, quantity: nextQty } : i);
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;

      const isIntUnit = INTEGER_UNITS.includes(item.unit || 'piece');
      const enforcedQty = isIntUnit ? Math.floor(qty) : qty;
      const roundedQty = Math.round(enforcedQty * 1000) / 1000;

      if (roundedQty <= 0) {
        return prev.filter(i => i.productId !== productId);
      }
      return prev.map(i => i.productId === productId ? { ...i, quantity: roundedQty } : i);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const filteredProducts = products.filter(p => {
    if (activeCat !== 'all' && p.categoryId !== activeCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { 
    products: filteredProducts, 
    categories, 
    loading, 
    cart, 
    cartTotal, 
    search, 
    activeCat,
    setSearch, 
    setActiveCat, 
    addToCart, 
    changeQty,
    setQty, 
    clearCart 
  };
}
