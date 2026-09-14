import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import LifecycleTab from '../../../renderer/src/pages/Employees/components/LifecycleTab'
import ApprovalsInbox from '../../../renderer/src/pages/Employees/components/ApprovalsInbox'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { AuthProvider } from '../../../renderer/src/contexts/AuthContext'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
import type { EmployeeProfile } from '../../../renderer/src/pages/Employees/types'

/**
 * Smoke coverage for the two lifecycle screens.
 *
 * These exist mainly to prove the modules load and render — a broken import or a
 * transform error in either file otherwise only shows up when the dev server
 * starts, which is a slow and confusing way to find out.
 */

function profile(overrides: Partial<EmployeeProfile> = {}): EmployeeProfile {
  return {
    id: 'e1',
    name: 'Sam Rivera',
    role: 'Cashier',
    phone: '000',
    employmentType: 'full-time',
    status: 'active',
    hireDate: '2025-01-06',
    salary: 2400,
    salaryType: 'monthly',
    createdAt: '2025-01-06',
    updatedAt: '2025-01-06',
    attendance: [],
    documents: [],
    activityLogs: [],
    payrollRecords: [],
    shifts: [],
    overtimeRecords: [],
    leaveRecords: [],
    checklistItems: [],
    attendanceSummary: { total: 0, present: 0, absent: 0, late: 0, onLeave: 0, rate: 0 },
    leaveBalance: { allowance: 21, taken: 0, pending: 0, remaining: 21 },
    ...overrides,
  } as EmployeeProfile
}

function item(overrides: Partial<EmployeeProfile['checklistItems'][number]>) {
  return {
    id: 'c1',
    employeeId: 'e1',
    phase: 'onboarding' as const,
    title: 'Bank account / IBAN recorded',
    category: 'payroll' as const,
    required: true,
    completed: false,
    sortOrder: 0,
    createdAt: '2025-01-06',
    updatedAt: '2025-01-06',
    ...overrides,
  }
}

function renderWithProviders(node: React.ReactNode) {
  return render(
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>{node}</ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

describe('LifecycleTab', () => {
  beforeEach(() => {
    window.localStorage.setItem('language', 'en')
    vi.clearAllMocks()
  })

  it('offers to start onboarding when there is no list yet', () => {
    renderWithProviders(<LifecycleTab emp={profile()} onChanged={vi.fn()} />)
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
    expect(screen.getByText('Start onboarding')).toBeInTheDocument()
    // Nothing has begun, so there is nothing to close either.
    expect(screen.getByText('Start offboarding')).toBeInTheDocument()
  })

  it('shows progress and flags the required tasks still open', () => {
    renderWithProviders(
      <LifecycleTab
        emp={profile({
          checklistItems: [
            item({ id: 'c1', completed: true }),
            item({ id: 'c2', title: 'Tax number recorded' }),
          ],
        })}
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByText('1 required task(s) still open')).toBeInTheDocument()
    expect(screen.getByText('Bank account / IBAN recorded')).toBeInTheDocument()
    expect(screen.getByText('Tax number recorded')).toBeInTheDocument()
  })

  it('reports all required tasks done when the list is complete', () => {
    renderWithProviders(
      <LifecycleTab
        emp={profile({ checklistItems: [item({ completed: true })] })}
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText('All required tasks are complete')).toBeInTheDocument()
  })

  it('does not treat an optional task left open as an incomplete list', () => {
    renderWithProviders(
      <LifecycleTab
        emp={profile({
          checklistItems: [item({ id: 'c1', required: false, title: 'Hold the exit interview' })],
        })}
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText('All required tasks are complete')).toBeInTheDocument()
  })

  it('surfaces the probation deadline', () => {
    // Anchored to midnight: `daysUntil` floors *today* to midnight, so a fixture
    // carrying the current time of day reads as one day more than intended.
    const soon = new Date()
    soon.setHours(0, 0, 0, 0)
    soon.setDate(soon.getDate() + 10)
    renderWithProviders(
      <LifecycleTab emp={profile({ probationEndDate: soon.toISOString() })} onChanged={vi.fn()} />
    )
    expect(screen.getByText(/Probation/)).toBeInTheDocument()
    expect(screen.getByText(/10 days of probation left/)).toBeInTheDocument()
  })

  it('shows an in-progress offboarding with its exit details', () => {
    renderWithProviders(
      <LifecycleTab
        emp={profile({
          lastWorkingDate: '2026-04-30',
          exitReason: 'resignation',
          rehireEligible: true,
          checklistItems: [item({ id: 'c9', phase: 'offboarding', title: 'Collect laptop, phone and tools' })],
        })}
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText('Last working day')).toBeInTheDocument()
    expect(screen.getByText('Resignation')).toBeInTheDocument()
    expect(screen.getByText('Collect laptop, phone and tools')).toBeInTheDocument()
  })
})

describe('ApprovalsInbox', () => {
  beforeEach(() => {
    window.localStorage.setItem('language', 'en')
    vi.clearAllMocks()
  })

  it('says so plainly when nothing is waiting', async () => {
    renderWithProviders(<ApprovalsInbox onOpen={vi.fn()} />)
    expect(await screen.findByText('Waiting on you')).toBeInTheDocument()
    expect(await screen.findByText('Nothing is waiting on a decision.')).toBeInTheDocument()
  })
})
