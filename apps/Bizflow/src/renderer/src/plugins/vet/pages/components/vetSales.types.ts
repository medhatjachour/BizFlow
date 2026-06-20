/**
 * Shared types for the Vet Sales tab and its sub-components.
 *
 * These were extracted from VetSalesTab.tsx so each sub-component
 * (operation form, history rows, modals) can import exactly what it needs.
 */

export interface BatchLite {
  id: string; batchNumber?: string | null; expiryDate: string
  quantity: number; costPerUnit: number; sellingPrice?: number | null
  supplier?: string | null
}

export interface MedicineLite {
  id: string; name: string; unit: string; category: string
  subUnit?: string | null; subUnitsPerContainer?: number | null
  totalStock: number; minimumStock: number
  isLowStock: boolean; hasExpired: boolean
  batches: BatchLite[]
}

export interface Sale {
  id: string; quantity: number; unitPrice: number; totalPrice: number
  discount: number; patientName?: string | null; ownerName?: string | null; ownerId?: string | null
  paymentMethod?: string | null; amountPaid?: number | null; paymentStatus?: string | null
  notes?: string | null; saleDate: string; saleUnit?: 'container' | 'sub'
  saleGroupId?: string | null
  status?: string | null; refundedQty?: number | null; refundedAmount?: number | null
  medicine: { id: string; name: string; unit: string; subUnit?: string | null; subUnitsPerContainer?: number | null; category?: string }
  batch: { id: string; batchNumber?: string | null; expiryDate: string; costPerUnit?: number }
  costPerUnit?: number; costTotal?: number; grossProfit?: number
}

export interface CustomerLite { id: string; name: string; phone: string }

/** A grouped transaction (combined receipt) — every line item shares a saleGroupId. */
export interface SaleGroup {
  groupKey: string
  saleGroupId: string | null
  saleDate: string
  itemCount: number
  total: number
  discount: number
  cost: number
  grossProfit: number
  paid: number
  remaining: number
  refunded?: number
  refundedCount?: number
  txStatus?: string
  paymentStatus: string
  ownerId?: string | null
  ownerName?: string | null
  paymentMethod?: string | null
  notes?: string | null
  items: Sale[]
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
