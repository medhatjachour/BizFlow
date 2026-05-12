import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, AlertTriangle, Calendar, Package, TrendingUp,
  ShoppingCart, Clock, CheckCircle2, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Sunset, DollarSign, Layers,
  Flame, Zap, PackageX, Info
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type IngredientBreakdown = {
  name: string
  unit: string
  neededPerBatch: number
  inStock: number | null
  canMakeBatches: number | null
  shortfall: number
  linked: boolean
}

type CapacityEntry = {
  recipeId: string
  recipeName: string
  yieldQty: number
  yieldUnit: string
  availableBatches: number | null
  expectedUnits: number | null
  limitedBy: string | null
  ingredientBreakdown: IngredientBreakdown[]
}

type ScheduleItem = {
  id: string
  scheduledDate: string
  plannedQuantity: number
  status: string
  recipe: { id: string; name: string; yieldQty: number; yieldUnit: string }
}

type ExpiringBatch = {
  id: string
  unitsProduced: number
  expiresAt: string
  recipe: { id: string; name: string }
}

type PantryItem = {
  id: string
  name: string
  currentStock: number
  unit: string
  reorderPoint?: number | null
}

type TodayBatch = {
  id: string
  recipeName: string
  yieldUnit: string
  quantityProduced: number
  totalCost: number
}

type Overview = {
  scheduled: ScheduleItem[]
  expiringBatches: ExpiringBatch[]
  lowStock: PantryItem[]
  reorderNeeded: PantryItem[]
  capacity: CapacityEntry[]
  todayBatches: TodayBatch[]
  todayRevenue: number
  todayUnitsSold: number
  todayProductionCost: number
}

interface Props {
  onEndOfDay: () => void
}

type CapFilter = 'all' | 'ready' | 'limited' | 'blocked'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyOverviewTab({ onEndOfDay }: Props) {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [capFilter, setCapFilter] = useState<CapFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { t } = useLanguage()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.bakery.getDailyOverview()
      setData(result)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message ?? t('bakeryOverviewLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // ─── Derived stats ─────────────────────────────────────────────────
  // null  = no pantry link (capacity unknown)
  // 0     = linked but out of stock (blocked)
  // > 0   = can produce
  const totalAlerts    = (data?.lowStock.length ?? 0) + (data?.expiringBatches.length ?? 0)
  const unlinkedRecipes = data?.capacity.filter(c => c.availableBatches === null) ?? []
  const readyRecipes    = data?.capacity.filter(c => c.availableBatches !== null && c.availableBatches >= 5) ?? []
  const limitedRecipes  = data?.capacity.filter(c => c.availableBatches !== null && c.availableBatches > 0 && c.availableBatches < 5) ?? []
  const blockedRecipes  = data?.capacity.filter(c => c.availableBatches === 0) ?? []
  const producibleCount = readyRecipes.length + limitedRecipes.length
  const totalPossibleUnits = data?.capacity.reduce((s, c) => s + (c.expectedUnits ?? 0), 0) ?? 0
  const todayProduced = data?.todayBatches.reduce((s, b) => s + (b.quantityProduced ?? 0), 0) ?? 0
  const allUnlinked   = data ? unlinkedRecipes.length === data.capacity.length && data.capacity.length > 0 : false

  const filteredCapacity = data?.capacity.filter(c => {
    const b = c.availableBatches
    if (capFilter === 'ready')   return b !== null && b >= 5
    if (capFilter === 'limited') return b !== null && b > 0 && b < 5
    if (capFilter === 'blocked') return b === 0
    return true
  }) ?? []

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // ─── Loading / Error ───────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('bakeryLoadingRecipes')}</p>
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-400">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p className="text-sm">{error}</p>
      <button onClick={load} className="ml-auto text-sm underline">{t('bakeryRetry')}</button>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            {t('bakeryCommandCenter')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
          {lastRefresh && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t('bakeryLastUpdated')} {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> {t('bakeryRefreshBtn')}
          </button>
          <button
            onClick={onEndOfDay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Sunset className="h-4 w-4" /> {t('bakeryEndOfDay')}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={<Calendar className="h-5 w-5" />}
          label={t('bakeryOverviewScheduled')}
          value={String(data?.scheduled.length ?? 0)}
          sub={`${data?.scheduled.filter(s => s.status === 'completed').length ?? 0} ${t('bakeryKpiDone')}`}
          color="blue"
        />
        <KpiCard
          icon={<Zap className="h-5 w-5" />}
          label={t('bakeryProducibleRecipes')}
          value={allUnlinked ? '—' : String(producibleCount)}
          sub={allUnlinked ? t('bakeryLinkPantryUnlock') : `${readyRecipes.length} ${t('bakeryFullyReady')}${unlinkedRecipes.length > 0 ? ` · ${unlinkedRecipes.length} ${t('bakeryUnlinkedLabel')}` : ''}`}
          color={allUnlinked ? 'gray' : producibleCount > 0 ? 'green' : 'orange'}
        />
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label={t('bakeryTotalUnitsPossible')}
          value={allUnlinked ? '—' : totalPossibleUnits > 0 ? totalPossibleUnits.toLocaleString() : '0'}
          sub={allUnlinked ? t('bakeryNoPantryLinks') : unlinkedRecipes.length > 0 ? `${unlinkedRecipes.length} ${t('bakeryNotTracked')}` : t('bakeryAcrossAllRecipes')}
          color={allUnlinked ? 'gray' : 'amber'}
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
          value={`$${(data?.todayRevenue ?? 0).toFixed(2)}`}
          sub={(() => {
            const rev = data?.todayRevenue ?? 0
            const cost = data?.todayProductionCost ?? 0
            if (cost === 0) return `${data?.todayUnitsSold ?? 0} ${t('bakeryUnitsSold')}`
            const profit = rev - cost
            return `Cost $${cost.toFixed(2)} · ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} profit`
          })()}
          color="purple"
        />
      </div>

      {/* ── Today's Production Summary ─────────────────────────────── */}
      {(data?.todayBatches.length ?? 0) > 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">
              {t('bakeryProducedToday')} — {data!.todayBatches.length} {data!.todayBatches.length === 1 ? t('bakeryBatch') : t('bakeryOverviewBatches')}
              <span className="ml-2 font-normal text-green-600 dark:text-green-400">({todayProduced} {t('bakeryTotalUnits')})</span>
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data!.todayBatches.map(b => (
              <div key={b.id} className="bg-white dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-semibold text-green-800 dark:text-green-300">{b.recipeName}</span>
                <span className="text-green-600 dark:text-green-400 ml-2">{b.quantityProduced} {b.yieldUnit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pantry link guidance banner ──────────────────────────── */}
      {allUnlinked && data && data.capacity.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('bakeryPantryNotSetup')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {t('bakeryPantryNotSetupDesc')}
            </p>
          </div>
        </div>
      )}

      {/* ── What Can We Make? ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Panel header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('bakeryWhatCanWeMake')}</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              — {t('bakeryBasedOnStock')}
            </span>
          </div>
          {/* Filter tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 text-xs font-medium flex-wrap">
            {([
              ['all',     t('bakeryFilterAll'),     data?.capacity.length ?? 0],
              ['ready',   t('bakeryFilterReady'),   readyRecipes.length],
              ['limited', t('bakeryFilterLow'),     limitedRecipes.length],
              ['blocked', t('bakeryFilterBlocked'), blockedRecipes.length],
            ] as [CapFilter, string, number][]).map(([f, label, cnt]) => (
              <button
                key={f}
                onClick={() => setCapFilter(f)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  capFilter === f
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label} <span className="opacity-60">({cnt})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipe capacity cards */}
        <div className="p-4">
          {filteredCapacity.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-500 gap-2">
              <PackageX className="h-10 w-10" />
              <p className="text-sm">{t('bakeryNoMatchFilter')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredCapacity.map(c => (
                <RecipeCapacityCard
                  key={c.recipeId}
                  entry={c}
                  expanded={expandedIds.has(c.recipeId)}
                  onToggle={() => toggleExpand(c.recipeId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Schedule + Alerts ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Schedule (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('bakeryTodaySchedule')}</h3>
          </div>
          {!data?.scheduled.length ? (
            <div className="flex flex-col items-center py-8 gap-2 text-gray-400 dark:text-gray-500">
              <Calendar className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('bakeryOverviewNoSchedule')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 font-medium pr-4">{t('bakeryRecipeCol')}</th>
                    <th className="pb-2 font-medium pr-4 text-right">{t('bakeryColQty')}</th>
                    <th className="pb-2 font-medium pr-4">{t('bakeryScheduleStatus')}</th>
                    <th className="pb-2 font-medium text-right">{t('bakeryColTime')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {data!.scheduled.map(item => {
                    const cap = data!.capacity.find(c => c.recipeId === item.recipe.id)
                    const canMake = cap ? (cap.availableBatches ?? 0) >= item.plannedQuantity : null
                    return (
                      <tr key={item.id} className="text-gray-900 dark:text-white">
                        <td className="py-2.5 pr-4 font-medium">
                          {item.recipe.name}
                          {canMake === false && (
                            <span className="ml-2 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-normal">
                              {t('bakeryStockLow')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-600 dark:text-gray-300">{item.plannedQuantity}</td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-2.5 text-right text-xs text-gray-400 dark:text-gray-500">
                          {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('bakeryOverviewAlerts')}</h3>
            {totalAlerts > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalAlerts}
              </span>
            )}
          </div>
          {totalAlerts === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-green-500">
              <CheckCircle2 className="h-10 w-10" />
              <p className="text-sm font-medium">{t('bakeryAllGoodNoAlerts')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data!.expiringBatches.map(b => {
                const hoursLeft = b.expiresAt
                  ? Math.round((new Date(b.expiresAt).getTime() - Date.now()) / 3600000)
                  : null
                return (
                  <AlertItem
                    key={b.id}
                    icon={<Clock className="h-4 w-4 text-orange-500 shrink-0" />}
                    title={b.recipe.name}
                    sub={hoursLeft != null ? `${t('bakeryOverviewExpiresIn')} ${hoursLeft}${t('bakeryHours')}` : t('bakeryExpiringSoon')}
                    type="warning"
                  />
                )
              })}
              {data!.lowStock.map(p => (
                <AlertItem
                  key={p.id}
                  icon={<Package className="h-4 w-4 text-red-500 shrink-0" />}
                  title={p.name}
                  sub={`${p.currentStock} ${p.unit} ${t('bakeryRemaining')}`}
                  type="error"
                />
              ))}
              {data!.reorderNeeded
                .filter(p => !data!.lowStock.find(ls => ls.id === p.id))
                .map(p => (
                  <AlertItem
                    key={p.id}
                    icon={<ShoppingCart className="h-4 w-4 text-amber-500 shrink-0" />}
                    title={p.name}
                    sub={t('bakeryNeedsReorder')}
                    type="reorder"
                  />
                ))
              }
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── RecipeCapacityCard ───────────────────────────────────────────────────────

function RecipeCapacityCard({
  entry, expanded, onToggle
}: {
  entry: CapacityEntry
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useLanguage()
  const batches = entry.availableBatches
  const isUnlinked = batches === null
  const isBlocked  = !isUnlinked && batches === 0
  const isLow      = !isUnlinked && !isBlocked && batches! < 5

  const statusColor = isUnlinked ? 'gray' : isBlocked ? 'red' : isLow ? 'amber' : 'green'
  const colorMap = {
    green: { badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', bar: 'bg-green-500', border: 'border-green-200 dark:border-green-800' },
    amber: { badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', bar: 'bg-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    red:   { badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',         bar: 'bg-red-400',   border: 'border-red-200 dark:border-red-800' },
    gray:  { badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',        bar: 'bg-gray-300',  border: 'border-gray-200 dark:border-gray-700' }
  }
  const c = colorMap[statusColor]
  const barPct = isUnlinked ? 0 : Math.min(100, ((batches! / 10) * 100))

  const linkedIng   = entry.ingredientBreakdown.filter(i => i.linked)
  const unlinkedIng = entry.ingredientBreakdown.filter(i => !i.linked)

  return (
    <div className={`rounded-xl border ${c.border} bg-white dark:bg-gray-800/60 overflow-hidden flex flex-col`}>
      {/* Card top */}
      <div className="p-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{entry.recipeName}</p>
          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
            {isUnlinked ? t('bakeryNoPantryLink')
              : isBlocked ? t('bakeryBlocked')
              : `${batches} ${batches === 1 ? t('bakeryBatch') : t('bakeryOverviewBatches')}`}
          </span>
        </div>

        {!isUnlinked ? (
          <>
            <p className="text-2xl font-bold mt-1.5 text-gray-900 dark:text-white leading-none">
              {entry.expectedUnits?.toLocaleString() ?? '—'}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">{entry.yieldUnit}</span>
            </p>
            <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            {entry.limitedBy && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {t('bakeryBottleneck')} <span className="font-medium text-amber-600 dark:text-amber-400">{entry.limitedBy}</span>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
            <Info className="h-3 w-3" /> {t('bakeryLinkToPantry')}
          </p>
        )}
      </div>

      {/* Expand toggle */}
      {linkedIng.length > 0 && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 font-medium"
        >
          <span>{t('bakeryConfirmIngredient')} ({linkedIng.length} {t('bakeryTracked')}{unlinkedIng.length > 0 ? `, ${unlinkedIng.length} ${t('bakeryUnlinkedLabel')}` : ''})</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Ingredient breakdown */}
      {expanded && linkedIng.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 text-left">
                <th className="px-3 py-2 font-medium">{t('bakeryConfirmIngredient')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('bakeryIngColPerBatch')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('bakeryIngColInStock')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('bakeryIngColBatches')}</th>
                <th className="px-3 py-2 font-medium">{t('bakeryIngColFill')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {linkedIng.map((ing, idx) => {
                const isBottleneck = entry.limitedBy === ing.name
                const stockForBars = ing.inStock !== null && ing.neededPerBatch > 0
                  ? Math.min(100, (ing.inStock / (ing.neededPerBatch * Math.max(10, (entry.availableBatches ?? 0) + 3))) * 100)
                  : 0
                return (
                  <tr key={idx} className={isBottleneck ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">
                      {ing.name}
                      {isBottleneck && <span className="ml-1 text-amber-600 dark:text-amber-400 text-[9px] font-bold">⚡ {t('bakeryIngLimit')}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                      {ing.neededPerBatch} {ing.unit}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${
                      ing.inStock === null ? 'text-gray-400'
                        : ing.inStock < ing.neededPerBatch ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {ing.inStock !== null ? `${ing.inStock}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${
                        (ing.canMakeBatches ?? 0) === 0 ? 'text-red-600 dark:text-red-400'
                          : (ing.canMakeBatches ?? 0) < 5 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {ing.canMakeBatches ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-14 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stockForBars === 0 ? 'bg-red-400'
                              : stockForBars < 35 ? 'bg-amber-400'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${stockForBars}%` }}
                        />
                      </div>
                      {ing.shortfall > 0 && (
                        <p className="text-[10px] text-red-500 mt-0.5 whitespace-nowrap">
                          +{ing.shortfall} {ing.unit} {t('bakeryNeeded')}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
}) {
  const bg: Record<string, string> = {
    blue:   'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400',
    green:  'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400',
    amber:  'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400',
    orange: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-100 dark:border-purple-900/30 text-purple-600 dark:text-purple-400',
    gray:   'from-gray-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
  }
  const v = bg[color] ?? bg.gray
  return (
    <div className={`rounded-xl bg-gradient-to-br ${v} border p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide opacity-75 leading-tight">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</span>
      <span className="text-xs opacity-60">{sub}</span>
    </div>
  )
}

function AlertItem({ icon, title, sub, type }: {
  icon: React.ReactNode
  title: string
  sub: string
  type: string
}) {
  const cls: Record<string, string> = {
    error:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    reorder: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
  }
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${cls[type] ?? cls.warning}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    planned:     { label: t('bakeryStatusPlanned'),     cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',         icon: <Calendar className="h-3 w-3" /> },
    in_progress: { label: t('bakeryStatusInProgress'),  cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed:   { label: t('bakeryStatusDone'),        cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',     icon: <CheckCircle2 className="h-3 w-3" /> },
    cancelled:   { label: t('bakeryStatusCancelled'),   cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',            icon: <XCircle className="h-3 w-3" /> }
  }
  const s = map[status] ?? map.planned
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  )
}
