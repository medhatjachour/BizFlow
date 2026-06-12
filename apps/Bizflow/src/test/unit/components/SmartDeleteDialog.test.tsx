import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SmartDeleteDialog from '../../../renderer/src/components/SmartDeleteDialog'

describe('SmartDeleteDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    entityType: 'product' as const,
    entityName: 'Test Product',
    checkResult: {
      canDelete: true,
      message: 'This product can be safely deleted.',
      suggestedAction: 'DELETE' as const
    },
    onDelete: vi.fn(),
    onArchive: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<SmartDeleteDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
    })

    it('does not render when checkResult is null', () => {
      render(<SmartDeleteDialog {...defaultProps} checkResult={null} />)

      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
    })

    it('renders delete confirmation dialog when canDelete is true', () => {
      render(<SmartDeleteDialog {...defaultProps} />)

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Product:'))).toBeInTheDocument()
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('This product can be safely deleted.')).toBeInTheDocument()
      expect(screen.getByText('Permanently Delete')).toBeInTheDocument()
    })

    it('renders cannot delete dialog when canDelete is false', () => {
      const checkResult = {
        canDelete: false,
        message: 'This product cannot be deleted because it has dependencies.',
        suggestedAction: 'ARCHIVE' as const,
        dependencies: {
          sales: 5,
          stock: 10
        }
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.getByText('Cannot Delete')).toBeInTheDocument()
      expect(screen.getByText('This product cannot be deleted because it has dependencies.')).toBeInTheDocument()
      expect(screen.getByText('5 sale(s)')).toBeInTheDocument()
      expect(screen.getByText('10 items in stock')).toBeInTheDocument()
    })

    it('shows different entity type labels', () => {
      render(<SmartDeleteDialog {...defaultProps} entityType="customer" />)

      expect(screen.getByText((content) => content.includes('Customer'))).toBeInTheDocument()
      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })

    it('shows user entity type correctly', () => {
      render(<SmartDeleteDialog {...defaultProps} entityType="user" />)

      expect(screen.getByText((content) => content.includes('User'))).toBeInTheDocument()
      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })
  })

  describe('Dependencies Display', () => {
    it('shows all dependency types', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete due to dependencies.',
        suggestedAction: 'ARCHIVE' as const,
        dependencies: {
          transactions: 3,
          sales: 5,
          stock: 10,
          refunds: 2,
          variants: 4
        }
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.getByText('Dependencies Found:')).toBeInTheDocument()
      expect(screen.getByText('3 transaction(s)')).toBeInTheDocument()
      expect(screen.getByText('5 sale(s)')).toBeInTheDocument()
      expect(screen.getByText('10 items in stock')).toBeInTheDocument()
      expect(screen.getByText('2 refund(s)')).toBeInTheDocument()
      expect(screen.getByText('4 variant(s)')).toBeInTheDocument()
    })

    it('only shows non-zero dependencies', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const,
        dependencies: {
          sales: 0,
          stock: 5,
          refunds: 0
        }
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.getByText('5 items in stock')).toBeInTheDocument()
      expect(screen.queryByText('sale(s)')).not.toBeInTheDocument()
      expect(screen.queryByText('refund(s)')).not.toBeInTheDocument()
    })

    it('does not show dependencies section when no dependencies', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'CANCEL' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.queryByText('Dependencies Found:')).not.toBeInTheDocument()
    })
  })

  describe('Archive Functionality', () => {
    it('shows archive option when canDelete is false and suggestedAction is ARCHIVE', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.getByText('Archive Instead')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/No longer selling/)).toBeInTheDocument()
    })

    it('shows deactivate for user entities', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete user.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} entityType="user" checkResult={checkResult} />)

      expect(screen.getByText('Deactivate Instead')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Employee left/)).toBeInTheDocument()
    })

    it('calls onArchive with reason when archive button is clicked', async () => {
      const mockOnArchive = vi.fn().mockResolvedValue(undefined)
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const textarea = screen.getByPlaceholderText(/No longer selling/)
      fireEvent.change(textarea, { target: { value: 'Test reason' } })

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalledWith('Test reason')
      })
    })

    it('calls onArchive without reason when textarea is empty', async () => {
      const mockOnArchive = vi.fn().mockResolvedValue(undefined)
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalledWith(undefined)
      })
    })
  })

  describe('Delete Functionality', () => {
    it('shows delete button when canDelete is true', () => {
      render(<SmartDeleteDialog {...defaultProps} />)

      expect(screen.getByText('Permanently Delete')).toBeInTheDocument()
    })

    it('calls onDelete when delete button is clicked', async () => {
      const mockOnDelete = vi.fn().mockResolvedValue(undefined)

      render(<SmartDeleteDialog {...defaultProps} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByText('Permanently Delete')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled()
      })
    })

    it('does not show delete button when canDelete is false', () => {
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'CANCEL' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} />)

      expect(screen.queryByText('Permanently Delete')).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner and disables buttons during delete operation', async () => {
      const mockOnDelete = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<SmartDeleteDialog {...defaultProps} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByText('Permanently Delete')
      fireEvent.click(deleteButton)

      // Should show loading state
      expect(screen.getByRole('button', { name: /permanently delete/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled()
      })
    })

    it('shows loading spinner during archive operation', async () => {
      const mockOnArchive = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      expect(screen.getByRole('button', { name: /archive instead/i })).toBeDisabled()

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalled()
      })
    })
  })

  describe('Dialog Actions', () => {
    it('calls onClose when close button is clicked', () => {
      const mockOnClose = vi.fn()

      render(<SmartDeleteDialog {...defaultProps} onClose={mockOnClose} />)

      // Find the close button (X button in top right) - it's the first button in the dialog
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[0] // The close button is the first button
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when cancel button is clicked', () => {
      const mockOnClose = vi.fn()

      render(<SmartDeleteDialog {...defaultProps} onClose={mockOnClose} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose after successful delete', async () => {
      const mockOnClose = vi.fn()
      const mockOnDelete = vi.fn().mockResolvedValue(undefined)

      render(<SmartDeleteDialog {...defaultProps} onClose={mockOnClose} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByText('Permanently Delete')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('calls onClose after successful archive', async () => {
      const mockOnClose = vi.fn()
      const mockOnArchive = vi.fn().mockResolvedValue(undefined)
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onClose={mockOnClose} onArchive={mockOnArchive} />)

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('clears archive reason after successful archive', async () => {
      const mockOnArchive = vi.fn().mockResolvedValue(undefined)
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const textarea = screen.getByPlaceholderText(/No longer selling/)
      fireEvent.change(textarea, { target: { value: 'Test reason' } })

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      await waitFor(() => {
        expect(textarea).toHaveValue('')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles delete errors gracefully', async () => {
      const mockOnDelete = vi.fn().mockRejectedValue(new Error('Delete failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<SmartDeleteDialog {...defaultProps} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByText('Permanently Delete')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Delete failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('handles archive errors gracefully', async () => {
      const mockOnArchive = vi.fn().mockRejectedValue(new Error('Archive failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Archive failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper button roles and labels', () => {
      render(<SmartDeleteDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /permanently delete/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('disables textarea during loading', async () => {
      const mockOnArchive = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      const checkResult = {
        canDelete: false,
        message: 'Cannot delete.',
        suggestedAction: 'ARCHIVE' as const
      }

      render(<SmartDeleteDialog {...defaultProps} checkResult={checkResult} onArchive={mockOnArchive} />)

      const archiveButton = screen.getByText('Archive Instead')
      fireEvent.click(archiveButton)

      const textarea = screen.getByPlaceholderText(/No longer selling/)
      expect(textarea).toBeDisabled()

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalled()
      })
    })
  })
})