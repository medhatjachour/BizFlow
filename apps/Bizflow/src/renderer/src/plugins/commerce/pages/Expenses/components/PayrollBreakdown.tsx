import { CheckCircle, AlertCircle, Users } from 'lucide-react'
import { formatCurrency } from '../utils'
import type { PayrollEmployee } from '../types'

interface Props {
  payrollDetails: PayrollEmployee[]
  t: (key: string) => string
}

export default function PayrollBreakdown({ payrollDetails, t }: Props) {
  if (!payrollDetails.length) return null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 mt-6 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('payrollBreakdown') || 'Staff Payroll Ledger'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Audited compensation for {payrollDetails.length} employees
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 text-start">{t('employee') || 'Employee'}</th>
              <th className="py-3 px-3 text-end">{t('baseSalary') || 'Base Salary'}</th>
              <th className="py-3 px-3 text-end text-amber-600 dark:text-amber-400">{t('otHours') || 'OT Hours'}</th>
              <th className="py-3 px-3 text-end text-amber-600 dark:text-amber-400">{t('otPay') || 'OT Pay'}</th>
              <th className="py-3 px-3 text-end text-cyan-600 dark:text-cyan-400">{t('extraShifts') || 'Extra Shifts'}</th>
              <th className="py-3 px-3 text-end text-cyan-600 dark:text-cyan-400">{t('shiftPay') || 'Shift Pay'}</th>
              <th className="py-3 px-3 text-end text-emerald-600 dark:text-emerald-400">{t('bonuses') || 'Bonuses'}</th>
              <th className="py-3 px-3 text-end text-rose-500 dark:text-rose-400">{t('deductions') || 'Deductions'}</th>
              <th className="py-3 px-4 text-end font-bold text-slate-900 dark:text-white">{t('netPay') || 'Net Disbursed'}</th>
              <th className="py-3 px-3 text-center">{t('status') || 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {payrollDetails.map((emp) => (
              <tr key={emp.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                  <div className="text-[10px] text-slate-400">{emp.role} {emp.department ? `· ${emp.department}` : ''}</div>
                </td>
                <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                  {formatCurrency(emp.baseSalary)}
                </td>
                <td className="py-3 px-3 text-end font-mono text-amber-600 dark:text-amber-400">
                  {emp.overtimeHours > 0 ? `${emp.overtimeHours.toFixed(1)}h` : '—'}
                </td>
                <td className="py-3 px-3 text-end font-mono text-amber-600 dark:text-amber-400">
                  {emp.overtimePay > 0 ? `+${formatCurrency(emp.overtimePay)}` : '—'}
                </td>
                <td className="py-3 px-3 text-end font-mono text-cyan-600 dark:text-cyan-400">
                  {emp.extraShifts > 0 ? emp.extraShifts : '—'}
                </td>
                <td className="py-3 px-3 text-end font-mono text-cyan-600 dark:text-cyan-400">
                  {emp.extraShiftPay > 0 ? `+${formatCurrency(emp.extraShiftPay)}` : '—'}
                </td>
                <td className="py-3 px-3 text-end font-mono text-emerald-600 dark:text-emerald-400">
                  {emp.bonuses > 0 ? `+${formatCurrency(emp.bonuses)}` : '—'}
                </td>
                <td className="py-3 px-3 text-end font-mono text-rose-500 dark:text-rose-400">
                  {emp.deductions > 0 ? `-${formatCurrency(emp.deductions)}` : '—'}
                </td>
                <td className="py-3 px-4 text-end font-mono font-black text-slate-900 dark:text-white">
                  {formatCurrency(emp.netPay)}
                </td>
                <td className="py-3 px-3 text-center">
                  {emp.hasPending ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-2.5 h-2.5" /> Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="w-2.5 h-2.5" /> Settled
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}