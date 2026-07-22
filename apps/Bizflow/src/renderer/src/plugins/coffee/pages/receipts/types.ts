export interface Category { id: string; name: string }
export interface Product { id: string; name: string; cost: number; categoryId?: string; category?: Category; stock: number }

export interface ReceiptItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
  notes?: string | null
  product?: { id: string; categoryId?: string; category?: Category }
}

export interface IncomingReceipt {
  id: string
  receiptNumber: string
  supplierName?: string | null
  invoiceNumber?: string | null
  receivedAt: string
  totalCost: number
  notes?: string | null
  items: ReceiptItem[]
}

export interface IncomingSummary {
  totalReceipts: number
  totalCost: number
  totalUnits: number
  averageReceiptCost: number
  supplierCount: number
  topCategories: Array<{ categoryName: string; units: number; totalCost: number }>
}

export interface TransitItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  weight?: number | null
  notes?: string | null
}

export interface TransitReceipt {
  id: string
  receiptNumber: string
  senderName?: string | null
  senderPhone?: string | null
  recipientName?: string | null
  recipientPhone?: string | null
  recipientAddress?: string | null
  receivedAt: string
  deliveredAt?: string | null
  status: 'received' | 'in_transit' | 'delivered' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  totalAmount: number
  deliveryFee: number
  notes?: string | null
  items: TransitItem[]
}

export interface TransitSummary {
  totalReceipts: number
  totalAmount: number
  totalDeliveryFees: number
  totalItems: number
  statusCounts: { received: number; in_transit: number; delivered: number; cancelled: number }
  priorityCounts: { low: number; normal: number; high: number; urgent: number }
  senderCount: number
  recipientCount: number
  deliveredCount: number
  pendingCount: number
}
