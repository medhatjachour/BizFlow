import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useExpenses } from './hooks/useExpenses'
import { SummaryCards } from './components/SummaryCards'
import { FilterBar } from './components/FilterBar'
import { ExpenseTable } from './components/ExpenseTable'
import { ExpenseModal } from './components/ExpenseModal'

export default function ExpensesTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const exp = useExpenses(toast)

  return (
    <div className="p-4 lg:p-6 space-y-4 mx-auto">

      {/* Filter bar */}
      <FilterBar
        filters={exp.filters}
        patchFilters={exp.patchFilters}
        onRefresh={exp.load}
        onAdd={exp.openCreate}
        activeShift={exp.activeShift}
      />
      
      {/* Summary cards */}
      <SummaryCards summary={exp.summary} loading={exp.loading} />

      

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('cfExpenseHistory')}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {exp.rows.length} {t('cfItems')}
          </span>
        </div>
        <ExpenseTable
          rows={exp.rows}
          loading={exp.loading}
          onEdit={exp.openEdit}
          onDelete={exp.remove}
        />
      </div>

      {/* Modal */}
      <ExpenseModal
        open={exp.modalOpen}
        onClose={exp.closeModal}
        onSubmit={exp.save}
        form={exp.form}
        patchForm={exp.patchForm}
        editing={exp.editing}
        saving={exp.saving}
        activeShift={exp.activeShift}
      />
    </div>
  )
}
