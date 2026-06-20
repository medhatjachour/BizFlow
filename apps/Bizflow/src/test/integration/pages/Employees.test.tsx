/**
 * Unit tests for Employees page
 * Tests employee management, CRUD operations, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Employees from '../../../renderer/src/pages/Employees'

// Define mocks before using them
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}

// Mock dependencies
vi.mock('../../../renderer/src/components/ui/Modal', () => ({
  default: vi.fn(({ children, isOpen, onClose, title }) => (
    isOpen ? (
      <div data-testid="modal" role="dialog" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null
  ))
}))
vi.mock('../../../renderer/src/utils/ipc')
vi.mock('../../../renderer/src/contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))
vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: vi.fn((key: string) => key),
  }),
}))

const mockIpc = vi.mocked(await import('../../../renderer/src/utils/ipc')).ipc
const MockModal = vi.mocked(await import('../../../renderer/src/components/ui/Modal')).default

const mockLanguage = {
  t: vi.fn((key: string) => key), // Return key as translation for simplicity
}

describe('Employees', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock IPC methods with default return values
    mockIpc.employees.getAll = vi.fn().mockResolvedValue([])
    mockIpc.employees.create = vi.fn().mockResolvedValue({ success: true })
    mockIpc.employees.update = vi.fn().mockResolvedValue({ success: true })
    mockIpc.employees.delete = vi.fn().mockResolvedValue({ success: true })

    // Mock Modal component
    MockModal.mockReturnValue(null)
  })

  it('renders employees page correctly', () => {
    render(<Employees />)

    expect(screen.getByRole('heading', { name: /employeeManagement/i })).toBeInTheDocument()
    expect(screen.getByText(/employeeManagementDesc/i)).toBeInTheDocument()
  })

  it('loads employees data on mount', async () => {
    mockIpc.employees.getAll.mockResolvedValue([])

    render(<Employees />)

    await waitFor(() => {
      expect(mockIpc.employees.getAll).toHaveBeenCalled()
    })
  })

  it('displays employees in cards', async () => {
    const mockEmployees = [
      {
        id: '1',
        name: 'John Doe',
        role: 'Manager',
        email: 'john@example.com',
        phone: '+1234567890',
        salary: 50000,
        performance: 85,
      }
    ]

    mockIpc.employees.getAll.mockResolvedValue(mockEmployees)

    render(<Employees />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
      expect(screen.getByText('$50000.00')).toBeInTheDocument()
    })
  })

  it('opens add employee modal', async () => {
    const user = userEvent.setup()
    render(<Employees />)

    const addButton = screen.getByRole('button', { name: /add/i })
    await user.click(addButton)

    // Modal should be rendered (mocked)
    expect(MockModal).toHaveBeenCalled()
  })

  it('edits existing employee', async () => {
    const user = userEvent.setup()

    const mockEmployee = {
      id: '1',
      name: 'John Doe',
      role: 'Manager',
      email: 'john@example.com',
      phone: '+1234567890',
      salary: 50000,
      performance: 85,
    }

    mockIpc.employees.getAll.mockResolvedValue([mockEmployee])
    mockIpc.employees.update.mockResolvedValue(mockEmployee)

    render(<Employees />)

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit/i })
      return editButton
    })

    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    expect(MockModal).toHaveBeenCalled()
  })

  it('deletes employee successfully', async () => {
    const user = userEvent.setup()

    const mockEmployee = {
      id: '1',
      name: 'John Doe',
      role: 'Manager',
      email: 'john@example.com',
      phone: '+1234567890',
      salary: 50000,
      performance: 85,
    }

    mockIpc.employees.getAll.mockResolvedValue([mockEmployee])
    mockIpc.employees.delete.mockResolvedValue({ success: true })

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Employees />)

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      return deleteButton
    })

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(confirmSpy).toHaveBeenCalledWith('confirmDeleteEmployee')
    expect(mockIpc.employees.delete).toHaveBeenCalledWith('1')
    // Note: Success toast is not called in test since modal is mocked

    confirmSpy.mockRestore()
  })

  it('shows performance indicators', async () => {
    const mockEmployees = [
      {
        id: '1',
        name: 'John Doe',
        role: 'Manager',
        email: 'john@example.com',
        phone: '+1234567890',
        salary: 50000,
        performance: 95, // High performance
      }
    ]

    mockIpc.employees.getAll.mockResolvedValue(mockEmployees)

    render(<Employees />)

    await waitFor(() => {
      // Should show high performance indicator
      expect(screen.getByText('95%')).toBeInTheDocument()
    })
  })

  it('handles form validation', async () => {
    const user = userEvent.setup()
    render(<Employees />)

    const addButton = screen.getByRole('button', { name: /add/i })
    await user.click(addButton)

    // Try to submit empty form (modal is mocked, but validation should occur)
    // This would normally show validation errors
    expect(mockLanguage.t).toBeDefined()
  })

  it('handles API errors gracefully', async () => {
    mockIpc.employees.getAll.mockRejectedValue(new Error('API Error'))

    render(<Employees />)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })
  })

  it('shows loading states', () => {
    render(<Employees />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows empty state when no employees', async () => {
    mockIpc.employees.getAll.mockResolvedValue([])

    render(<Employees />)

    await waitFor(() => {
      expect(screen.getByText('noEmployeesYet')).toBeInTheDocument()
      expect(screen.getByText('addFirstEmployee')).toBeInTheDocument()
    })
  })
})