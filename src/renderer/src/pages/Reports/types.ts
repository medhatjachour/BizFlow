export interface TodayStats {
  revenue: number;
  expenses: number;
  profit: number;
  salesCount: number;
  expensesCount: number;
  topProduct: string;
  revenueChange: number; // percentage vs yesterday
}

export interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'alert';
  time: string;
  description: string;
  amount?: number;
  icon: any;
  saleData?: any; // Full sale transaction data
}

export interface VariantSale {
  variantId: string | null;
  variantName: string;
  quantity: number;
  revenue: number;
}

export interface ItemSummary {
  productId: string;
  productName: string;
  totalQuantity: number;
  revenue: number;
  category?: string;
  variants?: VariantSale[];
}

export interface ReportFormState {
  reportType: 'sales' | 'inventory' | 'financial' | 'customer' | null;
  startDate: string;
  endDate: string;
}

export interface ReportType {
  id: string;
  title: string;
  icon: any;
  color: string;
}

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
