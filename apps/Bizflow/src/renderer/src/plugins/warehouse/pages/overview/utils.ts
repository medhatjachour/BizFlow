export function formatQuantity(qty: number, unit?: string): { formattedText: string; isPositive: boolean } {
  const isPositive = qty > 0
  const sign = isPositive ? '+' : ''
  const formattedText = `${sign}${qty.toLocaleString()} ${unit || ''}`.trim()
  return { formattedText, isPositive }
}

export function formatCompactDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    return dateString
  }
}