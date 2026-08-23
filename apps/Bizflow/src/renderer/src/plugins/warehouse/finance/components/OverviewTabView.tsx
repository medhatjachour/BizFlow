import React from 'react'
import { Box, MapPin, AlertTriangle, ArrowRightLeft } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts'
import { LocationQtyMetric, FinanceOverviewData } from '../types'
import { FINANCE_PALETTE } from '../constants'

interface Props {
  overviewData: FinanceOverviewData | null
  totalSKUs: number
  locationData: LocationQtyMetric[]
}

export const OverviewTabView: React.FC<Props> = ({
  overviewData,
  totalSKUs,
  locationData
}) => {
  const cards = [
    {
      label: 'Tracked SKU Count',
      value: overviewData?.totalSKUs ?? totalSKUs,
      sub: 'Active catalog products',
      icon: Box,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      label: 'Active Storage Nodes',
      value: overviewData?.totalLocations ?? locationData.length,
      sub: 'Physical zones & bins',
      icon: MapPin,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: 'Threshold Alerts',
      value: overviewData?.lowStockCount ?? 0,
      sub: 'At or below minimum limit',
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      label: 'Pending In-Transit',
      value: overviewData?.pendingTransfers ?? 0,
      sub: 'Dispatched manifests',
      icon: ArrowRightLeft,
      color: 'text-teal-500 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/40'
    }
  ]

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </div>
                <div className="text-[10.5px] text-slate-400">{card.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stock Unit Distribution Chart */}
      {locationData.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Stock Quantity Balance by Location
            </h4>
            <p className="text-[11px] text-slate-400">Total physical units grouped by storage facilities</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData.slice(0, 8)} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val || 0).toLocaleString()} units`, 'Physical Stock']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '12px',
                    borderColor: '#334155',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                  {locationData.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={FINANCE_PALETTE[i % FINANCE_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}