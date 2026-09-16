// src/pages/menu/components/MenuItemRow.tsx
import React from 'react'
import { Clock, Edit2, Trash2, ToggleLeft, ToggleRight, Package, Utensils } from 'lucide-react'
import { MenuItemData } from '../types'
import { analyzeDishFinancials, calculateAvailablePortions, formatCurrency } from '../utils'
import { sounds } from '../../utils/sound'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  item: MenuItemData
  onToggle86: (id: string) => void
  onEdit: (item: MenuItemData) => void
  onOpenCostBreakdown: (item: MenuItemData) => void
  onDelete: (id: string) => void
}

export const MenuItemRow: React.FC<Props> = ({
  item,
  onToggle86,
  onEdit,
  onOpenCostBreakdown,
  onDelete
}) => {
  const { t } = useLanguage()
  const financials = analyzeDishFinancials(item.price, item.cost)
  const { availablePortions } = calculateAvailablePortions(item)
  const hasRecipe = Boolean(item.recipe?.ingredients?.length)

  return (
    <div
      className={`group p-3 sm:p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 ${
        item.isAvailable
          ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-400 shadow-xs'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
      }`}
    >
      {/* ─── Left Details ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
            {item.name}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black">
            {item.station}
          </span>

          {/* Live Inventory Portions Badge */}
          {hasRecipe && availablePortions !== null && (
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                availablePortions === 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : availablePortions <= 5
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}
            >
              <Package className="w-3 h-3" />
              {availablePortions === 0
                ? t('restMenuPortionsOut')
                : t('restMenuLeftStock', { count: availablePortions })}
            </span>
          )}

          {!hasRecipe && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
              {t('restMenuNoRecipeBadge')}
            </span>
          )}

          {!item.isAvailable && (
            <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase">
              {t('restMenuUnavailable')}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
        )}

        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap pt-0.5">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" />{' '}
            {t('restMenuPrepMinutes', { count: item.preparationTime })}
          </span>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              sounds.playBump()
              onOpenCostBreakdown(item)
            }}
            className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            <Utensils className="w-3 h-3" />
            {t('restMenuCostBreakdownOpen')}{' '}
            {t('restMenuCostBreakdownCost', { amount: formatCurrency(item.cost) })}
          </button>
        </div>
      </div>

      {/* ─── Financial Margin Card ────────────────────────────────── */}
      <div className="flex sm:block items-center justify-between shrink-0 text-left sm:text-right">
        <div className="text-base font-black text-slate-900 dark:text-white">
          {formatCurrency(item.price)}
        </div>
        <div
          className={`text-[10px] font-black uppercase tracking-wider ${
            financials.rating === 'high'
              ? 'text-emerald-600 dark:text-emerald-400'
              : financials.rating === 'medium'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {t('restMenuRowCostProfit', {
            percent: financials.costPercent,
            profit: formatCurrency(financials.profit)
          })}
        </div>
      </div>

      {/* ─── Action Controls ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => {
            sounds.playBump()
            onToggle86(item.id)
          }}
          className={`p-2 sm:p-1.5 rounded-xl transition-colors ${
            item.isAvailable ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400'
          }`}
          aria-label={item.isAvailable ? t('restMenuAction86') : t('restMenuActionAvailable')}
          title={item.isAvailable ? t('restMenuAction86') : t('restMenuActionAvailable')}
        >
          {item.isAvailable ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playBump()
            onEdit(item)
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100"
          aria-label={t('restMenuActionEdit')}
          title={t('restMenuActionEdit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          aria-label={t('restMenuActionDelete')}
          title={t('restMenuActionDelete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
