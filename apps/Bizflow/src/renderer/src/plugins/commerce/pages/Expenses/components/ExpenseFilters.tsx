import { ToggleLeft, ToggleRight } from 'lucide-react'

interface ExpenseFiltersProps {
  includeCOGS: boolean
  setIncludeCOGS: (v: boolean) => void
  includeSalaries: boolean
  setIncludeSalaries: (v: boolean) => void
  t: (key: string) => string
}

export default function ExpenseFilters({
  includeCOGS,
  setIncludeCOGS,
  includeSalaries,
  setIncludeSalaries,
  t,
}: ExpenseFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {/* COGS switch card */}
      <button
        type="button"
        onClick={() => setIncludeCOGS(!includeCOGS)}
        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start cursor-pointer active:scale-[0.99] ${
          includeCOGS
            ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${includeCOGS ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div>
            <p className="text-xs font-bold">{t('costOfGoodsSold') || 'Include COGS in Global Outflows'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {includeCOGS ? t('cogsActiveDesc') || 'Calculates product procurement cost from POS transactions' : t('cogsInactiveDesc') || 'Excluded from total calculations'}
            </p>
          </div>
        </div>
        <div>
          {includeCOGS ? (
            <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-slate-400" />
          )}
        </div>
      </button>

      {/* Salaries switch card */}
      <button
        type="button"
        onClick={() => setIncludeSalaries(!includeSalaries)}
        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start cursor-pointer active:scale-[0.99] ${
          includeSalaries
            ? 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${includeSalaries ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div>
            <p className="text-xs font-bold">{t('employeeSalaries') || 'Include Staff Salaries in Totals'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {includeSalaries ? t('salariesActiveDesc') || 'Aggregates base pay, extra shifts, and OT wages' : t('salariesInactiveDesc') || 'Excluded from total calculations'}
            </p>
          </div>
        </div>
        <div>
          {includeSalaries ? (
            <ToggleRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-slate-400" />
          )}
        </div>
      </button>
    </div>
  )
}