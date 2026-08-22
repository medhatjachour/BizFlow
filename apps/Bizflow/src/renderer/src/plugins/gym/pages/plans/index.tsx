import { Loader2, ListChecks } from 'lucide-react'
import { usePlans } from './hooks/usePlans'
import { PlanToolbar } from './components/PlanToolbar'
import { PlanCategoryFilter } from './components/PlanCategoryFilter'
import { PlanStatsStrip } from './components/PlanStatsStrip'
import { PlanCard } from './components/PlanCard'
import { PlanFormModal } from './components/form/PlanFormModal'
import { DeletePlanModal } from './components/DeletePlanModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function PlansTab() {
  const { t } = useLanguage()
  const {
    plans,
    rawPlans,
    loading,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    categoryCounts,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handlePlanSaved,
    handleDelete
  } = usePlans()

  const handleOpenAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (plan: any) => {
    setEditTarget(plan)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Top Search & Create Bar */}
      <PlanToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddNew={handleOpenAdd}
        totalCount={rawPlans.length}
      />

      {/* KPI Overview Summary */}
      <PlanStatsStrip plans={rawPlans} />

      {/* Category Filter Chips */}
      {rawPlans.length > 0 && (
        <PlanCategoryFilter
          activeCategory={filterCategory}
          onSelectCategory={setFilterCategory}
          categoryCounts={categoryCounts}
          totalPlans={rawPlans.length}
        />
      )}

      {/* Main Grid View / Empty State */}
      {loading && rawPlans.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <ListChecks size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {rawPlans.length === 0
              ? t('gymNoPlans') || 'No membership packages created yet'
              : 'No packages match the selected criteria'}
          </p>
          {rawPlans.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Click "Create New Plan" to configure your gym membership offerings.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              onEdit={() => handleOpenEdit(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editTarget}
        onSaved={handlePlanSaved}
      />

      {/* Delete Confirmation Modal */}
      <DeletePlanModal
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}