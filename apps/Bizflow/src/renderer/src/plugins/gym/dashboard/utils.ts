export function formatCurrency(n: number, currency: string = '$'): string {
  const isNeg = n < 0
  const val = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${isNeg ? '-' : ''}${currency}${val}`
}

export function formatCompactNumber(n: number, currency: string = '$'): string {
  const isNeg = n < 0
  const abs = Math.abs(n)
  let formatted = `${abs}`

  if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(1)}M`
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1)}K`
  } else {
    formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }

  return `${isNeg ? '-' : ''}${currency}${formatted}`
}

export function getDaysRemaining(targetDate: string | Date): number {
  const diff = new Date(targetDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}