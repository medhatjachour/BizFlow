import React from 'react'
import {
  Plus,
  Download,
  Search,
  LayoutGrid,
  List,
  Trash2,
  Filter,
  Calendar,
  X,
  RotateCw
} from 'lucide-react'
import { EXPENSE_CATEGORIES } from '../constants'
import type { ExpenseCategory, DateRange, ViewMode, PaymentMethod } from '../types'

interface ExpenseToolbarProps {
  searchTerm: string
  setSearchTerm: (v: string) => void
  filterCategory: ExpenseCategory | 'all'
  setFilterCategory: (v: ExpenseCategory | 'all') => void
  filterPaymentMethod: PaymentMethod | 'all'
  setFilterPaymentMethod: (v: PaymentMethod | 'all') => void
  dateRange: DateRange
  setDateRange: (v: DateRange) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  selectedCount: number
  totalCount: number
  onAdd: () => void
  onExport: () => void
  onBulkDelete: () => void
  onRefresh: () => void
  apiAvailable: boolean
  t: (key: string) => string
}

export default function ExpenseToolbar({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  dateRange,
  setDateRange,
  viewMode,
  setViewMode,
  selectedCount,
  totalCount,
  onAdd,
  onExport,
  onBulkDelete,
  onRefresh,
  apiAvailable,
  t,
}: ExpenseToolbarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 mb-6 shadow-xs backdrop-blur-md">
      {/* Top Main Command Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Search with Quick Clear */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('searchExpenses') || 'Search expense, vendor, reference...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-9 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons & Fast Triggers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            title={t('refresh') || 'Refresh data'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          <div className="inline-flex p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 text-slate-500">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('tableView') || 'Table View'}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('cardsView') || 'Grid View'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Action */}
          <button
            onClick={onExport}
            disabled={!apiAvailable || totalCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t('export') || 'Export'}</span>
          </button>

          {/* Primary Add Expense */}
          <button
            onClick={onAdd}
            disabled={!apiAvailable}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addExpense') || 'Log Expense'}</span>
          </button>
        </div>
      </div>

      {/* Second Row: Granular Filters & Batch Bar */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
              aria-label={t('filterByCategory') || 'Filter by Category'}
              className="ps-8 pe-6 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">{t('allCategories') || 'All Categories'}</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t(cat.nameKey) || cat.id}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              aria-label={t('selectDateRange') || 'Select Date Range'}
              className="ps-8 pe-6 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="today">{t('today') || 'Today'}</option>
              <option value="7days">{t('expenseLast7Days') || 'Last 7 Days'}</option>
              <option value="30days">{t('expenseLast30Days') || 'Last 30 Days'}</option>
              <option value="90days">{t('expenseLast90Days') || 'Last Quarter (90d)'}</option>
              <option value="this_month">{t('thisMonth') || 'This Month'}</option>
              <option value="all">{t('expenseAllTime') || 'All Time'}</option>
            </select>
            <Calendar className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Batch Operation Bar (When rows selected) */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-xl animate-in fade-in zoom-in-95">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {selectedCount} {t('selected') || 'selected'}
            </span>
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('deleteSelected') || 'Delete'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}