/**
 * What needs attention today.
 *
 * HR is not a directory of cards — it is a list of things that will bite you if
 * nobody looks: a contract that lapses, an ID document that expires, a person
 * who cannot be paid because their bank details were never entered, someone
 * absent with no explanation.
 *
 * Every signal here is derived from data the page already loads, so it costs no
 * extra queries and cannot disagree with the employee records it points at.
 */

import { useState } from 'react'
import {
  AlertTriangle,
  BadgeAlert,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  FileText,
  ListChecks,
  LogOut,
  UserMinus,
  Wallet,
} from 'lucide-react'

import { useLanguage } from '../../../contexts/LanguageContext'
import { daysUntil } from '../expiry'
import type { Employee } from '../types'

interface Props {
  employees: Employee[]
  onOpen: (employeeId: string) => void
}

type Severity = 'bad' | 'warn' | 'info'

interface Signal {
  id: string
  title: string
  hint: string
  severity: Severity
  icon: React.ElementType
  people: { id: string; name: string; detail: string }[]
}

const SEVERITY_STYLES: Record<Severity, { pill: string; ring: string }> = {
  bad: {
    pill: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    ring: 'border-rose-200 dark:border-rose-900/60',
  },
  warn: {
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ring: 'border-amber-200 dark:border-amber-900/60',
  },
  info: {
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    ring: 'border-sky-200 dark:border-sky-900/60',
  },
}

export default function HrAttentionPanel({ employees, onOpen }: Props) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState<string | null>(null)

  // A terminated employee is history: none of these checks apply to them.
  const current = employees.filter((employee) => employee.status !== 'terminated')

  const dateDetail = (date: string | null | undefined): string => {
    const days = daysUntil(date)
    if (days === null) return ''
    if (days < 0) return t('hrAttnExpiredAgo', { days: Math.abs(days) })
    return t('hrAttnInDays', { days })
  }

  const soonOrPast = (
    date: string | null | undefined,
    thresholdDays: number
  ): boolean => {
    const days = daysUntil(date)
    return days !== null && days <= thresholdDays
  }

  const candidates: Signal[] = [
    {
      id: 'contracts',
      title: t('hrAttnContractsEnding'),
      hint: t('hrAttnContractsHint'),
      severity: 'bad',
      icon: CalendarClock,
      people: current
        .filter((employee) => soonOrPast(employee.contractEndDate, 60))
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: dateDetail(employee.contractEndDate),
        })),
    },
    {
      id: 'documents',
      title: t('hrAttnIdsExpiring'),
      hint: t('hrAttnIdsHint'),
      severity: 'warn',
      icon: FileText,
      people: current
        .filter((employee) => soonOrPast(employee.idExpiryDate, 60))
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: dateDetail(employee.idExpiryDate),
        })),
    },
    {
      id: 'payroll',
      title: t('hrAttnPayrollNotReady'),
      hint: t('hrAttnPayrollHint'),
      severity: 'warn',
      icon: Wallet,
      people: current
        .filter((employee) => !employee.iban?.trim() || !(employee.taxId?.trim() || employee.socialInsuranceNo?.trim()))
        .map((employee) => {
          const missing: string[] = []
          if (!employee.iban?.trim()) missing.push(t('hrAttnMissingBank'))
          if (!(employee.taxId?.trim() || employee.socialInsuranceNo?.trim())) {
            missing.push(t('hrAttnMissingTax'))
          }
          return {
            id: employee.id,
            name: employee.name,
            detail: t('hrAttnMissing', { list: missing.join(t('hrAttnMissingSep')) }),
          }
        }),
    },
    {
      id: 'attendance',
      title: t('hrAttnAbsentOrLate'),
      hint: t('hrAttnAbsentHint'),
      severity: 'info',
      icon: UserMinus,
      people: current
        .filter((employee) => {
          const status = employee.todayAttendance?.status
          return status === 'absent' || status === 'late'
        })
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail:
            employee.todayAttendance?.status === 'late' ? t('hrAttnLate') : t('hrAttnAbsent'),
        })),
    },
    {
      id: 'reporting',
      title: t('hrAttnNoManager'),
      hint: t('hrAttnNoManagerHint'),
      severity: 'info',
      icon: BadgeAlert,
      // Noise on a two-person team: there is nobody sensible to assign.
      people:
        current.length > 3
          ? current
              .filter((employee) => !employee.managerId)
              .map((employee) => ({
                id: employee.id,
                name: employee.name,
                detail: employee.role,
              }))
          : [],
    },
    {
      id: 'probation',
      title: t('hrAttnProbationEnding'),
      hint: t('hrAttnProbationHint'),
      severity: 'warn',
      icon: CalendarClock,
      people: current
        .filter((employee) => {
          const days = daysUntil(employee.probationEndDate)
          return days !== null && days <= 30
        })
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: dateDetail(employee.probationEndDate),
        })),
    },
    {
      id: 'onboarding',
      title: t('hrAttnOnboardingIncomplete'),
      hint: t('hrAttnOnboardingHint'),
      severity: 'info',
      icon: ListChecks,
      people: current
        .filter((employee) => (employee._count?.checklistItems ?? 0) > 0)
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: t('hrAttnTasksLeft', { count: employee._count?.checklistItems ?? 0 }),
        })),
    },
    {
      id: 'offboarding',
      title: t('hrAttnOffboardingOpen'),
      hint: t('hrAttnOffboardingHint'),
      severity: 'bad',
      icon: LogOut,
      people: current
        .filter((employee) => {
          const days = daysUntil(employee.lastWorkingDate)
          return days !== null && days <= 0
        })
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          detail: dateDetail(employee.lastWorkingDate),
        })),
    },
  ]

  // Only surface a bucket when somebody is actually in it.
  const signals = candidates.filter((signal) => signal.people.length > 0)

  if (!signals.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          {t('hrAttnAllClear')}
        </p>
      </div>
    )
  }

  const total = signals.reduce((sum, signal) => sum + signal.people.length, 0)

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('hrAttnTitle')}
          </h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {total}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t('hrAttnSubtitle')}
        </p>
      </header>

      <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {signals.map((signal) => {
          const Icon = signal.icon
          const open = expanded === signal.id
          const style = SEVERITY_STYLES[signal.severity]
          return (
            <li key={signal.id}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : signal.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${style.pill}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{signal.title}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${style.pill}`}>
                      {signal.people.length}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{signal.hint}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {open ? (
                <ul className="space-y-1 px-4 pb-3 ps-14">
                  {signal.people.map((person) => (
                    <li key={`${signal.id}-${person.id}`}>
                      <button
                        type="button"
                        onClick={() => onOpen(person.id)}
                        className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-start text-sm transition hover:border-primary/40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-100">{person.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{person.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
