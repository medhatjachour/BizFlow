import { useState } from 'react'
import { CheckCircle, FileText, Plus, Wallet } from 'lucide-react'
import type { Employee, EmployeePayroll } from '../types'
import { describePayrollPeriod } from '../payrollPeriod'
import PayslipModal from './PayslipModal'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useHrFormat } from '../ui/hrFormat'
import {
  HrBadge,
  HrButton,
  HrEmptyState,
  HrSectionHeader,
  HrTableShell,
} from '../ui/primitives'

interface Props {
  emp: Employee
  payrollRecords: EmployeePayroll[]
  onAdd: () => void
  onMarkPaid: (id: string) => void
  disabled?: boolean
}

export default function PayrollTab({ emp, payrollRecords, onAdd, onMarkPaid, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [payslip, setPayslip] = useState<EmployeePayroll | null>(null)

  const handleMarkPaid = async (id: string) => {
    setMarkingId(id)
    try { await onMarkPaid(id) } finally { setMarkingId(null) }
  }

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={Wallet}
        title={t('empPayrollRecords')}
        subtitle={
          payrollRecords.length > 0
            ? `${payrollRecords.length} ${t('empPayslipCount') ?? 'period(s) on record'}`
            : undefined
        }
        action={
          !disabled ? (
            <HrButton onClick={onAdd} icon={Plus} variant="primary" size="md">
              {t('empAddEditPayroll')}
            </HrButton>
          ) : undefined
        }
      />

      {payrollRecords.length === 0 ? (
        <HrEmptyState
          icon={Wallet}
          title={t('empNoPayrollYet')}
          description={t('empNoPayrollHint')}
          action={
            !disabled ? (
              <HrButton onClick={onAdd} icon={Plus} variant="primary" size="md">
                {t('empAddEditPayroll')}
              </HrButton>
            ) : undefined
          }
        />
      ) : (
        <HrTableShell
          columns={[
            { label: t('period') },
            { label: t('empBaseSalary'), align: 'end' },
            { label: t('empBonuses'), align: 'end' },
            { label: t('empDeductions'), align: 'end' },
            { label: t('empNetPay'), align: 'end' },
            { label: t('status') },
            { label: t('empPaidDate') },
            { label: '' },
          ]}
        >
          {payrollRecords.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                {describePayrollPeriod(p.month, p.year)}
              </td>
              <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-300 tabular-nums">{fmt.money(p.baseSalary)}</td>
              <td className="px-4 py-3 text-end text-green-600 tabular-nums">
                {p.bonuses > 0 ? `+${fmt.money(p.bonuses)}` : fmt.money(0)}
              </td>
              <td className="px-4 py-3 text-end text-red-500 tabular-nums">
                {p.deductions > 0 ? `−${fmt.money(p.deductions)}` : fmt.money(0)}
              </td>
              <td className="px-4 py-3 text-end font-bold text-slate-900 dark:text-white tabular-nums">{fmt.money(p.netPay)}</td>
              <td className="px-4 py-3">
                <HrBadge tone={p.status === 'paid' ? 'success' : 'warning'}>
                  {p.status === 'paid' ? t('empPaid') : t('empStatusPending')}
                </HrBadge>
              </td>
              <td className="px-4 py-3 text-slate-500">{p.paidDate ? fmt.date(p.paidDate) : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 justify-end">
                  <HrButton onClick={() => setPayslip(p)} icon={FileText} variant="secondary" size="xs">
                    {t('empPayslip')}
                  </HrButton>
                  {!disabled && p.status === 'pending' && (
                    <HrButton
                      onClick={() => handleMarkPaid(p.id)}
                      icon={CheckCircle}
                      variant="success"
                      size="xs"
                      loading={markingId === p.id}
                    >
                      {markingId === p.id ? t('empSaving') : t('empMarkPaid')}
                    </HrButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </HrTableShell>
      )}

      {payslip && (
        <PayslipModal emp={emp} record={payslip} allRecords={payrollRecords} onClose={() => setPayslip(null)} />
      )}
    </div>
  )
}


