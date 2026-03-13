import { Plus } from 'lucide-react'
import type { EmployeePayroll } from '../types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props {
  payrollRecords: EmployeePayroll[]
  onAdd: () => void
}

export default function PayrollTab({ payrollRecords, onAdd }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Payroll Records</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Add / Edit Payroll
        </button>
      </div>
      {payrollRecords.length === 0 ? (
        <p className="text-slate-500 text-center py-12">No payroll records yet</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Period', 'Base Salary', 'Bonuses', 'Deductions', 'Net Pay', 'Status', 'Paid Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payrollRecords.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{MONTHS[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">${p.baseSalary.toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-600">+${p.bonuses.toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-500">-${p.deductions.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">${p.netPay.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
