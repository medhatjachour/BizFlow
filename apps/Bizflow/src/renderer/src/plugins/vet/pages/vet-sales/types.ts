export interface BatchLite {
  id: string
  batchNumber?: string | null
  expiryDate: string
  quantity: number
  costPerUnit: number
  sellingPrice?: number | null
  supplier?: string | null
}

export interface MedicineLite {
  id: string
  name: string
  unit: string
  category: string
  subUnit?: string | null
  subUnitsPerContainer?: number | null
  totalStock: number
  minimumStock: number
  isLowStock: boolean
  hasExpired: boolean
  batches: BatchLite[]
}

export interface CustomerLite {
  id: string
  name: string
  phone: string
}

export interface CartItem {
  id: string
  medicine: MedicineLite
  batch: BatchLite
  quantity: string
  unitPrice: string
  discount: string
  saleUnit: 'container' | 'sub'
}

export interface SalePayloadItem {
  medicineId: string
  batchId: string
  quantity: number
  unitPrice: number
  discount: number
  saleUnit: 'container' | 'sub'
}

export interface SaleSubmitPayload {
  items: SalePayloadItem[]
  ownerId?: string
  ownerName?: string
  paymentMethod: string
  notes?: string
  saleDate?: string
  cartDiscount?: number
  amountPaid?: number
}