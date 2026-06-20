/**
 * Shared Types
 * Centralized type definitions shared across main and renderer processes
 * Following DRY principle to eliminate duplication
 */

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export interface User {
  id: string
  username: string
  role: Role
  createdAt?: Date | string
  updatedAt?: Date | string
}

export enum Role {
  admin = 'admin',
  manager = 'manager',
  sales = 'sales',
  inventory = 'inventory',
  finance = 'finance'
}

// ============================================================================
// PRODUCT & INVENTORY
// ============================================================================

export interface Product {
  id: string
  name: string
  baseSKU: string
  baseBarcode?: string | null
  category: string
  categoryId: string | null
  description: string | null
  basePrice: number
  baseCost: number
  hasVariants: boolean
  storeId: string | null
  createdAt: Date | string
  updatedAt: Date | string
  variants?: ProductVariant[]
  images?: ProductImage[]
  // Calculated fields (optional for flexibility)
  totalStock?: number
  stockValue?: number
  retailValue?: number
}

export interface VariantAttributeValue {
  attributeId: string
  value: string
  attribute?: { name: string }
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  barcode?: string | null
  price: number
  stock: number
  color?: string | null
  size?: string | null
  attributeValues?: VariantAttributeValue[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface ProductImage {
  id: string
  productId: string
  imageData: string
  order: number
  createdAt: Date | string
}

// ============================================================================
// INVENTORY SPECIFIC
// ============================================================================

export interface InventoryItem extends Product {
  variants: ProductVariant[]
  images: ProductImage[]
  totalStock: number
  stockValue: number
  retailValue: number
  variantCount: number
  stockStatus: StockStatus
}

export type StockStatus = 'out' | 'low' | 'normal' | 'high'

export interface InventoryMetrics {
  totalProducts: number
  totalVariants: number
  totalPieces: number
  totalStockValue: number
  totalRetailValue: number
  potentialProfit: number
  lowStockCount: number
  outOfStockCount: number
}

export interface StockMovement {
  id: string
  productId: string
  variantId?: string
  quantity: number
  type: StockMovementType
  timestamp: Date | string
  userId?: string
  notes?: string
}

export type StockMovementType = 'sale' | 'restock' | 'adjustment' | 'return'

// ============================================================================
// SALES
// ============================================================================

export interface Sale {
  id: string
  productId: string
  variantId?: string
  userId: string
  quantity: number
  total: number
  discount?: number
  paymentMethod?: string
  customerId?: string
  status?: string
  createdAt: Date | string
  updatedAt?: Date | string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  variantId?: string
  quantity: number
  refundedQuantity?: number
  unitPrice: number
  total: number
  discount?: number
  refundedAt?: string | null
  // Discount fields
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
  discountValue?: number
  finalPrice?: number
  discountReason?: string
  discountAppliedBy?: string
  discountAppliedAt?: string
}

// ============================================================================
// FINANCIAL
// ============================================================================

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  category?: string
  userId: string
  createdAt: Date | string
  updatedAt?: Date | string
}

export enum TransactionType {
  income = 'income',
  expense = 'expense'
}

export interface FinancialMetrics {
  totalRevenue: number
  totalCost: number
  netProfit: number
  profitMargin: number
  totalSales: number
  averageOrderValue: number
  totalPiecesSold: number
  numberOfOrders: number
  expectedSales: number
  actualSales: number
  expectedIncome: number
  actualIncome: number
  revenueGrowth: number
  orderGrowth: number
  roi: number
  conversionRate: number
  averageItemsPerOrder: number
  inventoryTurnover: number
}

export interface TopProduct {
  name: string
  revenue: number
  quantity: number
  category?: string
}

// ============================================================================
// STORE
// ============================================================================

export interface Store {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================================================
// CUSTOMER
// ============================================================================

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  totalPurchases?: number
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================================================
// EMPLOYEE
// ============================================================================

export interface Employee extends User {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  salary?: number
  hireDate?: Date | string
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

export type SortDirection = 'asc' | 'desc'

export interface DateRange {
  start: Date | string
  end: Date | string
}

export type DateRangeType = 'today' | '7days' | '30days' | '90days' | 'custom'

export interface DateRangeFilter {
  type: DateRangeType
  customStart?: string
  customEnd?: string
}

// ============================================================================
// IPC CHANNEL NAMES
// ============================================================================

export const IPC_CHANNELS = {
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    GET_CURRENT_USER: 'auth:getCurrentUser',
  },
  PRODUCTS: {
    CREATE: 'products:create',
    UPDATE: 'products:update',
    DELETE: 'products:delete',
    GET_ALL: 'products:getAll',
    GET_BY_ID: 'products:getById',
    GET_LOW_STOCK: 'products:getLowStock',
    SEARCH: 'products:search',
  },
  INVENTORY: {
    GET_ALL: 'inventory:getAll',
    GET_METRICS: 'inventory:getMetrics',
    GET_TOP_STOCKED: 'inventory:getTopStocked',
    GET_LOW_STOCK: 'inventory:getLowStock',
    GET_OUT_OF_STOCK: 'inventory:getOutOfStock',
    SEARCH: 'inventory:search',
    GET_STOCK_HISTORY: 'inventory:getStockHistory',
    UPDATE_STOCK: 'inventory:updateStock',
  },
  SALES: {
    CREATE: 'sales:create',
    GET_ALL: 'sales:getAll',
    GET_BY_ID: 'sales:getById',
    GET_BY_DATE_RANGE: 'sales:getByDateRange',
    REFUND: 'sales:refund',
  },
  TRANSACTIONS: {
    CREATE: 'transactions:create',
    UPDATE: 'transactions:update',
    DELETE: 'transactions:delete',
    GET_ALL: 'transactions:getAll',
    GET_BY_DATE_RANGE: 'transactions:getByDateRange',
  },
  STORES: {
    CREATE: 'stores:create',
    UPDATE: 'stores:update',
    DELETE: 'stores:delete',
    GET_ALL: 'stores:getAll',
  },
  CUSTOMERS: {
    CREATE: 'customers:create',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
    GET_ALL: 'customers:getAll',
    SEARCH: 'customers:search',
  },
  EMPLOYEES: {
    CREATE: 'employees:create',
    UPDATE: 'employees:update',
    DELETE: 'employees:delete',
    GET_ALL: 'employees:getAll',
  },
  SUPPLIERS: {
    CREATE: 'suppliers:create',
    UPDATE: 'suppliers:update',
    DELETE: 'suppliers:delete',
    GET_ALL: 'suppliers:getAll',
    GET_BY_ID: 'suppliers:getById',
    GET_PRODUCTS: 'suppliers:getProducts',
    ADD_PRODUCT: 'suppliers:addProduct',
    UPDATE_PRODUCT: 'suppliers:updateProduct',
    REMOVE_PRODUCT: 'suppliers:removeProduct',
    GET_PREFERRED_FOR_PRODUCT: 'suppliers:getPreferredForProduct',
    SEARCH: 'suppliers:search',
  },
} as const
