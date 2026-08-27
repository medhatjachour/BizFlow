import React, { useState } from 'react'
import {
  Receipt,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Calendar,
  Package,
  Hash
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PAY_METHOD_COLORS, PAYMENT_STATUS_COLORS } from '../constants'
import { formatDate } from '../utils'
import type { SaleGroup, Sale } from '../types'
import { GroupLineItem } from './GroupLineItem'

interface Props {
  group: SaleGroup
  onPaid: () => void
  onEditItem: (s: Sale) => void
  onRefundItem: (s: Sale) => void
  onRefundGroup: (g: SaleGroup) => void
}

export const SaleGroupCard: React.FC<Props> = ({
  group,
  onPaid,
  onEditItem,
  onRefundItem,
  onRefundGroup
}) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isRefunded = group.txStatus === 'refunded'
  const isPartRefund = group.txStatus === 'partially_refunded'
//   const netTotal = Math.max(0, group.total - (group.refunded ?? 0))
  const payMethodClass = PAY_METHOD_COLORS[group.paymentMethod ?? 'other'] ?? PAY_METHOD_COLORS.other

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        open
          ? 'border-violet-300 dark:border-violet-700/80 shadow-md ring-1 ring-violet-500/10'
          : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300'
      } ${isRefunded ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
    >
      {/* Header Container */}
      <div className="w-full flex items-center justify-between p-3.5 px-4 gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="text-slate-400 shrink-0">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              isRefunded
                ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
            }`}
          >
            <Receipt className="h-4 w-4" />
          </div>

          {/* Client & Date Information */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {group.ownerName || t('vetWalkIn') || 'Walk-in Customer'}
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                <Package size={10} /> {group.itemCount} items
              </span>
              {group.paymentMethod && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${payMethodClass}`}
                >
                  {group.paymentMethod}
                </span>
              )}
              {isRefunded && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                  Refunded
                </span>
              )}
              {isPartRefund && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  Part. Refund
                </span>
              )}
            </div>

            <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {formatDate(group.saleDate, true)}
              </span>
              {group.saleGroupId && (
                <span className="flex items-center gap-0.5 text-slate-400 font-mono">
                  <Hash size={10} />
                  {group.groupKey.slice(0, 6)}
                </span>
              )}
            </p>
          </div>

          {/* Gross Profit column */}
          <div className="hidden md:block text-right shrink-0">
            <p
              className={`text-xs font-black ${
                group.grossProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {group.grossProfit >= 0 ? '+' : ''}${group.grossProfit.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">Gross Profit</p>
          </div>

          {/* Grand Total Column */}
          <div className="text-right shrink-0 min-w-[90px]">
            <p
              className={`text-sm font-black ${
                isRefunded
                  ? 'text-slate-400 line-through'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              ${group.total.toFixed(2)}
            </p>
            {!isRefunded && (
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize mt-0.5 ${
                  PAYMENT_STATUS_COLORS[group.paymentStatus] ?? PAYMENT_STATUS_COLORS.paid
                }`}
              >
                {group.paymentStatus}
              </span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-100 dark:border-slate-800">
          {group.ownerId && (
            <button
              type="button"
              onClick={() => navigate(`/vet/owners/${group.ownerId}`)}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
              title="Open Customer Profile"
            >
              <ExternalLink size={14} />
            </button>
          )}

          {!isRefunded && (
            <button
              type="button"
              onClick={() => onRefundGroup(group)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Refund Whole Transaction"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Line Items */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/50">
          {group.items.map(it => (
            <GroupLineItem
              key={it.id}
              item={it}
              onPaid={onPaid}
              onEdit={() => onEditItem(it)}
              onRefund={() => onRefundItem(it)}
            />
          ))}
          {group.notes && (
            <div className="px-5 py-2 text-[11px] text-slate-400 italic">
              Note: {group.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}