import React, { useState, useRef } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import type { EmployeeFormData } from '../hooks/useEmployees'
import { usePluginRoles, type RoleGroup } from '../hooks/usePluginRoles'
import { useLanguage } from '../../../contexts/LanguageContext'

// ─── Tailwind colour maps (full class names required — no dynamic concat) ─────

const CHIP_BASE: Record<string, string> = {
  slate:  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700',
  amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-700',
  rose:   'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-700',
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-700',
  teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-700',
}
const CHIP_ACTIVE: Record<string, string> = {
  slate:  'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border border-slate-700 dark:border-slate-200',
  indigo: 'bg-indigo-600 text-white border border-indigo-600',
  amber:  'bg-amber-500 text-white border border-amber-500',
  rose:   'bg-rose-600 text-white border border-rose-600',
  blue:   'bg-blue-600 text-white border border-blue-600',
  teal:   'bg-teal-600 text-white border border-teal-600',
}
const HEADER_COLOR: Record<string, string> = {
  slate:  'text-slate-400 dark:text-slate-500',
  indigo: 'text-indigo-500 dark:text-indigo-400',
  amber:  'text-amber-500 dark:text-amber-400',
  rose:   'text-rose-500 dark:text-rose-400',
  blue:   'text-blue-500 dark:text-blue-400',
  teal:   'text-teal-500 dark:text-teal-400',
}

const INP = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors placeholder:text-slate-400'
const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary cursor-pointer'

function Field({ label, required, half, children }: {
  label: string; required?: boolean; half?: boolean; children: React.ReactNode
}) {
  return (
    <div className={half ? '' : 'sm:col-span-2'}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="sm:col-span-2 flex items-center gap-3 pt-1">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/80" />
    </div>
  )
}

function RolePicker({ value, onChange, onDeptSuggest, groups }: {
  value: string
  onChange: (role: string) => void
  onDeptSuggest: (dept: string) => void
  groups: RoleGroup[]
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? groups.flatMap(g =>
        g.roles
          .filter(r => r.toLowerCase().includes(value.toLowerCase()))
          .map(r => ({ r, g }))
      )
    : null

  function pick(role: string, group?: RoleGroup) {
    onChange(role)
    setOpen(false)
    if (group?.departments[0]) onDeptSuggest(group.departments[0])
  }

  return (
    <div ref={containerRef} className="relative sm:col-span-2">
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Type a role or pick from suggestions…"
          className={INP + ' pr-8'}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(''); setOpen(true) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={13} />
          </button>
        ) : (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setOpen(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          className="absolute z-20 top-full left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {filtered !== null ? (
            filtered.length > 0 ? (
              <div className="p-2.5 flex flex-wrap gap-1.5">
                {filtered.map(({ r, g }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => pick(r, g)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${CHIP_BASE[g.color]}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-4 text-center text-xs text-slate-400">
                No suggestions — your value will be saved as typed.
              </p>
            )
          ) : (
            groups.map(g => (
              <div key={g.moduleId} className="px-3 pt-3 pb-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-700/60">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${HEADER_COLOR[g.color]}`}>
                  {g.icon} {g.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.roles.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => pick(r, g)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        value === r ? CHIP_ACTIVE[g.color] : CHIP_BASE[g.color]
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  formData: EmployeeFormData
  onChange: (updates: Partial<EmployeeFormData>) => void
}

export default function EmployeeForm({ formData, onChange }: Props) {
  const { t } = useLanguage()
  const { groups, allDepartments } = usePluginRoles()
  const [showMore, setShowMore] = useState(false)

  function handleRoleChange(role: string) {
    onChange({ role })
  }

  function handleDeptSuggest(dept: string) {
    if (!formData.department) onChange({ department: dept })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

      {/* Identity */}
      <SectionHeader title="Identity" />

      <Field label={`${t('fullName')} *`} half>
        <input
          value={formData.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g. Ahmed Hassan"
          className={INP}
        />
      </Field>

      <Field label={t('empDepartment')} half>
        <select
          value={formData.department}
          onChange={e => onChange({ department: e.target.value })}
          className={SEL}
        >
          <option value="">{t('empSelectDept')}</option>
          {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>

      <Field label={`${t('role')} *`}>
        <RolePicker
          value={formData.role}
          onChange={handleRoleChange}
          onDeptSuggest={handleDeptSuggest}
          groups={groups}
        />
      </Field>

      {/* Employment */}
      <SectionHeader title="Employment" />

      <Field label={t('empEmploymentType')} half>
        <select
          value={formData.employmentType}
          onChange={e => onChange({ employmentType: e.target.value as EmployeeFormData['employmentType'] })}
          className={SEL}
        >
          <option value="full-time">{t('empFullTime')}</option>
          <option value="part-time">{t('empPartTime')}</option>
          <option value="contract">{t('empContract')}</option>
        </select>
      </Field>

      <Field label={t('status')} half>
        <select
          value={formData.status}
          onChange={e => onChange({ status: e.target.value as EmployeeFormData['status'] })}
          className={SEL}
        >
          <option value="active">{t('empStatusActive')}</option>
          <option value="on-leave">{t('empStatusOnLeave')}</option>
          <option value="terminated">{t('empStatusTerminated')}</option>
        </select>
      </Field>

      <Field label={t('hireDate')} half>
        <input
          type="date"
          value={formData.hireDate}
          onChange={e => onChange({ hireDate: e.target.value })}
          className={INP}
        />
      </Field>

      {/* Compensation */}
      <SectionHeader title="Compensation" />

      <Field label={t('salary')} half>
        <input
          type="number"
          min={0}
          step={0.01}
          value={formData.salary}
          onChange={e => onChange({ salary: Number(e.target.value) })}
          placeholder={formData.salaryType === 'hourly' ? 'Rate per hour' : '0.00'}
          className={INP}
        />
      </Field>

      <Field label={t('salaryMonthly').replace(' (monthly)', '')} half>
        <select
          value={formData.salaryType}
          onChange={e => onChange({ salaryType: e.target.value })}
          className={SEL}
        >
          <option value="monthly">{t('empMonthly')}</option>
          <option value="weekly">Weekly</option>
          <option value="daily">{t('empDaily')}</option>
          <option value="hourly">{t('empHourly')}</option>
        </select>
      </Field>

      <Field label={t('empPerformanceScore')} half>
        <input
          type="number"
          min={0}
          max={100}
          value={formData.performanceScore || ''}
          onChange={e => onChange({ performanceScore: Number(e.target.value) })}
          placeholder="0 – 100"
          className={INP}
        />
      </Field>

      <Field label={t('empAnnualLeaveDays') ?? 'Annual leave days'} half>
        <input
          type="number"
          min={0}
          max={365}
          value={formData.annualLeaveDays ?? ''}
          onChange={e => onChange({ annualLeaveDays: Number(e.target.value) })}
          placeholder="21"
          className={INP}
        />
      </Field>

      {/* Contact */}
      <SectionHeader title="Contact" />

      <Field label={`${t('phone')} *`} half>
        <input
          value={formData.phone}
          onChange={e => onChange({ phone: e.target.value })}
          placeholder="+1 555 000 0000"
          className={INP}
        />
      </Field>

      <Field label={t('email')} half>
        <input
          type="email"
          value={formData.email}
          onChange={e => onChange({ email: e.target.value })}
          placeholder="employee@company.com"
          className={INP}
        />
      </Field>

      {/* Expandable: more details */}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span className="uppercase tracking-widest">
            {showMore ? 'Hide additional fields' : 'More details (address, ID, emergency contact, notes)'}
          </span>
        </button>
      </div>

      {showMore && (
        <>
          <SectionHeader title="Location & ID" />

          <Field label={t('empAddress')} half>
            <input
              value={formData.address}
              onChange={e => onChange({ address: e.target.value })}
              placeholder={t('empAddrPlaceholder')}
              className={INP}
            />
          </Field>

          <Field label={t('empNationalId')} half>
            <input
              value={formData.nationalId}
              onChange={e => onChange({ nationalId: e.target.value })}
              placeholder={t('empNationalIdPlaceholder')}
              className={INP}
            />
          </Field>

          <SectionHeader title="Emergency Contact" />

          <Field label={t('empEmergencyContactName')} half>
            <input
              value={formData.emergencyName}
              onChange={e => onChange({ emergencyName: e.target.value })}
              placeholder={t('empEmergencyNamePlaceholder')}
              className={INP}
            />
          </Field>

          <Field label={t('empEmergencyContactPhone')} half>
            <input
              value={formData.emergencyPhone}
              onChange={e => onChange({ emergencyPhone: e.target.value })}
              placeholder="+1 555 000 0000"
              className={INP}
            />
          </Field>

          <SectionHeader title="Payroll & compliance" />

          <Field label={t('empTaxId') ?? 'Tax ID'} half>
            <input
              value={formData.taxId}
              onChange={e => onChange({ taxId: e.target.value })}
              placeholder="TIN / tax file no."
              className={INP}
            />
          </Field>

          <Field label={t('empSocialInsurance') ?? 'Social insurance no.'} half>
            <input
              value={formData.socialInsuranceNo}
              onChange={e => onChange({ socialInsuranceNo: e.target.value })}
              placeholder="SSN / social insurance"
              className={INP}
            />
          </Field>

          <Field label={t('empBankName') ?? 'Bank name'} half>
            <input
              value={formData.bankName}
              onChange={e => onChange({ bankName: e.target.value })}
              placeholder="Bank"
              className={INP}
            />
          </Field>

          <Field label={t('empIban') ?? 'Account / IBAN'} half>
            <input
              value={formData.iban}
              onChange={e => onChange({ iban: e.target.value })}
              placeholder="Account number / IBAN"
              className={INP}
            />
          </Field>

          <SectionHeader title="Contract & expiry" />

          <Field label={t('empContractEnd') ?? 'Contract end date'} half>
            <input
              type="date"
              value={formData.contractEndDate}
              onChange={e => onChange({ contractEndDate: e.target.value })}
              className={INP}
            />
          </Field>

          <Field label={t('empIdExpiry') ?? 'ID / visa expiry'} half>
            <input
              type="date"
              value={formData.idExpiryDate}
              onChange={e => onChange({ idExpiryDate: e.target.value })}
              className={INP}
            />
          </Field>

          <SectionHeader title="Notes" />

          <Field label={t('notes')}>
            <textarea
              value={formData.notes}
              onChange={e => onChange({ notes: e.target.value })}
              rows={3}
              placeholder={t('empNotesPlaceholder')}
              className={INP + ' resize-none'}
            />
          </Field>
        </>
      )}    </div>
  )
}
