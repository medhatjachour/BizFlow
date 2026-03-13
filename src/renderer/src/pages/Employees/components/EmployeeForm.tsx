import React from 'react'
import { ROLES, DEPARTMENTS, type EmployeeFormData } from '../hooks/useEmployees'

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Full Name *">
        <EmpInput value={formData.name} onChange={e => onChange({ name: e.target.value })} placeholder="e.g. Ahmed Hassan" />
      </FormField>
      <FormField label="Role *">
        <EmpSelect value={formData.role} onChange={e => onChange({ role: e.target.value })}>
          <option value="">Select role…</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </EmpSelect>
      </FormField>
      <FormField label="Department">
        <EmpSelect value={formData.department} onChange={e => onChange({ department: e.target.value })}>
          <option value="">Select department…</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </EmpSelect>
      </FormField>
      <FormField label="Employment Type">
        <EmpSelect value={formData.employmentType} onChange={e => onChange({ employmentType: e.target.value as any })}>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
        </EmpSelect>
      </FormField>
      <FormField label="Email">
        <EmpInput type="email" value={formData.email} onChange={e => onChange({ email: e.target.value })} placeholder="employee@company.com" />
      </FormField>
      <FormField label="Phone *">
        <EmpInput value={formData.phone} onChange={e => onChange({ phone: e.target.value })} placeholder="+1 555 000 0000" />
      </FormField>
      <FormField label="Hire Date">
        <EmpInput type="date" value={formData.hireDate} onChange={e => onChange({ hireDate: e.target.value })} />
      </FormField>
      <FormField label="Status">
        <EmpSelect value={formData.status} onChange={e => onChange({ status: e.target.value as any })}>
          <option value="active">Active</option>
          <option value="on-leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </EmpSelect>
      </FormField>
      <FormField label="Salary">
        <EmpInput type="number" min={0} value={formData.salary} onChange={e => onChange({ salary: Number(e.target.value) })} placeholder="0.00" />
      </FormField>
      <FormField label="Salary Type">
        <EmpSelect value={formData.salaryType} onChange={e => onChange({ salaryType: e.target.value })}>
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
          <option value="hourly">Hourly</option>
        </EmpSelect>
      </FormField>
      <FormField label="Performance Score (0–100)">
        <EmpInput
          type="number" min={0} max={100}
          value={formData.performanceScore || ''}
          onChange={e => onChange({ performanceScore: Number(e.target.value) })}
          placeholder="Optional, e.g. 85"
        />
      </FormField>
      <FormField label="Address">
        <EmpInput value={formData.address} onChange={e => onChange({ address: e.target.value })} placeholder="Street, City" />
      </FormField>
      <FormField label="National ID">
        <EmpInput value={formData.nationalId} onChange={e => onChange({ nationalId: e.target.value })} placeholder="ID / Passport number" />
      </FormField>
      <FormField label="Emergency Contact Name">
        <EmpInput value={formData.emergencyName} onChange={e => onChange({ emergencyName: e.target.value })} placeholder="Contact name" />
      </FormField>
      <FormField label="Emergency Contact Phone">
        <EmpInput value={formData.emergencyPhone} onChange={e => onChange({ emergencyPhone: e.target.value })} placeholder="+1 555 000 0000" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Notes">
          <textarea
            value={formData.notes}
            onChange={e => onChange({ notes: e.target.value })}
            rows={3}
            placeholder="Any additional notes…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary resize-none"
          />
        </FormField>
      </div>
    </div>
  )
}
