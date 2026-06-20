import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InstallmentManager } from '../../../renderer/src/components/InstallmentManager'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'

// Mock the IPC module
vi.mock('../../../renderer/src/utils/ipc', () => ({
  ipc: {
    installments: {
      list: vi.fn(),
      getByCustomer: vi.fn(),
      getBySale: vi.fn(),
      markAsPaid: vi.fn()
    }
  }
}))

import { ipc } from '../../../renderer/src/utils/ipc'

// Mock toast context
const mockShowToast = vi.fn()
vi.mock('../../../renderer/src/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>
}))

describe('InstallmentManager', () => {
  const mockInstallments = [
    {
      id: 'inst-1',
      amount: 100.50,
      dueDate: '2025-01-15',
      status: 'pending' as const,
      customerName: 'John Doe',
      customerId: 'cust-1',
      saleId: 'sale-1'
    },
    {
      id: 'inst-2',
      amount: 200.75,
      dueDate: '2025-01-10',
      status: 'paid' as const,
      paidDate: '2025-01-08',
      customerName: 'Jane Smith',
      customerId: 'cust-2',
      saleId: 'sale-2'
    },
    {
      id: 'inst-3',
      amount: 150.25,
      dueDate: '2024-12-01',
      status: 'overdue' as const,
      customerName: 'Bob Johnson',
      customerId: 'cust-3',
      saleId: 'sale-3'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockShowToast.mockClear()
  })

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={false} onClose={() => {}} />
        </ToastProvider>
      )

      expect(screen.queryByText('Installment Manager')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      expect(screen.getByText('Installment Manager')).toBeInTheDocument()
      expect(screen.getByText('0 pending • 0 overdue')).toBeInTheDocument()
    })

    it('loads installments on mount when isOpen is true', async () => {
      ipc.installments.list.mockResolvedValue(mockInstallments)

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(ipc.installments.list).toHaveBeenCalled()
      })
    })

    it('loads installments by customer when customerId is provided', async () => {
      ipc.installments.getByCustomer.mockResolvedValue([mockInstallments[0]])

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} customerId="cust-1" />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(ipc.installments.getByCustomer).toHaveBeenCalledWith('cust-1')
      })
    })

    it('loads installments by sale when transactionId is provided', async () => {
      ipc.installments.getBySale.mockResolvedValue([mockInstallments[0]])

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} transactionId="sale-1" />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(ipc.installments.getBySale).toHaveBeenCalledWith('sale-1')
      })
    })
  })

  describe('Installment Display', () => {
    beforeEach(() => {
      ipc.installments.list.mockResolvedValue(mockInstallments)
    })

    it('displays installments with correct information', async () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('$100.50')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Due: Jan 15, 2025')).toBeInTheDocument()
      })
    })

    it('shows paid date for paid installments', async () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('Paid: Jan 8, 2025'))).toBeInTheDocument()
      })
    })

    it('displays pending and overdue counts correctly', async () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('1 pending • 2 overdue')).toBeInTheDocument()
      })
    })

    it('shows Mark as Paid button only for pending installments', async () => {
      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        const markAsPaidButtons = screen.getAllByText('Mark as Paid')
        expect(markAsPaidButtons).toHaveLength(1) // Only one pending installment
      })
    })
  })

  describe('Filtering', () => {
    beforeEach(() => {
      ipc.installments.list.mockResolvedValue(mockInstallments)
    })

    it('filters by search query - customer name', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by customer name or amount...')
      fireEvent.change(searchInput, { target: { value: 'Jane' } })

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      })
    })

    it('filters by search query - amount', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('$100.50')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by customer name or amount...')
      fireEvent.change(searchInput, { target: { value: '200' } })

      await waitFor(() => {
        expect(screen.getByText('$200.75')).toBeInTheDocument()
        expect(screen.queryByText('$100.50')).not.toBeInTheDocument()
      })
    })

    it('filters by status', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('paid'))

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
      })
    })

    it('combines search and status filters', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Set status filter to pending
      fireEvent.click(screen.getByText('pending'))

      // Search for John
      const searchInput = screen.getByPlaceholderText('Search by customer name or amount...')
      fireEvent.change(searchInput, { target: { value: 'John' } })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
      })
    })
  })

  describe('Mark as Paid', () => {
    beforeEach(() => {
      ipc.installments.list.mockResolvedValue(mockInstallments)
    })

    it('marks installment as paid successfully', async () => {
      const mockMarkAsPaid = vi.mocked(ipc.installments.markAsPaid).mockResolvedValue({ success: true })

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Mark as Paid'))

      await waitFor(() => {
        expect(mockMarkAsPaid).toHaveBeenCalledWith({
          installmentId: 'inst-1',
          paidDate: expect.any(String)
        })
        expect(mockShowToast).toHaveBeenCalledWith('success', 'Installment marked as paid')
      })
    })

    it('handles mark as paid error', async () => {
      const mockMarkAsPaid = vi.mocked(ipc.installments.markAsPaid).mockResolvedValue({
        success: false,
        error: 'Payment failed'
      })

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Mark as Paid'))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to mark installment as paid')
      })
    })

    it('shows loading state while marking as paid', async () => {
      const mockMarkAsPaid = vi.mocked(ipc.installments.markAsPaid).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      })

      const button = screen.getByText('Mark as Paid')
      fireEvent.click(button)

      // Button should be disabled during loading
      expect(button).toBeDisabled()

      await waitFor(() => {
        expect(mockMarkAsPaid).toHaveBeenCalled()
      })
    })
  })

  describe('Loading and Empty States', () => {
    it('shows loading spinner while loading installments', () => {
      ipc.installments.list.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      )

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('shows empty state when no installments found', async () => {
      ipc.installments.list.mockResolvedValue([])

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('No installments found')).toBeInTheDocument()
        expect(screen.getByText('No installments have been created yet')).toBeInTheDocument()
      })
    })

    it('shows filtered empty state message', async () => {
      vi.mocked(ipc.installments.list).mockResolvedValue(mockInstallments)

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Apply search that matches nothing
      const searchInput = screen.getByPlaceholderText('Search by customer name or amount...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      await waitFor(() => {
        expect(screen.getByText('No installments found')).toBeInTheDocument()
        expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ipc.installments.list.mockRejectedValue(new Error('Network error'))

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to load installments: Error: Network error')
        expect(consoleSpy).toHaveBeenCalledWith('Error loading installments:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('handles mark as paid network error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ipc.installments.list.mockResolvedValue(mockInstallments)
      ipc.installments.markAsPaid.mockRejectedValue(new Error('Network error'))

      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Mark as Paid'))

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to mark installment as paid')
        expect(consoleSpy).toHaveBeenCalledWith('Error marking installment as paid:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Status Styling', () => {
    beforeEach(() => {
      ipc.installments.list.mockResolvedValue(mockInstallments)
    })

    it('applies correct styling for paid installments', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        const paidCard = screen.getByText('$200.75').parentElement?.parentElement?.parentElement?.parentElement
        expect(paidCard).toHaveClass('bg-green-50', 'dark:bg-green-900/10', 'border-green-200')
      })
    })

    it('applies correct styling for overdue installments', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        const overdueCard = screen.getByText('$150.25').parentElement?.parentElement?.parentElement?.parentElement
        expect(overdueCard).toHaveClass('bg-red-50', 'dark:bg-red-900/10', 'border-red-200')
      })
    })

    it('applies correct styling for pending installments', async () => {
      render(<InstallmentManager isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        const pendingCard = screen.getByText('$100.50').parentElement?.parentElement?.parentElement?.parentElement
        expect(pendingCard).toHaveClass('bg-red-50', 'dark:bg-red-900/10', 'border-red-200')
      })
    })
  })

  describe('Dialog Actions', () => {
    it('calls onClose when close button is clicked', () => {
      const mockOnClose = vi.fn()

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={mockOnClose} />
        </ToastProvider>
      )

      fireEvent.click(screen.getAllByRole('button')[0])

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('reloads data when reopened', async () => {
      const mockList = ipc.installments.list
      mockList.mockResolvedValueOnce([]).mockResolvedValueOnce(mockInstallments)

      const { rerender } = render(
        <ToastProvider>
          <InstallmentManager isOpen={false} onClose={() => {}} />
        </ToastProvider>
      )

      // Reopen
      rerender(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Customer Name Handling', () => {
    it('uses provided customerName when loading by customer', async () => {
      ipc.installments.getByCustomer.mockResolvedValue([
        { ...mockInstallments[0], customerName: undefined }
      ])

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} customerId="cust-1" customerName="Provided Name" />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Provided Name')).toBeInTheDocument()
      })
    })

    it('falls back to Unknown Customer when no name available', async () => {
      ipc.installments.list.mockReset()
      ipc.installments.list.mockResolvedValue([
        { ...mockInstallments[0], customerName: undefined }
      ])

      render(
        <ToastProvider>
          <InstallmentManager isOpen={true} onClose={() => {}} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
      })
    })
  })
})