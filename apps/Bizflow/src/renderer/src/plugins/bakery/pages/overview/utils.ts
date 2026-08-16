export const formatCurrency = (amount: number, locale = 'en-US', currency = 'USD'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatNumber = (num: number, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(num)
}

export const getHoursRemaining = (dateStr: string): number => {
  const expiry = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.max(0, Math.round((expiry - now) / 3600000))
}

export const calculateFillPercentage = (inStock: number | null, neededPerBatch: number, batches = 10): number => {
  if (inStock === null || neededPerBatch <= 0) return 0
  const totalNeeded = neededPerBatch * batches
  return Math.min(100, Math.max(0, (inStock / totalNeeded) * 100))
}