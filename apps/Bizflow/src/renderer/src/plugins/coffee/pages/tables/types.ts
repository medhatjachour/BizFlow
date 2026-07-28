export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit?: string;          // Added unit
  unitPrice: number;
  total: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
}

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: 'open' | 'paid' | 'voided';
  total: number;
  subtotal: number;
  discount: number;
  items: OrderItem[];
  openedAt: string;
  notes?: string;
  paymentMethod?: string;
}

export interface HistoryOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod?: string;
  openedAt: string;
  closedAt?: string;
  items: { 
    productName: string; 
    quantity: number; 
    unit?: string;      // Added unit
    total: number 
  }[];
  cashier?: { username: string; fullName?: string };
}

export interface CoffeeTable {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  section?: string;
  status: 'available' | 'occupied' | 'cleaning';
  isActive: boolean;
  orders: ActiveOrder[];
  _count: { orders: number };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId?: string;
  isAvailable: boolean;
  stock: number;         // Added stock
  unit: string;          // Added unit
  reorderPoint?: number; // Added reorderPoint
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface NewItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  unit?: string;          // Added unit
}
