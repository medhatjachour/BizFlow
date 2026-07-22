import type { Preset, Transaction, FinanceOverview } from './types'

// ── Date helpers ────────────────────────────────────────────────────────────
export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function applyPreset(preset: Preset): { from: string; to: string } {
  if (preset === 'all') return { from: '', to: '' }
  const to = endOfToday()
  const from = startOfToday()
  if (preset === 'week')  from.setDate(from.getDate() - 6)
  if (preset === 'month') from.setDate(1)
  return { from: fmtDate(from), to: fmtDate(to) }
}

// ── Formatters ──────────────────────────────────────────────────────────────
export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateLabel(from: string, to: string): string {
  if (!from && !to) return 'All Time'
  if (from === to) {
    return new Date(from).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const f = new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const t = new Date(to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${f} – ${t}`
}

// ── CSV Export ──────────────────────────────────────────────────────────────
export function exportToCsv(
  overview: FinanceOverview | null,
  transactions: Transaction[],
  from: string,
  to: string
): void {
  const lines: string[] = []

  // ── Header ──
  lines.push('BizFlow Coffee — Finance Report')
  lines.push(`Period,${formatDateLabel(from, to)}`)
  lines.push(`Generated,${new Date().toLocaleString()}`)
  lines.push('')

  // ── Overview section ──
  if (overview) {
    lines.push('=== OVERVIEW ===')
    lines.push(`Gross Sales,${overview.grossSales.toFixed(2)}`)
    lines.push(`Total Discount,${overview.totalDiscount.toFixed(2)}`)
    lines.push(`Net Sales,${overview.netSales.toFixed(2)}`)
    lines.push(`Total Orders,${overview.totalOrders}`)
    lines.push(`Average Order Value,${overview.averageOrderValue.toFixed(2)}`)
    lines.push(`COGS,${overview.cogs.toFixed(2)}`)
    lines.push(`Gross Profit,${overview.grossProfit.toFixed(2)}`)
    lines.push(`Gross Margin %,${overview.grossMarginPct.toFixed(1)}%`)
    lines.push(`Operational Expenses,${overview.operationalExpenses.toFixed(2)}`)
    lines.push(`Net Profit After Expenses,${overview.netProfitAfterExpenses.toFixed(2)}`)
    lines.push(`Discounted Orders,${overview.discountedOrders}`)
    lines.push(`Discount Order Rate %,${overview.discountOrderRatePct.toFixed(1)}%`)
    lines.push(`Refunds and Voids,${overview.refundsAndVoids.toFixed(2)}`)
    lines.push(`Open Orders Count,${overview.openOrdersCount}`)
    lines.push(`Open Orders Value,${overview.openOrdersValue.toFixed(2)}`)
    lines.push('')

    lines.push('=== PAYMENT BREAKDOWN ===')
    lines.push(`Cash,${(overview.payment.cash ?? 0).toFixed(2)}`)
    lines.push(`Card,${(overview.payment.card ?? 0).toFixed(2)}`)
    lines.push(`Vodafone Cash,${(overview.payment.vodafone_cash ?? 0).toFixed(2)}`)
    lines.push('')

    lines.push('=== DRAWER SETTLEMENT ===')
    const s = overview.shiftStats
    lines.push(`Opening Cash,${s.openingCash.toFixed(2)}`)
    lines.push(`Cash Sales,${s.cashSales.toFixed(2)}`)
    lines.push(`Expected Drawer,${s.expectedDrawer.toFixed(2)}`)
    lines.push(`Actual Closing,${s.closingCash.toFixed(2)}`)
    lines.push(`Cash Variance,${s.cashDifference.toFixed(2)}`)
    lines.push(`Closed Shifts,${s.closedShifts}`)
    lines.push(`Linked Expenses,${s.linkedExpenseTotal.toFixed(2)}`)
    lines.push(`After Expenses,${s.expectedAfterExpenses.toFixed(2)}`)
    lines.push('')
  }

  // ── Transactions ──
  lines.push('=== TRANSACTIONS ===')
  lines.push('Order,Type,Payment,Cashier,Customer,Table,Subtotal,Discount,Total,Closed At')
  for (const row of transactions) {
    const cols = [
      row.orderNumber,
      row.type,
      row.paymentMethod || '',
      row.cashier?.fullName || row.cashier?.username || '',
      row.customerName || '',
      row.table ? `Table ${row.table.number}` : '',
      row.subtotal.toFixed(2),
      row.discount.toFixed(2),
      row.total.toFixed(2),
      row.closedAt || '',
    ]
    // Wrap values containing commas in quotes
    const escaped = cols.map(c => {
      if (c.includes(',') || c.includes('"')) {
        return `"${c.replace(/"/g, '""')}"`
      }
      return c
    })
    lines.push(escaped.join(','))
  }

  // ── Download ──
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `coffee-finance-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
