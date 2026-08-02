import { Users, UserCheck, Repeat } from 'lucide-react'
import { CustomerInsights as CustomerInsightsType } from '../types'
import { formatCurrency, formatDateDisplay } from '../utils'

interface CustomerInsightsProps {
  customers: CustomerInsightsType | null
  loading: boolean
  t: (key: string) => string
}

export function CustomerInsights({ customers, loading, t }: CustomerInsightsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const topCustomers = customers?.topCustomers ?? []

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('cfCustomerInsights')}</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-purple-50 dark:bg-purple-500/10 p-3 text-center">
          <Users className="h-5 w-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
            {customers?.totalCustomers ?? 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('cfTotalCustomers')}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
          <Repeat className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {customers?.repeatCustomers ?? 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('cfRepeat')}</p>
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-center">
          <UserCheck className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {customers?.repeatRatePct?.toFixed(1) ?? '0.0'}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('cfRepeatRateLc')}</p>
        </div>
      </div>

      {/* Top Customers List */}
      {topCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Users className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No customer data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topCustomers.map((customer, idx) => (
            <div
              key={`${customer.id}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 text-white flex items-center justify-center font-bold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{customer.name}</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(customer.spent)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{customer.orders} {t('cfOrdersLc')}</span>
                  {customer.deliveryOrders > 0 && (
                    <span className="text-cyan-600 dark:text-cyan-400">
                      🛵 {customer.deliveryOrders} {t('cfDeliveryLc')}
                    </span>
                  )}
                  <span className="ml-auto">{formatDateDisplay(customer.lastVisit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
