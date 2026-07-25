import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { Product, Category, NewItem } from '../types';

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
        return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: p.id, productName: p.name, price: p.price, quantity: 1 }];
    });
  }, []);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev => 
      prev
        .map(i => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
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
    clearCart 
  };
}
