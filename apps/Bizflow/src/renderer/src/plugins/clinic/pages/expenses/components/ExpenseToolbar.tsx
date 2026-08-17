import React, { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Filter } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { EXPENSE_CATEGORIES } from '../constants'
import { getCategoryLabel } from '../utils'
import type { PeriodFilter } from '../types'

interface Props {
  period: PeriodFilter
  category: string
  onSelectPeriod: (period: PeriodFilter) => void
  onSelectCategory: (category: string) => void
  onOpenCreateModal: () => void
}

export const ExpenseToolbar: React.FC<Props> = ({
  period,
  category,
  onSelectPeriod,
  onSelectCategory,
  onOpenCreateModal
}) => {
  const { t, language } = useLanguage()
  const [catOpen, setCatOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const periods: Array<{ key: PeriodFilter; label: string }> = [
    { key: 'today', label: t('today') || 'Today' },
    { key: 'week',  label: t('thisWeek') || 'This Week' },
    { key: 'month', label: t('thisMonth') || 'This Month' },
    { key: 'year',  label: t('year') || 'Year' }
  ]

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCatOpen(false)
      }
    }
    if (catOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [catOpen])

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      {/* Period Pills */}
      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSelectPeriod(key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category Dropdown + Add CTA */}
      <div className="flex items-center gap-2.5 ms-auto flex-wrap">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setCatOpen((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
              category
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>
              {category
                ? getCategoryLabel(category, language)
                : language === 'ar'
                  ? 'كل الفئات'
                  : 'All Categories'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>

          {catOpen && (
            <div className="absolute end-0 mt-1.5 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-30 overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  onSelectCategory('')
                  setCatOpen(false)
                }}
                className={`w-full text-start px-3 py-2 text-xs rounded-xl font-bold transition-colors ${
                  !category
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {language === 'ar' ? 'كل الفئات' : 'All Categories'}
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      onSelectCategory(c.value)
                      setCatOpen(false)
                    }}
                    className={`w-full text-start px-3 py-2 text-xs rounded-xl font-semibold transition-colors ${
                      category === c.value
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {language === 'ar' ? c.labelAr : c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm shadow-red-500/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t('addExpense') || 'Record Expense'}</span>
        </button>
      </div>
    </div>
  )
}