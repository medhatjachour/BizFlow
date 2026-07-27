import { Search, Plus, Download, ArrowUpDown } from 'lucide-react'
import { INPUT_CLASS } from '../constants'
import type { CustomerFilters } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import CustomSelect from '@renderer/components/ui/CustomSelect'

interface Props {
  filters: CustomerFilters
  onChange: (patch: Partial<CustomerFilters>) => void
  onAdd: () => void
  onExport: () => void
}

export function CustomersToolbar({ filters, onChange, onAdd, onExport }: Props) {
  const { t } = useLanguage()

  const SORT_OPTIONS = [
    { value: 'recent', label: t('cfRecentActivity') || 'Recent Activity' },
    { value: 'name_asc', label: t('cfNameAZ') || 'Name (A-Z)' },
    { value: 'spent_desc', label: t('cfHighestSpend') || 'Highest Spend' },
    { value: 'visits_desc', label: t('cfMostVisits') || 'Most Visits' }
  ]
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={
              t('cfSearchByNamePhoneOrAddress') || 'Search by name, phone, or address...'
            }
            className={INPUT_CLASS + ' pl-9'}
          />
        </div>

        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <div className="min-w-[180px]">
            <CustomSelect
              value={filters.sort}
              onChange={(v) => onChange({ sort: v as any })}
              options={SORT_OPTIONS}
            />
          </div>

          {/* <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as any })}
            className={INPUT_CLASS + ' pl-9 pr-8 appearance-none cursor-pointer'}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select> */}
        </div>

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('cfExport') || 'Export'}
        </button>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('cfAddCustomer') || 'Add Customer'}
        </button>
      </div>
    </div>
  )
}
