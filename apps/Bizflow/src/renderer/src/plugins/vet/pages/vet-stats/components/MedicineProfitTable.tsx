import { useState } from 'react'
import { Percent, Search } from 'lucide-react'
import { ProfitAnalysis } from '../types'
import { formatCurrency, formatCompactNumber } from '../utils'

export function MedicineProfitTable({ profit }: { profit: ProfitAnalysis }) {
  const [search, setSearch] = useState('')

  const list = profit.topMedicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  if (profit.topMedicines.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Percent size={16} className="text-violet-500" /> Medicine Profit Margin Performance
        </h3>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine..."
            className="pl-8 pr-3 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-slate-400 text-left font-semibold">
              <th className="pb-2">Medicine</th>
              <th className="pb-2 text-right">Units Sold</th>
              <th className="pb-2 text-right">Expected Profit</th>
              <th className="pb-2 text-right">Actual Profit</th>
              <th className="pb-2 text-right">Discounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{m.name}</td>
                <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">{formatCompactNumber(m.unitsSold)}</td>
                <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">{formatCurrency(m.expectedProfit)}</td>
                <td className={`py-2.5 text-right font-bold ${m.actualProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {formatCurrency(m.actualProfit)}
                </td>
                <td className="py-2.5 text-right font-medium text-amber-600 dark:text-amber-400">
                  {m.discountsGiven > 0.005 ? `−${formatCurrency(m.discountsGiven)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}