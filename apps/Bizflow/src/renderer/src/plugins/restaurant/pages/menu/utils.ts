export function calculateGrossMargin(price: number, cost: number): {
  marginPercent: number
  profit: number
  rating: 'high' | 'medium' | 'low'
} {
  const profit = Math.max(0, price - cost)
  const marginPercent = price > 0 ? Math.round((profit / price) * 100) : 0

  let rating: 'high' | 'medium' | 'low' = 'high'
  if (marginPercent < 50) rating = 'low'
  else if (marginPercent < 70) rating = 'medium'

  return { marginPercent, profit, rating }
}

export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`
}