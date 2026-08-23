export type SaleUnitType = 'base' | 'sub'

export interface PharmacyProduct {
  id: string
  name: string
  genericName?: string
  barcode?: string
  category?: string
  unit: string
  subUnit?: string | null
  subUnitsPerContainer?: number | null
  subUnitPrice?: number | null
  sellingPrice: number
  totalStock: number
  isLowStock?: boolean
  hasExpired?: boolean
}

export interface CartLine {
  productId: string
  name: string
  unit: string
  subUnit?: string | null
  ratio?: number | null
  subUnitPrice?: number | null
  baseSellingPrice: number
  saleUnit: SaleUnitType
  unitPrice: number
  quantity: number
  stockBase: number
}

export interface PosCustomer {
  id: string
  name: string
  phone?: string
  defaultDiscount?: number
}

export type PaymentMethod = 'cash' | 'card' | 'credit' | 'other'

export interface SaleTransactionResult {
  id: string
  saleNumber: string
  items: CartLine[]
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  change: number
  paymentMethod: PaymentMethod
  customer?: PosCustomer | null
  createdAt: string
}