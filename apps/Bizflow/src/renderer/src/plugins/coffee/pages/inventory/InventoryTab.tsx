import { useToast } from '@renderer/contexts/ToastContext'
import { useInventory } from './hooks/useInventory'
import { KPICards } from './components/KPICards'
import { StockAlertBanner } from './components/StockAlertBanner'
import { FilterBar } from './components/FilterBar'
import { CategoryGroup } from './components/CategoryGroup'
import { AdjustStockModal } from './components/AdjustStockModal'
import { HistoryDrawer } from './components/HistoryDrawer'
import { Package } from 'lucide-react'

export default function InventoryTab() {
  const toast = useToast()
  const inv = useInventory(toast)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track stock levels, values, and movements</p>
        </div>
      </div>

      {/* KPI cards */}
      <KPICards kpis={inv.kpis} loading={inv.loading} />

      {/* Alert banner */}
      <StockAlertBanner lowCount={inv.kpis.lowCount} outCount={inv.kpis.outCount} />

      {/* Filters */}
      <FilterBar
        search={inv.search}
        setSearch={inv.setSearch}
        filter={inv.filter}
        setFilter={inv.setFilter}
        counts={{ all: inv.products.length, low: inv.kpis.lowCount, out: inv.kpis.outCount }}
        onRefresh={inv.load}
      />

      {/* Category groups */}
      {inv.groups.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          {inv.loading ? 'Loading…' : 'No products found'}
        </div>
      ) : (
        <div className="space-y-3">
          {inv.groups.map(group => {
            const gKey = group.category?.id ?? '__none__'
            return (
              <CategoryGroup
                key={gKey}
                group={group}
                isCollapsed={inv.collapsed.has(gKey)}
                onToggle={() => inv.toggleCollapse(gKey)}
                onAdjust={inv.openAdjust}
                onHistory={inv.openHistory}
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      <AdjustStockModal
        product={inv.adjProduct}
        form={inv.adjForm}
        patchForm={inv.patchAdjust}
        onSubmit={inv.submitAdjust}
        onClose={inv.closeAdjust}
        saving={inv.adjusting}
      />

      <HistoryDrawer
        product={inv.histProduct}
        movements={inv.movements}
        allMovementsCount={inv.allMovementsCount}
        loading={inv.loadingHist}
        onClose={inv.closeHistory}
        period={inv.histPeriod}
        setPeriod={inv.setHistPeriod}
        typeFilter={inv.histType}
        setTypeFilter={inv.setHistType}
        page={inv.histPage}
        setPage={inv.setHistPage}
        totalPages={inv.totalHistPages}
        stats={inv.histStats}
      />
    </div>
  )
}
