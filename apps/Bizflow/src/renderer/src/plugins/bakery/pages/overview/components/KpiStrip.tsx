import { Calendar, Zap, Layers, Clock, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { KpiCard } from './KpiCard'
import { DailyOverviewData } from '../types'
import { formatCurrency, formatNumber } from '../utils'

interface KpiStripProps {
  data: DailyOverviewData | null
  derived: {
    unlinked: unknown[]
    ready: unknown[]
    producibleCount: number
    totalPossibleUnits: number
    completedScheduled: number
    allUnlinked: boolean
  } | null
}

export function KpiStrip({ data, derived }: KpiStripProps) {
  const { t } = useLanguage()

  const revenue = data?.todayRevenue ?? 0
  const cost = data?.todayProductionCost ?? 0
  const profit = revenue - cost

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      <KpiCard
        icon={<Calendar className="h-5 w-5" />}
        label={t('bakeryOverviewScheduled')}
        value={String(data?.scheduled.length ?? 0)}
        sub={`${derived?.completedScheduled ?? 0} ${t('bakeryKpiDone')}`}
        color="blue"
      />

      <KpiCard
        icon={<Zap className="h-5 w-5" />}
        label={t('bakeryProducibleRecipes')}
        value={derived?.allUnlinked ? '—' : String(derived?.producibleCount ?? 0)}
        sub={
          derived?.allUnlinked
            ? t('bakeryLinkPantryUnlock')
            : `${derived?.ready.length ?? 0} ${t('bakeryFullyReady')}${
                (derived?.unlinked.length ?? 0) > 0
                  ? ` · ${derived?.unlinked.length} ${t('bakeryUnlinkedLabel')}`
                  : ''
              }`
        }
        color={
          derived?.allUnlinked
            ? 'gray'
            : (derived?.producibleCount ?? 0) > 0
            ? 'green'
            : 'orange'
        }
      />

      <KpiCard
        icon={<Layers className="h-5 w-5" />}
        label={t('bakeryTotalUnitsPossible')}
        value={
          derived?.allUnlinked
            ? '—'
            : (derived?.totalPossibleUnits ?? 0) > 0
            ? formatNumber(derived?.totalPossibleUnits ?? 0)
            : '0'
        }
        sub={
          derived?.allUnlinked
            ? t('bakeryNoPantryLinks')
            : (derived?.unlinked.length ?? 0) > 0
            ? `${derived?.unlinked.length} ${t('bakeryNotTracked')}`
            : t('bakeryAcrossAllRecipes')
        }
        color={derived?.allUnlinked ? 'gray' : 'amber'}
      />

      <KpiCard
        icon={<Clock className="h-5 w-5" />}
        label={t('bakeryOverviewExpiring')}
        value={String(data?.expiringBatches.length ?? 0)}
        sub={t('bakeryWithin48h')}
        color={(data?.expiringBatches.length ?? 0) > 0 ? 'orange' : 'gray'}
      />

      <KpiCard
        icon={<DollarSign className="h-5 w-5" />}
        label={t('bakeryTodayRevenue')}
        value={formatCurrency(revenue)}
        sub={
          cost === 0
            ? `${data?.todayUnitsSold ?? 0} ${t('bakeryUnitsSold')}`
            : `Cost ${formatCurrency(cost)} · ${profit >= 0 ? '+' : ''}${formatCurrency(profit)} profit`
        }
        color="purple"
      />
    </div>
  )
}