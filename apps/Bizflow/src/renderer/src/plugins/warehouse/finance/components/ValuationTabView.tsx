import React from 'react'
import { MapPin } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts'
import { LocationQtyMetric } from '../types'
import { FINANCE_PALETTE } from '../constants'

interface Props {
  locationData: LocationQtyMetric[]
  totalUnits: number
  totalEstimatedValue: number
}

export const ValuationTabView: React.FC<Props> = ({
  locationData,
  totalUnits,
  totalEstimatedValue
}) => {
  if (locationData.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 text-xs">
        No stock valuation entries recorded.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Donut Chart Visualization */}
      <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Facility Stock Concentration
            </h4>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {totalUnits.toLocaleString()} Total Units
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Asset distribution across storage nodes</p>
        </div>

        <div className="h-64 w-full my-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData}
                dataKey="quantity"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={3}
              >
                {locationData.map((_, i) => (
                  <Cell key={i} fill={FINANCE_PALETTE[i % FINANCE_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any, name: any) => [`${Number(val || 0).toLocaleString()} units`, name]}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: '12px',
                  borderColor: '#334155',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend
                formatter={(value: string) => <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {totalEstimatedValue > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Estimated Capital Asset:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
              ${totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="lg:col-span-6 space-y-2.5 max-h-[30rem] overflow-y-auto pr-1">
        {locationData.map((loc, idx) => {
          const color = FINANCE_PALETTE[idx % FINANCE_PALETTE.length]
          return (
            <div
              key={loc.name}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{loc.name}</span>
                    {loc.code && (
                      <span className="text-[10px] font-mono text-slate-400">({loc.code})</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    {loc.skuCount} SKUs · {loc.percentage}% of inventory
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                  {loc.quantity.toLocaleString()} units
                </div>
                {loc.estimatedValue ? (
                  <div className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400">
                    ${loc.estimatedValue.toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}