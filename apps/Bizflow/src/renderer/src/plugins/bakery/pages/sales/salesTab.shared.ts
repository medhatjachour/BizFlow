// Pure formatting helpers for the bakery SalesTab.

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export const fmtCurrency = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const today = () => new Date().toISOString().slice(0, 10)

export const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
