/**
 * Clinic Expenses IPC Handlers
 *
 * Manages clinic operating costs — rent, utilities, medical supplies, etc.
 * Intentionally excludes "cost of goods" (not relevant for a clinic).
 *
 * Endpoints:
 *   clinic:expenses:getAll          – list expenses with optional period/category filter
 *   clinic:expenses:summary         – KPI totals (revenue, totalExpenses, netIncome, outstanding, byCategory)
 *   clinic:expenses:breakdown       – time-bucketed spend series (today→hourly, week→daily, month→daily, year→monthly)
 *   clinic:expenses:create          – create one expense record
 *   clinic:expenses:update          – update one expense record
 *   clinic:expenses:delete          – delete one expense record
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:Expenses')

// ─── Period helpers ───────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year' | string

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week': {
      // ISO week — starts on Monday
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
  }

  // end = start of tomorrow (exclusive upper bound)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

/**
 * Build an ordered array of bucket labels and an ISO-date key function
 * for the "breakdown" endpoint.
 *
 * today  → 24 hour labels  ("00", "01" … "23") — key = hour string
 * week   → Mon–Sun labels  ("Mon" … "Sun")      — key = day-of-week abbrev
 * month  → day-of-month    ("1" … "31")         — key = day number string
 * year   → month abbreviations ("Jan" … "Dec")  — key = month index string
 */
function buildBuckets(period: Period, rangeStart: Date): { labels: string[]; keyOf: (d: Date) => string } {
  switch (period) {
    case 'today': {
      const labels = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
      return { labels, keyOf: (d) => String(d.getHours()).padStart(2, '0') }
    }
    case 'week': {
      const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const labels = DAY_ABBR
      // rangeStart is Monday; bucket index = diff in days from Monday
      return {
        labels,
        keyOf: (d) => {
          const diff = Math.floor((d.getTime() - rangeStart.getTime()) / 86_400_000)
          return DAY_ABBR[Math.max(0, Math.min(6, diff))]
        }
      }
    }
    case 'year': {
      const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return { labels: MONTH_ABBR, keyOf: (d) => MONTH_ABBR[d.getMonth()] }
    }
    default: {
      // month — daily buckets
      const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate()
      const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1))
      return { labels, keyOf: (d) => String(d.getDate()) }
    }
  }
}

export function registerExpenseHandlers(prisma: any) {
  // ─── LIST ─────────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:expenses:getAll', async (_, params?: { period?: string; category?: string }) => {
    try {
      if (!prisma) return []
      const where: any = {}

      if (params?.period && params.period !== 'all') {
        const { start, end } = getPeriodRange(params.period)
        where.date = { gte: start, lt: end }
      }
      if (params?.category && params.category !== 'all') {
        where.category = params.category
      }

      return await prisma.clinicExpense.findMany({ where, orderBy: { date: 'desc' } })
    } catch (error) {
      log.error('Error fetching expenses:', error)
      throw error
    }
  })

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  // Returns revenue (from sessions), total expenses, net income, outstanding,
  // and breakdown by category — all for the requested period.
  ipcMain.handle('clinic:expenses:summary', async (_, period = 'month') => {
    try {
      if (!prisma) return { revenue: 0, totalExpenses: 0, netIncome: 0, outstanding: 0, byCategory: [] }

      const { start, end } = getPeriodRange(period)

      const [expenseRows, revAgg, salaryRows] = await Promise.all([
        prisma.clinicExpense.findMany({
          where: { date: { gte: start, lt: end } },
          select: { category: true, amount: true }
        }),
        prisma.clinicSession.aggregate({
          _sum: { amountCharged: true, amountPaid: true },
          where: { visitDate: { gte: start, lt: end } }
        }),
        // Salary records don't have a date field — they use month+year integers.
        // Map the requested period to the appropriate month/year filter so that
        // paid/pending salary costs are included in the expense totals.
        (() => {
          const now = new Date()
          const salWhere: any = {}
          if (period === 'year') {
            salWhere.year = now.getFullYear()
          } else {
            // today / week / month all fall within the current calendar month
            salWhere.month = now.getMonth() + 1
            salWhere.year = now.getFullYear()
          }
          return prisma.clinicSalaryRecord.findMany({
            where: salWhere,
            select: { netPay: true }
          })
        })()
      ])

      const expenseTotal: number = expenseRows.reduce((s: number, e: any) => s + e.amount, 0)
      const totalSalaries: number = salaryRows.reduce((s: number, r: any) => s + (r.netPay ?? 0), 0)
      const totalExpenses = expenseTotal + totalSalaries

      const categoryMap: Record<string, number> = {}
      for (const e of expenseRows) {
        categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
      }
      // Add salary payroll as a virtual category so it shows in the breakdown chart
      if (totalSalaries > 0) {
        categoryMap['salaries_payroll'] = (categoryMap['salaries_payroll'] ?? 0) + totalSalaries
      }
      const byCategory = Object.entries(categoryMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)

      const revenue = revAgg._sum.amountPaid ?? 0
      const outstanding = (revAgg._sum.amountCharged ?? 0) - revenue
      const netIncome = revenue - totalExpenses

      return { revenue, totalExpenses, totalSalaries, netIncome, outstanding, byCategory }
    } catch (error) {
      log.error('Error building expense summary:', error)
      throw error
    }
  })

  // ─── BREAKDOWN (time-series) ───────────────────────────────────────────────
  // Returns an array of { label, total } buckets for the requested period so
  // the UI can render a spend-over-time bar / line chart.
  //
  //   today  → 24 hourly buckets
  //   week   → 7 daily buckets (Mon–Sun)
  //   month  → N daily buckets (1…31)
  //   year   → 12 monthly buckets (Jan–Dec)
  //
  // An optional `category` filter narrows to a single expense category.
  ipcMain.handle('clinic:expenses:breakdown', async (_, params?: { period?: Period; category?: string }) => {
    try {
      if (!prisma) return []

      const period = params?.period ?? 'month'
      const { start, end } = getPeriodRange(period)
      const { labels, keyOf } = buildBuckets(period, start)

      const where: any = { date: { gte: start, lt: end } }
      if (params?.category && params.category !== 'all') {
        where.category = params.category
      }

      const rows: { date: Date; amount: number }[] = await prisma.clinicExpense.findMany({
        where,
        select: { date: true, amount: true }
      })

      // Aggregate into buckets
      const totals: Record<string, number> = {}
      for (const row of rows) {
        const key = keyOf(new Date(row.date))
        totals[key] = (totals[key] ?? 0) + row.amount
      }

      return labels.map((label) => ({ label, total: totals[label] ?? 0 }))
    } catch (error) {
      log.error('Error building expense breakdown:', error)
      throw error
    }
  })

  // ─── CREATE ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:expenses:create', async (_, data: any) => {
    try {
      if (!prisma) throw new Error('Database not available')
      return await prisma.clinicExpense.create({ data })
    } catch (error) {
      log.error('Error creating expense:', error)
      throw error
    }
  })

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:expenses:update', async (_, { id, data }: { id: string; data: any }) => {
    try {
      if (!prisma) throw new Error('Database not available')
      return await prisma.clinicExpense.update({ where: { id }, data })
    } catch (error) {
      log.error('Error updating expense:', error)
      throw error
    }
  })

  // ─── DELETE ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:expenses:delete', async (_, id: string) => {
    try {
      if (!prisma) throw new Error('Database not available')
      await prisma.clinicExpense.delete({ where: { id } })
      return { success: true }
    } catch (error) {
      log.error('Error deleting expense:', error)
      throw error
    }
  })
}
