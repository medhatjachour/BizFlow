// import { useMemo } from 'react'
import {
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
  Boxes,
  Percent,
  BadgeDollarSign,
  Receipt,
  Package,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

// Hooks
import { useDateRange } from './hooks/useDateRange'
import { useReports } from './hooks/useReports'
import { useExport } from './hooks/useExport'

// Components
import { StatCard } from './components/StatCard'
import { DateRangePicker } from './components/DateRangePicker'
import { ExportMenu } from './components/ExportMenu'
import { RevenueChart } from './components/RevenueChart'
import { TopProductsTable } from './components/TopProductsTable'
import { CategoryPerformance } from './components/CategoryPerformance'
import { ExpenseBreakdown } from './components/ExpenseBreakdown'
import { CustomerInsights } from './components/CustomerInsights'
import { CashierLeaderboard } from './components/CashierLeaderboard'
import { OrderTypeMix } from './components/OrderTypeMix'
import { PaymentMix } from './components/PaymentMix'
import { OperatorSnapshot } from './components/OperatorSnapshot'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { EmptyState } from './components/EmptyState'

// Utils
import { formatCurrency, formatNumber, formatPercent } from './utils'

export default function ReportsTab() {
  const toast = useToast()
  const { t } = useLanguage()

  // Date range management
  const { from, to, filters, activePreset, setPreset, setFrom, setTo } = useDateRange('month')

  // Data fetching
  const {
    overview,
    trend,
    topProducts,
    categories,
    customers,
    loading,
    error,
    refresh,
    // lastUpdated
  } = useReports(filters, toast)

  // Export functionality
  const { handleExport, exporting } = useExport({
    overview,
    trend,
    topProducts,
    categories,
    customers,
    from,
    to,
    t,
    toast
  })

  // const dateRangeLabel = useMemo(() => getDateRangeLabel(from, to, t), [from, to, t])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load Reports"
          description={error}
          action={
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
            >
              Try Again
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 print:bg-white print:p-0">
      {/* Header */}
        <div className="flex flex-wrap   justify-between  mb-4 print:hidden">
          {/* Date Range Picker */}
          <div>
            <DateRangePicker
              from={from}
              to={to}
              activePreset={activePreset}
              onPresetChange={setPreset}
              onFromChange={setFrom}
              onToChange={setTo}
              t={t}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <ExportMenu onExport={handleExport} exporting={exporting} disabled={!overview} />
          </div>
        </div>
      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Content */}
      {!loading && overview && (
        <div className="space-y-6">
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('cfRevenueLabel')}
              value={formatCurrency(overview.totalRevenue)}
              sub={`${overview.totalOrders} orders`}
              icon={BadgeDollarSign}
              tone="revenue"
              loading={loading}
            />
            <StatCard
              label={t('cfGrossProfitLabel')}
              value={formatCurrency(overview.grossProfit)}
              sub={`${formatPercent(overview.grossMarginPct)} margin`}
              description={t('cfGrossProfitDescDetail')}
              icon={TrendingUp}
              tone="profit"
              loading={loading}
            />
            <StatCard
              label={t('cfNetProfitLabel')}
              value={formatCurrency(overview.netProfitAfterExpenses)}
              sub={`${formatPercent(overview.netMarginPct)} net margin`}
              description={t('cfNetProfitDescDetail')}
              icon={BadgeDollarSign}
              tone="profit"
              loading={loading}
            />
            <StatCard
              label={t('cfTotalOrders')}
              value={formatNumber(overview.totalOrders)}
              sub={`${formatCurrency(overview.averageOrderValue)} avg`}
              icon={Boxes}
              tone="orders"
              loading={loading}
            />
            <StatCard
              label={t('cfItemsSold')}
              value={formatNumber(overview.totalItemsSold)}
              sub={`${overview.avgItemsPerOrder.toFixed(1)} per order`}
              icon={Package}
              tone="items"
              loading={loading}
            />
            <StatCard
              label={t('cfUniqueCustomers')}
              value={formatNumber(overview.uniqueCustomers)}
              sub={`${formatPercent(overview.repeatCustomerRatePct)} repeat rate`}
              icon={Users}
              tone="customers"
              loading={loading}
            />
            <StatCard
              label={t('cfTotalDiscount')}
              value={formatCurrency(overview.totalDiscount)}
              sub={`${formatPercent(overview.discountRatePct)} discount rate`}
              icon={DollarSign}
              tone="discount"
              loading={loading}
            />
            <StatCard
              label={t('cfTotalExpenses')}
              value={formatCurrency(overview.totalExpenses)}
              sub={`D = ${formatCurrency(overview.totalExpenses-overview.totalCogs)} ${overview.expenseCount} ops + ${formatCurrency(overview.totalCogs)} COGS`}
              description={t('cfExpenseDescDetail')}
              icon={Receipt}
              tone="expense"
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart trend={trend} loading={loading} t={t} />
            <OperatorSnapshot overview={overview} loading={loading} t={t} />
          </div>

          {/* Payment & Order Type Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentMix overview={overview} loading={loading} />
            <OrderTypeMix overview={overview} loading={loading} t={t} />
          </div>

          {/* Products & Categories Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsTable products={topProducts} loading={loading} t={t} />
            <CategoryPerformance categories={categories} loading={loading} t={t} />
          </div>

          {/* Customers & Expenses Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerInsights customers={customers} loading={loading} t={t} />
            <ExpenseBreakdown overview={overview} loading={loading} t={t} />
          </div>

          {/* Cashier Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashierLeaderboard overview={overview} loading={loading} t={t} />
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Quick Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Revenue Performance
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Average daily revenue:{' '}
                      {formatCurrency(overview.totalRevenue / Math.max(trend.length, 1))}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Customer Loyalty
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {overview.repeatCustomers} customers returned (
                      {formatPercent(overview.repeatCustomerRatePct)})
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                  <Trophy className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Top Performer
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {overview.topCashiers[0]?.name ?? 'N/A'} led with{' '}
                      {formatCurrency(overview.topCashiers[0]?.revenue ?? 0)} in sales
                    </p>
                  </div>
                </div>

                {overview.lowStockCount + overview.outOfStockCount > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
                    <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                        Stock Alert
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {overview.lowStockCount} items low, {overview.outOfStockCount} out of stock
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !overview && !error && (
        <EmptyState
          icon={TrendingUp}
          title="No Report Data"
          description="Try selecting a different date range or check back later."
        />
      )}
    </div>
  )
}
