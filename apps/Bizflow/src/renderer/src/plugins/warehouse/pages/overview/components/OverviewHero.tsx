import React from 'react'
import { ArrowUpRight, Boxes, PackagePlus, PackageMinus, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Tab } from '../types'

interface OverviewHeroProps {
  activeOrders: number
  inboundPending: number
  outboundPending: number
  onNavigate: (tab: Tab) => void
  onRefresh?: () => void
}

export const OverviewHero: React.FC<OverviewHeroProps> = ({
  activeOrders,
  inboundPending,
  outboundPending,
  onNavigate,
  onRefresh
}) => {
  const { t } = useLanguage()

  const quickPills = [
    {
      id: 'active',
      label: t('warehouseActive') || 'Active Orders',
      value: activeOrders,
      icon: Boxes,
      badgeColor: 'bg-white/10 text-white hover:bg-white/20'
    },
    {
      id: 'inbound',
      label: t('warehouseInbound') || 'Inbound Pending',
      value: inboundPending,
      icon: PackagePlus,
      badgeColor: 'bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25 border-emerald-300/30'
    },
    {
      id: 'outbound',
      label: t('warehouseOutbound') || 'Outbound Pending',
      value: outboundPending,
      icon: PackageMinus,
      badgeColor: 'bg-amber-400/15 text-amber-100 hover:bg-amber-400/25 border-amber-300/30'
    }
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/80 p-5 sm:p-6 text-white border border-slate-800 shadow-lg shadow-indigo-950/20">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-1/4 -mt-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations
            </span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh Overview"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t('warehouseOperationsSnapshotTitle') || 'Warehouse Operational Pulse'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            {t('warehouseOperationsSnapshotSubtitle') || 'Monitor inbound staging, active fulfillment pipelines, and instant SKU movement.'}
          </p>
        </div>

        {/* Action pills */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {quickPills.map(pill => {
            const Icon = pill.icon
            return (
              <button
                key={pill.id}
                onClick={() => onNavigate('operations')}
                className={`group flex flex-col items-start justify-between p-3 rounded-xl backdrop-blur-md border border-white/10 transition-all duration-200 text-left ${pill.badgeColor}`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <Icon className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight leading-none text-white mb-1">
                    {pill.value}
                  </div>
                  <div className="text-[10.5px] font-medium opacity-85 line-clamp-1">{pill.label}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}