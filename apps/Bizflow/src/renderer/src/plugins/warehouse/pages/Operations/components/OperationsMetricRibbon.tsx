import React from 'react'
import {
  ClipboardList,
  ScanLine,
  ShieldCheck,
  Boxes,
  ShoppingBag,
  PackageCheck,
  Rocket
} from 'lucide-react'
import InfoTooltip from '../../components/InfoTooltip'
import { JourneyBoard } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  board: JourneyBoard | null
  activeCount: number
}

export const OperationsMetricRibbon: React.FC<Props> = ({ board, activeCount }) => {
  const { t } = useLanguage()

  const metrics = [
    {
      label: t('warehouseActiveOrders') || 'Active',
      hint: t('warehouseOpsInfoCardActiveOrders') || 'Pending fulfillment pipelines',
      value: board?.activeOrders ?? activeCount,
      icon: ClipboardList,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      label: t('warehouseReceiving') || 'Receiving',
      hint: t('warehouseOpsInfoCardReceiving') || 'Dock intake queue',
      value: board?.receiving ?? 0,
      icon: ScanLine,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: 'QC',
      hint: t('warehouseOpsInfoCardQc') || 'Quality inspections',
      value: board?.qc ?? 0,
      icon: ShieldCheck,
      color: 'text-violet-500 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40'
    },
    {
      label: t('warehousePutaway') || 'Putaway',
      hint: t('warehouseOpsInfoCardPutaway') || 'Stock bay placement',
      value: board?.putaway ?? 0,
      icon: Boxes,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      label: t('warehousePicking') || 'Picking',
      hint: t('warehouseOpsInfoCardPicking') || 'Order picking route',
      value: board?.picking ?? 0,
      icon: ShoppingBag,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      label: t('warehousePacking') || 'Packing',
      hint: t('warehouseOpsInfoCardPacking') || 'Packaging station',
      value: board?.packing ?? 0,
      icon: PackageCheck,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    {
      label: t('warehouseShipping') || 'Shipping',
      hint: t('warehouseOpsInfoCardShipping') || 'Outbound carrier staging',
      value: board?.shipping ?? 0,
      icon: Rocket,
      color: 'text-teal-500 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
      {metrics.map(m => {
        const Icon = m.icon
        return (
          <div
            key={m.label}
            className="group p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                <span>{m.label}</span>
                <InfoTooltip text={m.hint} />
              </div>
              <div className={`p-1.5 rounded-lg ${m.bg} ${m.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {m.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}