export const formatCurrency = (amount: number | undefined | null) => {
  return `$${(Number(amount) || 0).toFixed(2)}`
}

export const formatDate = (date: string | Date | undefined | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatDateTime = (date: string | Date | undefined | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
