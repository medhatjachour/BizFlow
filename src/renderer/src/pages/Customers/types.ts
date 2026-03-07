export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  loyaltyTier: LoyaltyTier
  totalSpent: number
  purchaseCount?: number
  createdAt?: string
  updatedAt?: string
}

export type CustomerFormData = {
  name: string
  email: string
  phone: string
  loyaltyTier: LoyaltyTier
}

export type CustomerProfile = {
  id: string
  name: string
  email: string | null
  phone: string
  loyaltyTier: string
  totalSpent: number
  createdAt: string
  saleTransactions: any[]
  deposits: any[]
  installments: any[]
  statistics: {
    totalSpent: number
    totalPurchases: number
    averagePurchase: number
    totalItems: number
    totalDeposits: number
    firstPurchase: string | null
    lastPurchase: string | null
    purchaseFrequency: number
    installments: {
      total: number
      paid: number
      pending: number
      overdue: number
      totalAmount: number
      paidAmount: number
      remainingAmount: number
    }
  }
  topProducts: Array<{ name: string; count: number; spent: number }>
  categorySpending: Record<string, number>
}