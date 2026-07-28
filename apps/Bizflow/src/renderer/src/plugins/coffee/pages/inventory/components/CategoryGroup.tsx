import { ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CategoryGroup as GroupType, Product } from '../types'
import { ProductRow } from './ProductRow'
import { hexToRgba, formatMoney, formatNumber } from '../utils'

interface Props {
  group: GroupType
  isCollapsed: boolean
  onToggle: () => void
  onAdjust: (p: Product) => void
  onHistory: (p: Product) => void
}

export function CategoryGroup({ group, isCollapsed, onToggle, onAdjust, onHistory }: Props) {
  const { t } = useLanguage()
  const cat = group.category
  const catName = cat?.name ?? 'Uncategorised'
  const margin = group.totalValue > 0
    ? ((group.expRevenue - group.totalValue) / group.expRevenue * 100)
    : 0

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        {/* Category chip */}
        {cat ? (
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
            style={{
              backgroundColor: hexToRgba(cat.color ?? '#78716c', 0.15),
              color: cat.color ?? '#78716c',
            }}
          >
            {cat.icon && <span>{cat.icon}</span>}
            {catName}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
            {t('cfUncategorised') || 'Uncategorised'}
          </span>
        )}

        {/* Product count */}
        <span className="text-xs text-slate-400">{group.products.length} {t('cfItems') || 'items'}</span>

        <div className="flex-1" />

        {/* Subtotals */}
        <div className="hidden md:flex items-center gap-5 text-xs">
          <div className="text-right">
            <div className="text-slate-400">{t('cfUnits') || 'Units'}</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatNumber(group.totalUnits)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">{t('cfValue') || 'Value'}</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatMoney(group.totalValue)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">{t('cfExpectedRevenue') || 'Exp. Rev.'}</div>
            <div className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatMoney(group.expRevenue)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">{t('cfMargin') || 'Margin'}</div>
            <div className={`font-semibold tabular-nums ${margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
              {margin.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Collapse icon */}
        <div className="text-slate-400 ml-2">
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {/* Products */}
      {!isCollapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 px-2 pb-2">
          {group.products.map(p => (
            <ProductRow
              key={p.id}
              product={p}
              onAdjust={onAdjust}
              onHistory={onHistory}
            />
          ))}
        </div>
      )}
    </div>
  )
}
