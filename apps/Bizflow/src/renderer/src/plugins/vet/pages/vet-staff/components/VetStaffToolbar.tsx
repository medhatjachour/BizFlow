import {
  Search, Plus, RefreshCw, LayoutGrid, List,
   ArrowUpDown, X,  Users, UserCheck, ShieldCheck
} from 'lucide-react'
import { StaffSortField, StaffViewMode } from '../types'
import { EMP_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface VetStaffToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: 'all' | 'active' | 'inactive'
  onStatusFilterChange: (v: 'all' | 'active' | 'inactive') => void
  empTypeFilter: string
  onEmpTypeFilterChange: (v: string) => void
  sortField: StaffSortField
  onSortFieldChange: (field: StaffSortField) => void
  sortAsc: boolean
  onToggleSortOrder: () => void
  viewMode: StaffViewMode
  onViewModeChange: (m: StaffViewMode) => void
  onAddStaff: () => void
  onRefresh: () => void
  isRefreshing: boolean
  metrics: { total: number; active: number; inactive: number; fullTime: number }
}

export function VetStaffToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  empTypeFilter,
  onEmpTypeFilterChange,
  sortField,
  onSortFieldChange,
  sortAsc,
  onToggleSortOrder,
  viewMode,
  onViewModeChange,
  onAddStaff,
  onRefresh,
  isRefreshing,
  metrics
}: VetStaffToolbarProps) {
  const {  language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="space-y-3.5">
      {/* ── KPI Quick Summary Badges ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {isAr ? 'إجمالي الأطباء' : 'Total Doctors'}
            </p>
            <p className="text-base font-black text-slate-900 dark:text-white leading-tight">{metrics.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {isAr ? 'الأطباء النشطون' : 'Active Duty'}
            </p>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">{metrics.active}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {isAr ? 'دوام كامل' : 'Full-Time'}
            </p>
            <p className="text-base font-black text-sky-600 dark:text-sky-400 leading-tight">{metrics.fullTime}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {isAr ? 'غير نشط' : 'Inactive'}
            </p>
            <p className="text-base font-black text-slate-600 dark:text-slate-300 leading-tight">{metrics.inactive}</p>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm">
        
        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم، رقم الهاتف أو البريد...' : 'Search by doctor name, phone, or email...'}
              className="w-full pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onStatusFilterChange(st)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {st === 'all' ? (isAr ? 'الكل' : 'All') : st === 'active' ? (isAr ? 'النشطون' : 'Active') : (isAr ? 'غير النشطين' : 'Inactive')}
              </button>
            ))}
          </div>

          {/* Employment Type Filter Dropdown */}
          <select
            value={empTypeFilter}
            onChange={(e) => onEmpTypeFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع أنواع العقود' : 'All Employment Types'}</option>
            {EMP_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {isAr ? et.ar : et.fallback}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 text-xs">
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as StaffSortField)}
              className="bg-transparent px-2 py-1 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="name">{isAr ? 'الاسم' : 'Name'}</option>
              <option value="hireDate">{isAr ? 'تاريخ التعيين' : 'Hire Date'}</option>
              <option value="baseSalary">{isAr ? 'الراتب' : 'Salary'}</option>
              <option value="status">{isAr ? 'الحالة' : 'Status'}</option>
            </select>
            <button
              type="button"
              onClick={onToggleSortOrder}
              title={sortAsc ? (isAr ? 'تصاعدي' : 'Ascending') : (isAr ? 'تنازلي' : 'Descending')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ArrowUpDown size={13} className={!sortAsc ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Grid / Table Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
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
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all disabled:opacity-50"
            title={isAr ? 'تحديث البيانات' : 'Refresh Team'}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
          </button>

          {/* Add Veterinarian Button */}
          <button
            type="button"
            onClick={onAddStaff}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>{isAr ? 'إضافة طبيب بيطري' : 'Add Veterinarian'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}