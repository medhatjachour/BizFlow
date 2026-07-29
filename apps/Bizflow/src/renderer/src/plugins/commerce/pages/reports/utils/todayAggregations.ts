import { ShoppingCart, Receipt } from 'lucide-react'
import { calculateRefundedAmount } from '@/shared/utils/refundCalculations'
import type { ActivityItem, ItemSummary, TodayStats } from '@renderer/pages/Reports/types'

type SaleTransaction = {
  id: string
  createdAt: string
  customerName?: string
  subtotal?: number
  total: number
  items?: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    refundedQuantity?: number
    price: number
    totalPrice?: number
    product?: {
      name?: string
      baseCost?: number
      category?: { name?: string }
    }
  }>
}

/** Matches window.api.expenses.getAll records */
type ExpenseRecord = {
  id: string
  amount: number
  description?: string
  date?: string
  createdAt?: string
}

type VariantInfo = {
  color?: string
  size?: string
}

export function getTodayDateRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function computeTodayStats(
  salesData: SaleTransaction[],
  expensesData: ExpenseRecord[]
): TodayStats {
  let totalRevenue = 0
  let totalCashIn = 0
  let totalCOGS = 0

  salesData.forEach((sale) => {
    const refunded = calculateRefundedAmount(sale.items || [])
    totalRevenue += (sale.subtotal ?? sale.total) - refunded
    totalCashIn += sale.total - refunded

    sale.items?.forEach((item) => {
      const netQty = item.quantity - (item.refundedQuantity || 0)
      if (netQty > 0 && item.product?.baseCost) {
        totalCOGS += netQty * item.product.baseCost
      }
    })
  })

  const expenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)

  return {
    revenue: totalRevenue,
    revenueWithTax: totalCashIn,
    expenses,
    cogs: totalCOGS,
    profit: totalRevenue - totalCOGS - expenses,
    cashInSafe: totalCashIn - expenses,
    salesCount: salesData.length,
    expensesCount: expensesData.length,
    topProduct: '',
    revenueChange: 0,
  }
}

export function buildVariantLabel(variant: VariantInfo | null | undefined): string {
  if (!variant) return 'Base Product'
  const label = [variant.color, variant.size].filter(Boolean).join(' / ')
  return label || 'Base Product'
}

export function buildItemsSummary(
  salesData: SaleTransaction[],
  variantsMap: Map<string, VariantInfo>
): { itemsSummary: ItemSummary[]; totalPiecesSold: number } {
  const itemsMap = new Map<string, ItemSummary>()
  let totalPiecesSold = 0

  salesData.forEach((sale) => {
    sale.items?.forEach((item) => {
      const netQty = item.quantity - (item.refundedQuantity || 0)
      if (netQty <= 0) return

      totalPiecesSold += netQty

      const variant = item.variantId ? variantsMap.get(item.variantId) : null
      const variantName = buildVariantLabel(variant)
      const key = item.productId
      const itemRevenue = item.totalPrice ?? item.price * netQty

      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key)!
        existing.totalQuantity += netQty
        existing.revenue += itemRevenue

        const existingVariant = existing.variants?.find(
          (v) => v.variantId === item.variantId && v.variantName === variantName
        )

        if (existingVariant) {
          existingVariant.quantity += netQty
          existingVariant.revenue += itemRevenue
        } else {
          existing.variants = existing.variants || []
          existing.variants.push({
            variantId: item.variantId || null,
            variantName,
            quantity: netQty,
            revenue: itemRevenue,
          })
        }
      } else {
        itemsMap.set(key, {
          productId: item.productId,
          productName: item.product?.name || 'Unknown',
          totalQuantity: netQty,
          revenue: itemRevenue,
          category: item.product?.category?.name,
          variants: [
            {
              variantId: item.variantId || null,
              variantName,
              quantity: netQty,
              revenue: itemRevenue,
            },
          ],
        })
      }
    })
  })

  const itemsSummary = Array.from(itemsMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  )

  return { itemsSummary, totalPiecesSold }
}

export function buildActivityFeed(
  salesData: SaleTransaction[],
  expensesData: ExpenseRecord[],
  limit: number
): ActivityItem[] {
  const activities: ActivityItem[] = []

  salesData.forEach((sale) => {
    activities.push({
      id: sale.id,
      type: 'sale',
      time: new Date(sale.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      description: `Sale: ${sale.customerName || 'Walk-in Customer'}`,
      amount: sale.total,
      icon: ShoppingCart,
      saleData: sale,
      // @ts-expect-error — sort helper only; UI uses `time`
      _sortAt: new Date(sale.createdAt).getTime(),
    })
  })

  expensesData.forEach((expense) => {
    const created = expense.date || expense.createdAt || new Date().toISOString()
    activities.push({
      id: expense.id,
      type: 'expense',
      time: new Date(created).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      description: `Expense: ${expense.description ?? 'Expense'}`,
      amount: expense.amount,
      icon: Receipt,
      // @ts-expect-error
      _sortAt: new Date(created).getTime(),
    })
  })

  activities.sort((a, b) => {
    const aTime = (a as any)._sortAt ?? 0
    const bTime = (b as any)._sortAt ?? 0
    return bTime - aTime
  })

  return activities.slice(0, limit).map(({ _sortAt, ...rest }: any) => rest)
}

export function collectVariantIds(salesData: SaleTransaction[]): string[] {
  const ids = new Set<string>()
  salesData.forEach((sale) => {
    sale.items?.forEach((item) => {
      if (item.variantId) ids.add(item.variantId)
    })
  })
  return Array.from(ids)
}