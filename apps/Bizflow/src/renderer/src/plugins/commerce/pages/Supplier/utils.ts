export const formatCurrency = (amount: number, locale = 'en-US', currency = 'USD'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

export const formatDate = (dateString?: string | Date | null, locale = 'en-US'): string => {
  if (!dateString) return '—'
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export const calculatePOTotal = (
  items: { quantity: number; unitCost: number }[],
  taxAmount = 0,
  shippingCost = 0
): { subtotal: number; total: number } => {
  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0)
  const total = subtotal + (Number(taxAmount) || 0) + (Number(shippingCost) || 0)
  return { subtotal, total }
}