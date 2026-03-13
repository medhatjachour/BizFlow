import React from 'react'
import { ROLES, DEPARTMENTS, type EmployeeFormData } from '../hooks/useEmployees'
import { useLanguage } from '../../../contexts/LanguageContext'

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
    {children}
  </div>
)
const EmpInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
)
const EmpSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select {...props} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary" />
)

interface Props {
  formData: EmployeeFormData
  onChange: (updates: Partial<EmployeeFormData>) => void
}

export default function EmployeeForm({ formData, onChange }: Props) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label={`${t('fullName')} *`}>
        <EmpInput value={formData.name} onChange={e => onChange({ name: e.target.value })} placeholder="e.g. Ahmed Hassan" />
      </FormField>
      <FormField label={`${t('role')} *`}>
        <EmpSelect value={formData.role} onChange={e => onChange({ role: e.target.value })}>
          <option value="">{t('empSelectRole')}</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </EmpSelect>
      </FormField>
      <FormField label={t('empDepartment')}>
        <EmpSelect value={formData.department} onChange={e => onChange({ department: e.target.value })}>
          <option value="">{t('empSelectDept')}</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </EmpSelect>
      </FormField>
      <FormField label={t('empEmploymentType')}>
        <EmpSelect value={formData.employmentType} onChange={e => onChange({ employmentType: e.target.value as any })}>
          <option value="full-time">{t('empFullTime')}</option>
          <option value="part-time">{t('empPartTime')}</option>
          <option value="contract">{t('empContract')}</option>
        </EmpSelect>
      </FormField>
      <FormField label={t('email')}>
        <EmpInput type="email" value={formData.email} onChange={e => onChange({ email: e.target.value })} placeholder="employee@company.com" />
      </FormField>
      <FormField label={`${t('phone')} *`}>
        <EmpInput value={formData.phone} onChange={e => onChange({ phone: e.target.value })} placeholder="+1 555 000 0000" />
      </FormField>
      <FormField label={t('hireDate')}>
        <EmpInput type="date" value={formData.hireDate} onChange={e => onChange({ hireDate: e.target.value })} />
      </FormField>
      <FormField label={t('status')}>
        <EmpSelect value={formData.status} onChange={e => onChange({ status: e.target.value as any })}>
          <option value="active">{t('empStatusActive')}</option>
          <option value="on-leave">{t('empStatusOnLeave')}</option>
          <option value="terminated">{t('empStatusTerminated')}</option>
        </EmpSelect>
      </FormField>
      <FormField label={t('salary')}>
        <EmpInput type="number" min={0} value={formData.salary} onChange={e => onChange({ salary: Number(e.target.value) })} placeholder="0.00" />
      </FormField>
      <FormField label={t('salaryMonthly').replace(' (monthly)', '')}>
        <EmpSelect value={formData.salaryType} onChange={e => onChange({ salaryType: e.target.value })}>
          <option value="monthly">{t('empMonthly')}</option>
          <option value="daily">{t('empDaily')}</option>
          <option value="hourly">{t('empHourly')}</option>
        </EmpSelect>
      </FormField>
      <FormField label={t('empPerformanceScore')}>
        <EmpInput
          type="number" min={0} max={100}
          value={formData.performanceScore || ''}
          onChange={e => onChange({ performanceScore: Number(e.target.value) })}
          placeholder="Optional, e.g. 85"
        />
      </FormField>
      <FormField label={t('empAddress')}>
        <EmpInput value={formData.address} onChange={e => onChange({ address: e.target.value })} placeholder={t('empAddrPlaceholder')} />
      </FormField>
      <FormField label={t('empNationalId')}>
        <EmpInput value={formData.nationalId} onChange={e => onChange({ nationalId: e.target.value })} placeholder={t('empNationalIdPlaceholder')} />
      </FormField>
      <FormField label={t('empEmergencyContactName')}>
        <EmpInput value={formData.emergencyName} onChange={e => onChange({ emergencyName: e.target.value })} placeholder={t('empEmergencyNamePlaceholder')} />
      </FormField>
      <FormField label={t('empEmergencyContactPhone')}>
        <EmpInput value={formData.emergencyPhone} onChange={e => onChange({ emergencyPhone: e.target.value })} placeholder="+1 555 000 0000" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label={t('notes')}>
          <textarea
            value={formData.notes}
            onChange={e => onChange({ notes: e.target.value })}
            rows={3}
            placeholder={t('empNotesPlaceholder')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary resize-none"
          />
        </FormField>
      </div>
    </div>
  )
}
