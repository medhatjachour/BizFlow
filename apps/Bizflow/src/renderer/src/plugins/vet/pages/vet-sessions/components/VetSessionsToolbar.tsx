
import {
  Search, Plus, RefreshCw, LayoutGrid, List,
  Tag, Calendar, X, ArrowUpDown
} from 'lucide-react'
import { PeriodPreset, SessionSortField, SessionViewMode } from '../types'
import { PAYMENT_STATUS_CONFIG } from '../constants'
import { getVisitTypeLabel } from '../utils'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  period: PeriodPreset
  onPeriodChange: (p: PeriodPreset) => void
  customFrom?: string
  customTo?: string
  onCustomChange: (from?: string, to?: string) => void
  search: string
  onSearchChange: (v: string) => void
  visitTypeFilter: string
  onVisitTypeFilterChange: (v: string) => void
  paymentFilter: string
  onPaymentFilterChange: (v: string) => void
  sortField: SessionSortField
  onSortFieldChange: (v: SessionSortField) => void
  sortAsc: boolean
  onToggleSortOrder: () => void
  viewMode: SessionViewMode
  onViewModeChange: (m: SessionViewMode) => void
  onAddSession: () => void
  onManageTypes: () => void
  onRefresh: () => void
  isRefreshing: boolean
  visitTypeOptions: Array<{ value: string; label: string }>
}

export function VetSessionsToolbar({
  period,
  onPeriodChange,
  customFrom = '',
  customTo = '',
  onCustomChange,
  search,
  onSearchChange,
  visitTypeFilter,
  onVisitTypeFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  sortField,
  onSortFieldChange,
  sortAsc,
  onToggleSortOrder,
  viewMode,
  onViewModeChange,
  onAddSession,
  onManageTypes,
  onRefresh,
  isRefreshing,
  visitTypeOptions
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const presets: { id: PeriodPreset; labelEn: string; labelAr: string }[] = [
    { id: 'today', labelEn: 'Today', labelAr: 'اليوم' },
    { id: 'week', labelEn: 'Week', labelAr: 'الأسبوع' },
    { id: 'month', labelEn: 'Month', labelAr: 'الشهر' },
    { id: 'year', labelEn: 'Year', labelAr: 'السنة' },
    { id: 'custom', labelEn: 'Custom', labelAr: 'مخصص' }
  ]

  return (
    <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
      {/* Row 1: Period Presets & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isAr ? p.labelAr : p.labelEn}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
              <Calendar size={13} className="text-violet-500" />
              <DateField
                value={customFrom}
                onChange={(val) => onCustomChange(val, customTo)}
                wrapperClassName="w-32"
                className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <span className="text-slate-400 text-xs font-bold">–</span>
              <DateField
                value={customTo}
                onChange={(val) => onCustomChange(customFrom, val)}
                wrapperClassName="w-32"
                className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Manage Visit Types */}
          <button
            type="button"
            onClick={onManageTypes}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/80 dark:border-slate-700"
          >
            <Tag size={13} />
            <span>{isAr ? 'أنواع الزيارات' : 'Visit Types'}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all disabled:opacity-50"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
          </button>

          {/* Add Session */}
          <button
            type="button"
            onClick={onAddSession}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>{isAr ? 'جلسة علاجية جديدة' : 'New Session'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isAr ? 'بحث باسم المريض، المالك، الطبيب، التشخيص...' : 'Search patient, owner, vet, diagnosis...'}
              className="w-full pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Visit Type Filter */}
          <select
            value={visitTypeFilter}
            onChange={(e) => onVisitTypeFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع أنواع الزيارات' : 'All Visit Types'}</option>
            {visitTypeOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {getVisitTypeLabel(v.value, language)}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع حالات السداد' : 'All Payment Statuses'}</option>
            {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {isAr ? cfg.labelAr : cfg.labelEn}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 text-xs">
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SessionSortField)}
              className="bg-transparent px-2 py-1 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="visitDate">{isAr ? 'تاريخ الزيارة' : 'Visit Date'}</option>
              <option value="amountCharged">{isAr ? 'المبلغ' : 'Amount'}</option>
              <option value="patient">{isAr ? 'المريض' : 'Patient'}</option>
              <option value="paymentStatus">{isAr ? 'حالة السداد' : 'Payment Status'}</option>
            </select>
            <button
              type="button"
              onClick={onToggleSortOrder}
              title={sortAsc ? 'Asc' : 'Desc'}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <ArrowUpDown size={13} className={!sortAsc ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={isAr ? 'عرض الجدول' : 'Table View'}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={isAr ? 'عرض البطاقات' : 'Grid View'}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}