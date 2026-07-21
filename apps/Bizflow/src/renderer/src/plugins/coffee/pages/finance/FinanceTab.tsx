import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useFinance } from './hooks/useFinance'
import { FilterBar } from './components/FilterBar'
import { KpiCards } from './components/KpiCards'
import { ProfitWaterfall } from './components/ProfitWaterfall'
import { PaymentBreakdown } from './components/PaymentBreakdown'
import { DrawerSettlement } from './components/DrawerSettlement'
import { TransactionsTable } from './components/TransactionsTable'
import { BarChart3 } from 'lucide-react'

export default function FinanceTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const fin = useFinance(toast)

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('cfFinanceDashboard')}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('cfTrackRevenue')}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        preset={fin.filters.preset}
        onPreset={fin.applyPresetRange}
        from={fin.filters.from}
        to={fin.filters.to}
        setFrom={(v) => fin.patchFilters({ from: v })}
        setTo={(v) => fin.patchFilters({ to: v })}
        type={fin.filters.type}
        setType={(t) => fin.patchFilters({ type: t })}
        paymentMethod={fin.filters.paymentMethod}
        setPaymentMethod={(p) => fin.patchFilters({ paymentMethod: p })}
        onRefresh={fin.load}
        onExport={fin.handleExport}
      />

      {/* KPI cards */}
      <KpiCards overview={fin.overview} loading={fin.loading} />

      {/* Two-column: Profit waterfall + Payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfitWaterfall data={fin.waterfallData} loading={fin.loading} />
        <PaymentBreakdown data={fin.paymentData} loading={fin.loading} />
      </div>

      {/* Drawer settlement (full width) */}
      <DrawerSettlement
        overview={fin.overview}
        variance={fin.drawerVariance}
        loading={fin.loading}
      />

      {/* Transactions table (full width) */}
      <TransactionsTable
        transactions={fin.transactions}
        search={fin.filters.search}
        setSearch={(s) => fin.patchFilters({ search: s })}
        page={fin.filters.page}
        totalPages={fin.totalPages}
        setPage={fin.setPage}
        loading={fin.loading}
      />
    </div>
  )
}
