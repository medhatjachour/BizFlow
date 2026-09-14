import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import HrAttentionPanel from '../../../renderer/src/pages/Employees/components/HrAttentionPanel'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import type { Employee } from '../../../renderer/src/pages/Employees/types'

/**
 * The attention panel is the one part of the HR page that makes a claim about
 * the business ("these people need a decision"), so it is the part worth
 * pinning down: a false positive trains people to ignore it, and a false
 * negative is the thing it exists to prevent.
 */

const base: Employee = {
  id: 'e1',
  name: 'Sam Rivera',
  role: 'Cashier',
  phone: '000',
  employmentType: 'full-time',
  status: 'active',
  hireDate: '2024-01-01',
  salary: 2000,
  salaryType: 'monthly',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  iban: 'AE000000000000000000000',
  taxId: 'TAX-1',
}

function make(overrides: Partial<Employee>): Employee {
  return { ...base, ...overrides }
}

function renderPanel(employees: Employee[], onOpen = vi.fn()) {
  return render(
    <LanguageProvider>
      <HrAttentionPanel employees={employees} onOpen={onOpen} />
    </LanguageProvider>
  )
}

/** A date N days from today, as the page receives dates from the database. */
function inDays(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

describe('HrAttentionPanel', () => {
  beforeEach(() => {
    window.localStorage.setItem('language', 'en')
    vi.clearAllMocks()
  })

  it('says so plainly when there is nothing to act on', () => {
    renderPanel([make({})])
    expect(screen.getByText(/Nothing needs your attention today/i)).toBeInTheDocument()
  })

  it('flags a contract that lapses inside the warning window', () => {
    renderPanel([make({ contractEndDate: inDays(20) })])
    expect(screen.getByText('Contracts ending')).toBeInTheDocument()
  })

  it('does not flag a contract that is still months away', () => {
    renderPanel([make({ contractEndDate: inDays(200) })])
    expect(screen.queryByText('Contracts ending')).not.toBeInTheDocument()
  })

  it('flags someone who cannot be paid because their bank details are missing', () => {
    renderPanel([make({ iban: null as unknown as string })])
    expect(screen.getByText('Payroll not ready to run')).toBeInTheDocument()
  })

  it('flags missing tax details even when bank details are present', () => {
    renderPanel([make({ taxId: '', socialInsuranceNo: '' })])
    expect(screen.getByText('Payroll not ready to run')).toBeInTheDocument()
  })

  it('flags today’s absence as an exception, not as an error', () => {
    renderPanel([make({ todayAttendance: { status: 'absent' } })])
    expect(screen.getByText('Absent or late today')).toBeInTheDocument()
  })

  it('ignores terminated employees entirely', () => {
    renderPanel([
      make({ status: 'terminated', contractEndDate: inDays(-400), iban: null as unknown as string }),
    ])
    expect(screen.getByText(/Nothing needs your attention today/i)).toBeInTheDocument()
  })

  it('does not nag a small team about line managers, but does for a larger one', () => {
    const small = [make({ id: 'a' }), make({ id: 'b' }), make({ id: 'c' })]
    const { unmount } = renderPanel(small)
    expect(screen.queryByText('No line manager')).not.toBeInTheDocument()
    unmount()

    renderPanel([
      make({ id: 'a' }),
      make({ id: 'b' }),
      make({ id: 'c' }),
      make({ id: 'd' }),
    ])
    expect(screen.getByText('No line manager')).toBeInTheDocument()
  })

  it('expands a signal and opens the employee it names', async () => {
    const onOpen = vi.fn()
    renderPanel([make({ contractEndDate: inDays(10) })], onOpen)

    fireEvent.click(screen.getByText('Contracts ending'))
    const person = await screen.findByText('Sam Rivera')
    fireEvent.click(person)

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('e1'))
  })
})
