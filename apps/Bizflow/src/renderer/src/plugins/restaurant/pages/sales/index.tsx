// src/plugins/restaurant/pages/sales/index.tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Receipt,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  Eye
} from 'lucide-react'
import { sounds } from '../utils/sound'
import { ThermalPrinter } from '../utils/printer'
import { formatCurrency } from '../menu/utils'
import { KpiSection } from '@renderer/components/ui/KpiVisibility'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const DATE_RANGES = ['today', 'yesterday', 'week', 'month'] as const

const ORDER_TYPES = ['dine_in', 'takeout', 'delivery', 'bar_tab'] as const

const STATUS_VALUES = ['paid', 'open', 'billing', 'voided'] as const

export default function SalesAndOrdersHistoryPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')

  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null)

  const rangeLabel: Record<(typeof DATE_RANGES)[number], string> = {
    today: t('restSalesRangeToday'),
    yesterday: t('restSalesRangeYesterday'),
    week: t('restSalesRangeWeek'),
    month: t('restSalesRangeMonth')
  }

  const statusOptionLabel: Record<string, string> = {
    ALL: t('restSalesStatusAll'),
    paid: t('restSalesStatusPaid'),
    open: t('restSalesStatusOpen'),
    billing: t('restSalesStatusBilling'),
    voided: t('restSalesStatusVoided')
  }

  const statusBadgeLabel: Record<string, string> = {
    paid: t('restSalesBadgePaid'),
    open: t('restSalesBadgeOpen'),
    billing: t('restSalesBadgeBilling'),
    voided: t('restSalesBadgeVoided')
  }

  const orderTypeLabel: Record<string, string> = {
    dine_in: t('restSalesTypeDineIn'),
    takeout: t('restSalesTypeTakeout'),
    delivery: t('restSalesTypeDelivery'),
    bar_tab: t('restSalesTypeBarTab')
  }

  const orderTypeFilterLabel: Record<string, string> = {
    ALL: t('restSalesAllTypes'),
    ...orderTypeLabel
  }

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()

      if (dateRange === 'yesterday') {
        const y = new Date(Date.now() - 86400000)
        startDate = new Date(y.setHours(0, 0, 0, 0)).toISOString()
      } else if (dateRange === 'week') {
        startDate = new Date(Date.now() - 7 * 86400000).toISOString()
      } else if (dateRange === 'month') {
        startDate = new Date(Date.now() - 30 * 86400000).toISOString()
      }

      const list = await window.api.restaurant.getOrders({
        startDate,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        orderType: orderTypeFilter === 'ALL' ? undefined : orderTypeFilter
      })
      setOrders(list || [])
    } finally {
      setLoading(false)
    }
  }, [dateRange, statusFilter, orderTypeFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Filtered list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const query = searchQuery.trim().toLowerCase()
      return (
        query === '' ||
        String(o.orderNumber).includes(query) ||
        (o.serverName && o.serverName.toLowerCase().includes(query)) ||
        (o.table?.number && String(o.table.number).includes(query)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(query))
      )
    })
  }, [orders, searchQuery])

  // Financial KPI Metrics
  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid')
    const totalSales = paid.reduce((s, o) => s + (o.total || 0), 0)
    const totalTips = paid.reduce((s, o) => s + (o.tipAmount || 0), 0)
    const totalVoids = orders.filter((o) => o.status === 'voided').length
    const avgCheck = paid.length > 0 ? totalSales / paid.length : 0

    return {
      totalChecks: orders.length,
      paidChecks: paid.length,
      totalSales,
      totalTips,
      totalVoids,
      avgCheck
    }
  }, [orders])

  const handlePrintReceipt = (order: any) => {
    sounds.playSuccess()
    const text = ThermalPrinter.buildGuestReceipt(order)
    console.log('[ESC/POS Thermal Output]\n', text)
    window.print()
  }

  /** A check is identified by its human number when it has one, otherwise by its id. */
  const checkLabel = (order: any) => String(order.orderNumber || order.id.slice(0, 5))

  const serviceLabel = (order: any) =>
    order.table?.number
      ? `${t('restSalesTablePrefix')}${order.table.number}`
      : orderTypeLabel[order.orderType] || String(order.orderType || '').toUpperCase()

  const badgeClass = (status: string) =>
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
      : status === 'voided'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'

  const StatusBadge = ({ status, pulse }: { status: string; pulse?: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeClass(
        status
      )} ${pulse ? 'animate-pulse' : ''}`}
    >
      {status === 'paid' ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : status === 'voided' ? (
        <XCircle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {statusBadgeLabel[status] || status}
    </span>
  )

  const kpis = [
    {
      key: 'gross',
      label: t('restSalesKpiGross'),
      value: formatCurrency(stats.totalSales),
      tone: 'text-emerald-600 dark:text-emerald-400',
      chip: 'bg-emerald-500/10 text-emerald-600',
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      key: 'avg',
      label: t('restSalesKpiAvgCheck'),
      value: formatCurrency(stats.avgCheck),
      tone: 'text-slate-900 dark:text-white',
      chip: 'bg-amber-500/10 text-amber-600',
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      key: 'settled',
      label: t('restSalesKpiSettled'),
      value: `${stats.paidChecks} / ${stats.totalChecks}`,
      tone: 'text-purple-600 dark:text-purple-400',
      chip: 'bg-purple-500/10 text-purple-600',
      icon: <Receipt className="w-6 h-6" />
    },
    {
      key: 'tips',
      label: t('restSalesKpiTips'),
      value: formatCurrency(stats.totalTips),
      tone: 'text-blue-600 dark:text-blue-400',
      chip: 'bg-blue-500/10 text-blue-600',
      icon: <CreditCard className="w-6 h-6" />
    }
  ]

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* ─── Sales KPI Summary Strip ──────────────────────────────── */}
      <KpiSection sectionKey="restaurant:sales-KpiStrip">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.key}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  {kpi.label}
                </span>
                <span className={`text-2xl font-black whitespace-nowrap ${kpi.tone}`}>
                  {kpi.value}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl shrink-0 ${kpi.chip}`}>{kpi.icon}</div>
            </div>
          ))}
        </div>
      </KpiSection>

      {/* ─── Filter & Search Ribbon ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Date presets */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                sounds.playBump()
                setDateRange(r)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                dateRange === r
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-1 lg:max-w-2xl lg:justify-end">
          <div className="relative flex-1 min-w-[10rem]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('restSalesSearchPlaceholder')}
              aria-label={t('restSalesSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              sounds.playBump()
              setStatusFilter(e.target.value)
            }}
            aria-label={t('restSalesColStatus')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">{statusOptionLabel.ALL}</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {statusOptionLabel[s]}
              </option>
            ))}
          </select>

          <select
            value={orderTypeFilter}
            onChange={(e) => {
              sounds.playBump()
              setOrderTypeFilter(e.target.value)
            }}
            aria-label={t('restSalesAllTypes')}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">{orderTypeFilterLabel.ALL}</option>
            {ORDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {orderTypeFilterLabel[type]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            aria-label={t('restSalesRefresh')}
            title={t('restSalesRefresh')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Orders: cards on phones, table from sm up ────────────── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-10 text-center space-y-2">
          <Receipt className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {t('restSalesEmptyTitle')}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {t('restSalesEmptyBody')}
          </p>
        </div>
      ) : (
        <>
          <div className="sm:hidden space-y-2">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      #{checkLabel(ord)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {serviceLabel(ord)} · {ord.serverName || t('restSalesStaffFallback')}
                    </p>
                  </div>
                  <StatusBadge
                    status={ord.status}
                    pulse={ord.status !== 'paid' && ord.status !== 'voided'}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(ord.openedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}{' '}
                    · {ord.items?.length || 0} {t('restSalesItemsUnit')}
                  </span>
                  <span className="text-sm font-black text-emerald-600">
                    {formatCurrency(ord.total || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playBump()
                      setInspectingOrder(ord)
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black inline-flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('restSalesInspect')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(ord)}
                    aria-label={t('restSalesReprint')}
                    title={t('restSalesReprint')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                    <th className="py-3.5 px-4 text-start font-black">{t('restSalesColCheck')}</th>
                    <th className="py-3.5 px-4 text-start font-black">
                      {t('restSalesColTableType')}
                    </th>
                    <th className="py-3.5 px-4 text-start font-black">{t('restSalesColServer')}</th>
                    <th className="py-3.5 px-4 text-start font-black">{t('restSalesColOpened')}</th>
                    <th className="py-3.5 px-4 text-start font-black">{t('restSalesColItems')}</th>
                    <th className="py-3.5 px-4 text-start font-black">{t('restSalesColTotal')}</th>
                    <th className="py-3.5 px-4 text-center font-black">
                      {t('restSalesColStatus')}
                    </th>
                    <th className="py-3.5 px-4 text-end font-black">{t('restSalesColActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        #{checkLabel(ord)}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {serviceLabel(ord)}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-semibold">
                        {ord.serverName || t('restSalesStaffFallback')}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-medium">
                        {new Date(ord.openedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                        {ord.items?.length || 0} {t('restSalesItemsUnit')}
                      </td>

                      <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                        {formatCurrency(ord.total || 0)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <StatusBadge
                          status={ord.status}
                          pulse={ord.status !== 'paid' && ord.status !== 'voided'}
                        />
                      </td>

                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playBump()
                            setInspectingOrder(ord)
                          }}
                          aria-label={t('restSalesInspect')}
                          title={t('restSalesInspect')}
                          className="p-1.5 me-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(ord)}
                          aria-label={t('restSalesReprint')}
                          title={t('restSalesReprint')}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 inline-flex items-center transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Inspect Check Detail Modal ───────────────────────────── */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t('restSalesAuditTitle', { check: checkLabel(inspectingOrder) })}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {serviceLabel(inspectingOrder)} · {t('restSalesServerPrefix')}:{' '}
                  {inspectingOrder.serverName || t('restSalesStaffFallback')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                aria-label={t('restSalesClose')}
                title={t('restSalesClose')}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs px-5">
              {(inspectingOrder.items || []).length === 0 ? (
                <p className="py-6 text-center text-slate-400 font-semibold">
                  {t('restSalesEmptyTitle')}
                </p>
              ) : (
                (inspectingOrder.items || []).map((it: any) => (
                  <div key={it.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {it.quantity}x {it.itemName}
                      </span>
                      <span className="block text-[10px] text-slate-400 uppercase">
                        {t('restSalesSeatPrefix')} {it.seatNumber || 1} • {it.course}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency((it.unitPrice || 0) * it.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 pt-3 space-y-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>{t('restSalesSubtotal')}</span>
                  <span>{formatCurrency(inspectingOrder.subtotal || 0)}</span>
                </div>
                {inspectingOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 font-bold">
                    <span>{t('restSalesDiscount')}</span>
                    <span>-{formatCurrency(inspectingOrder.discountAmount)}</span>
                  </div>
                )}
                {inspectingOrder.tipAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>{t('restSalesGratuity')}</span>
                    <span>{formatCurrency(inspectingOrder.tipAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{t('restSalesTotalSettled')}</span>
                  <span className="text-emerald-600">
                    {formatCurrency(inspectingOrder.total || 0)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePrintReceipt(inspectingOrder)}
                className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>{t('restSalesPrintReceipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
