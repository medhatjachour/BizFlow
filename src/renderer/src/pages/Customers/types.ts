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
