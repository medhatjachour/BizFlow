import { useState } from 'react'
import { Plus, CheckCircle, FileText } from 'lucide-react'
import type { Employee, EmployeePayroll } from '../types'
import { describePayrollPeriod } from '../utils'
import PayslipModal from './PayslipModal'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  emp: Employee
  payrollRecords: EmployeePayroll[]
  onAdd: () => void
  onMarkPaid: (id: string) => void
  disabled?: boolean
}

export default function PayrollTab({ emp, payrollRecords, onAdd, onMarkPaid, disabled }: Props) {
  const { t } = useLanguage()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [payslip, setPayslip] = useState<EmployeePayroll | null>(null)

  const handleMarkPaid = async (id: string) => {
    setMarkingId(id)
    try { await onMarkPaid(id) } finally { setMarkingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empPayrollRecords')}</h3>
        {!disabled && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
            <Plus size={14} /> {t('empAddEditPayroll')}
          </button>
        )}
      </div>
      {payrollRecords.length === 0 ? (
        <p className="text-slate-500 text-center py-12">{t('empNoPayrollYet')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {[t('period'), t('empBaseSalary'), t('empBonuses'), t('empDeductions'), t('empNetPay'), t('status'), t('empPaidDate'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payrollRecords.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{describePayrollPeriod(p.month, p.year)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">${p.baseSalary.toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-600">+${p.bonuses.toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-500">-${p.deductions.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">${p.netPay.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {p.status === 'paid' ? t('empPaid') : t('empStatusPending')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPayslip(p)}
                        title={t('empPayslip') ?? 'Payslip'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FileText size={13} /> {t('empPayslip') ?? 'Payslip'}
                      </button>
                      {!disabled && p.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          disabled={markingId === p.id}
                          title="Mark as Paid"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={13} />
                          {markingId === p.id ? 'Saving…' : 'Mark Paid'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {payslip && (
        <PayslipModal emp={emp} record={payslip} allRecords={payrollRecords} onClose={() => setPayslip(null)} />
      )}
    </div>
  )
}


