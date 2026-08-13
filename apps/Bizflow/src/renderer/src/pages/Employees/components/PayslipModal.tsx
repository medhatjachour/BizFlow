import { X, Printer } from 'lucide-react'
import type { Employee, EmployeePayroll } from '../types'
import { describePayrollPeriod } from '../utils'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  emp: Pick<Employee, 'id' | 'name' | 'role' | 'department' | 'salaryType' | 'bankName' | 'iban' | 'taxId' | 'socialInsuranceNo'>
  record: EmployeePayroll
  allRecords: EmployeePayroll[]
  onClose: () => void
}

const money = (n: number) => `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PayslipModal({ emp, record, allRecords, onClose }: Props) {
  const { t } = useLanguage()

  // Year-to-date totals (same calendar year as this record)
  const ytdRecords = allRecords.filter(r => r.year === record.year)
  const ytdGross = ytdRecords.reduce((s, r) => s + (r.grossPay || r.netPay || 0), 0)
  const ytdNet = ytdRecords.reduce((s, r) => s + (r.netPay ?? 0), 0)
  const ytdDed = ytdRecords.reduce((s, r) => s + (r.deductions ?? 0), 0)

  const gross = record.grossPay || (record.baseSalary + (record.overtimePay ?? 0) + (record.extraShiftPay ?? 0) + (record.bonuses ?? 0))
  const period = describePayrollPeriod(record.month, record.year)

  const earnings: { label: string; value: number; hint?: string }[] = [
    { label: t('empBaseSalary') ?? 'Base salary', value: record.baseSalary },
    ...((record.overtimePay ?? 0) > 0 ? [{ label: t('tabOvertime') ?? 'Overtime', value: record.overtimePay ?? 0, hint: `${record.overtimeHours ?? 0}h` }] : []),
    ...((record.extraShiftPay ?? 0) > 0 ? [{ label: t('empExtraShifts') ?? 'Extra shifts', value: record.extraShiftPay ?? 0, hint: `${record.extraShifts ?? 0}` }] : []),
    ...((record.bonuses ?? 0) > 0 ? [{ label: t('empBonuses') ?? 'Bonuses', value: record.bonuses }] : []),
  ]

  const printPayslip = () => {
    const rows = (arr: { label: string; value: number; hint?: string }[]) =>
      arr.map(e => `<tr><td>${e.label}${e.hint ? ` <span class="hint">(${e.hint})</span>` : ''}</td><td class="num">${money(e.value)}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip — ${emp.name} — ${period}</title>
<style>
  *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}
  body{margin:0;padding:32px;color:#0f172a}
  .sheet{max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
  .head{background:#4f46e5;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start}
  .head h1{margin:0;font-size:20px}.head .sub{opacity:.85;font-size:12px;margin-top:2px}
  .badge{font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.2)}
  .body{padding:24px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;font-size:13px}
  .grid .k{color:#64748b}.grid .v{font-weight:600;text-align:right}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  th{text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding:6px 0}
  td{padding:6px 0;border-bottom:1px solid #f1f5f9}.num{text-align:right;font-variant-numeric:tabular-nums}
  .hint{color:#94a3b8;font-size:11px}
  .total{display:flex;justify-content:space-between;padding:14px 16px;border-radius:10px;margin-top:12px}
  .gross{background:#f1f5f9}.ded{background:#fef2f2;color:#b91c1c}.net{background:#ecfdf5;color:#047857;font-size:18px;font-weight:700}
  .ytd{margin-top:20px;padding-top:14px;border-top:1px dashed #cbd5e1;font-size:12px;color:#475569;display:flex;gap:24px}
  .ytd b{color:#0f172a}
  .foot{padding:12px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center}
  @media print{body{padding:0}.sheet{border:none}}
</style></head><body>
<div class="sheet">
  <div class="head"><div><h1>Payslip</h1><div class="sub">${period}</div></div>
    <span class="badge">${record.status === 'paid' ? 'PAID' : 'PENDING'}${record.paidDate ? ' · ' + new Date(record.paidDate).toLocaleDateString() : ''}</span></div>
  <div class="body">
    <div class="grid">
      <div><div class="k">Employee</div></div><div class="v">${emp.name}</div>
      <div class="k">Role</div><div class="v">${emp.role}${emp.department ? ' · ' + emp.department : ''}</div>
      ${emp.taxId ? `<div class="k">Tax ID</div><div class="v">${emp.taxId}</div>` : ''}
      ${emp.socialInsuranceNo ? `<div class="k">Social insurance</div><div class="v">${emp.socialInsuranceNo}</div>` : ''}
      ${emp.bankName ? `<div class="k">Bank</div><div class="v">${emp.bankName}</div>` : ''}
      ${emp.iban ? `<div class="k">Account / IBAN</div><div class="v">${emp.iban}</div>` : ''}
    </div>
    <table><thead><tr><th>Earnings</th><th class="num">Amount</th></tr></thead><tbody>${rows(earnings)}</tbody></table>
    <div class="total gross"><span>Gross pay</span><b>${money(gross)}</b></div>
    <div class="total ded"><span>Deductions</span><b>− ${money(record.deductions ?? 0)}</b></div>
    <div class="total net"><span>Net pay</span><span>${money(record.netPay)}</span></div>
    <div class="ytd"><span>YTD gross <b>${money(ytdGross)}</b></span><span>YTD deductions <b>${money(ytdDed)}</b></span><span>YTD net <b>${money(ytdNet)}</b></span></div>
  </div>
  <div class="foot">Generated by BizFlow · ${new Date().toLocaleString()}</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`
    const w = window.open('', '_blank', 'width=820,height=1000')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[min(94vw,40rem)] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 bg-gradient-to-r from-primary to-secondary text-white">
          <div>
            <h3 className="text-lg font-bold">{t('empPayslip') ?? 'Payslip'}</h3>
            <p className="text-xs opacity-85 mt-0.5">{period}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2.5 py-1 rounded-full ${record.status === 'paid' ? 'bg-white/25' : 'bg-white/15'}`}>
              {record.status === 'paid' ? (t('empPaid') ?? 'Paid') : (t('empStatusPending') ?? 'Pending')}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Employee */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><div className="text-xs text-slate-400">{t('empName') ?? 'Employee'}</div><div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div></div>
            <div><div className="text-xs text-slate-400">{t('empRole') ?? 'Role'}</div><div className="font-medium text-slate-700 dark:text-slate-300">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</div></div>
            {emp.bankName && <div><div className="text-xs text-slate-400">{t('empBankName')}</div><div className="font-medium text-slate-700 dark:text-slate-300">{emp.bankName}</div></div>}
            {emp.iban && <div><div className="text-xs text-slate-400">{t('empIban')}</div><div className="font-medium text-slate-700 dark:text-slate-300 truncate">{emp.iban}</div></div>}
          </div>

          {/* Earnings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
            {earnings.map(e => (
              <div key={e.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{e.label} {e.hint && <span className="text-xs text-slate-400">({e.hint})</span>}</span>
                <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{money(e.value)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('empGrossPay') ?? 'Gross pay'}</span>
              <span className="font-semibold tabular-nums">{money(gross)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              <span>{t('empDeductions') ?? 'Deductions'}</span>
              <span className="font-semibold tabular-nums">− {money(record.deductions ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              <span className="font-semibold">{t('empNetPay') ?? 'Net pay'}</span>
              <span className="text-xl font-bold tabular-nums">{money(record.netPay)}</span>
            </div>
          </div>

          {/* YTD */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('empYtdGross') ?? 'YTD gross'} <b className="text-slate-800 dark:text-slate-200">{money(ytdGross)}</b></span>
            <span>{t('empYtdNet') ?? 'YTD net'} <b className="text-slate-800 dark:text-slate-200">{money(ytdNet)}</b></span>
            <span>{record.year}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('close') ?? 'Close'}</button>
            <button onClick={printPayslip} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <Printer size={15} /> {t('empPrintPayslip') ?? 'Print / Save PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
