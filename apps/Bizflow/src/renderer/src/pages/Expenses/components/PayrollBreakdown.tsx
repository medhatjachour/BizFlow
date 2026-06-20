import { Clock, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import type { PayrollEmployee } from '../types'

interface Props {
  payrollDetails: PayrollEmployee[]
}

export default function PayrollBreakdown({ payrollDetails }: Props) {
  if (!payrollDetails.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mt-6">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Employee Payroll Breakdown</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Detailed pay for {payrollDetails.length} {payrollDetails.length === 1 ? 'employee' : 'employees'} in this period
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Salary</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <span className="flex items-center justify-end gap-1"><Clock size={12} /> OT Hours</span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">OT Pay</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                <span className="flex items-center justify-end gap-1"><Zap size={12} /> Extra Shifts</span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Shift Pay</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Bonuses</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Deductions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Pay</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {payrollDetails.map((emp) => (
              <tr key={emp.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">
                  ${emp.baseSalary.toFixed(2)}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.overtimeHours > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{emp.overtimeHours.toFixed(1)}h</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.overtimePay > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">+${emp.overtimePay.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.extraShifts > 0 ? (
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">{emp.extraShifts}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.extraShiftPay > 0 ? (
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">+${emp.extraShiftPay.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.bonuses > 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">+${emp.bonuses.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {emp.deductions > 0 ? (
                    <span className="text-red-500 dark:text-red-400">-${emp.deductions.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                  ${emp.netPay.toFixed(2)}
                </td>
                <td className="px-4 py-4 text-center">
                  {emp.hasPending ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      <AlertCircle size={10} /> Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      <CheckCircle size={10} /> Paid
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {payrollDetails.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
                <td className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Totals</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                  ${payrollDetails.reduce((s, e) => s + e.baseSalary, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                  {payrollDetails.reduce((s, e) => s + e.overtimeHours, 0).toFixed(1)}h
                </td>
                <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                  +${payrollDetails.reduce((s, e) => s + e.overtimePay, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                  {payrollDetails.reduce((s, e) => s + e.extraShifts, 0)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                  +${payrollDetails.reduce((s, e) => s + e.extraShiftPay, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                  +${payrollDetails.reduce((s, e) => s + e.bonuses, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-500 dark:text-red-400">
                  -${payrollDetails.reduce((s, e) => s + e.deductions, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white text-base">
                  ${payrollDetails.reduce((s, e) => s + e.netPay, 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
