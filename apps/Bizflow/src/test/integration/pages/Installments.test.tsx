/**
 * Unit tests for Installments page
 * Tests installment management interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Installments from '../../../renderer/src/pages/Installments'

// Mock dependencies
vi.mock('../../../renderer/src/contexts/ToastContext')
vi.mock('../../../renderer/src/utils/ipc')
vi.mock('../../../renderer/src/components/InstallmentManager')

// Import mocked modules after mocking
import { useToast } from '../../../renderer/src/contexts/ToastContext'
import { InstallmentManager } from '../../../renderer/src/components/InstallmentManager'

const mockUseToast = vi.mocked(useToast)
const mockInstallmentManager = vi.mocked(InstallmentManager)

const mockToast = {
  showToast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

describe('Installments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock implementations
    mockUseToast.mockReturnValue(mockToast)
    mockInstallmentManager.mockImplementation(() => <div data-testid="installment-manager">Installment Manager</div>)
  })

  const renderInstallments = () => {
    return render(
      <BrowserRouter>
        <Installments />
      </BrowserRouter>
    )
  }

  it('renders page title and description', () => {
    renderInstallments()

    expect(screen.getByRole('heading', { level: 1, name: 'Installment Management' })).toBeInTheDocument()
    expect(screen.getByText('Manage customer installments and mark payments as received')).toBeInTheDocument()
  })

  it('renders empty state initially', () => {
    renderInstallments()

    expect(screen.getByRole('heading', { level: 2, name: 'Installment Management' })).toBeInTheDocument()
    expect(screen.getByText('Loading installment management interface...')).toBeInTheDocument()
  })

  it('renders InstallmentManager component', () => {
    renderInstallments()

    expect(screen.getByTestId('installment-manager')).toBeInTheDocument()
  })

  it('passes correct props to InstallmentManager', () => {
    renderInstallments()

    expect(mockInstallmentManager).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function)
      }),
      expect.any(Object)
    )
  })

  it('InstallmentManager onClose callback works', () => {
    renderInstallments()

    // Get the onClose function that was passed to InstallmentManager
    const mockCall = mockInstallmentManager.mock.calls[0]
    const props = mockCall[0]
    const onClose = props.onClose

    // Call onClose - this should work without errors
    expect(() => onClose()).not.toThrow()
  })
})