/**
 * Unit tests for AddCustomerModal component
 * Tests customer creation modal functionality
 */

// Mock dependencies before imports
vi.mock('../../../utils/ipc')
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  })),
}))
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    language: 'en' as const,
    setLanguage: vi.fn(),
  })),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import AddCustomerModal from '../AddCustomerModal'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'

const mockIpc = {
  customers: {
    getAll: vi.fn(),
    getProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getPurchaseHistory: vi.fn(),
    recalculateTotalSpent: vi.fn(),
  },
}

describe('AddCustomerModal', () => {
  // Setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock IPC
    vi.mocked(ipc).customers = mockIpc.customers
    
    // Setup toast mock return value
    const mockToast = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      showToast: vi.fn(),
    }
    vi.mocked(useToast).mockReturnValue(mockToast)
    
    // Setup language mock return value
    const mockLanguage = {
      t: vi.fn((key: string) => key),
      language: 'en' as const,
      setLanguage: vi.fn(),
    }
    vi.mocked(useLanguage).mockReturnValue(mockLanguage)
  })

  const defaultProps = {
    show: true,
    onClose: vi.fn(),
    onCustomerAdded: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render modal when show is true', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      expect(screen.getByText('addNewCustomer')).toBeInTheDocument()
      expect(screen.getByText('customerNameRequired')).toBeInTheDocument()
      expect(screen.getByText('emailAddress')).toBeInTheDocument()
      expect(screen.getByText('phoneNumberRequired')).toBeInTheDocument()
      expect(screen.getByText('loyaltyTier')).toBeInTheDocument()
    })

    it('should not render modal when show is false', () => {
      render(
          <AddCustomerModal {...defaultProps} show={false} />
      )

      expect(screen.queryByText('addNewCustomer')).not.toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      expect(screen.getByPlaceholderText('enterCustomerName')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('customer@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('+1234567890')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bronze')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      expect(screen.getByText('cancel')).toBeInTheDocument()
      expect(screen.getByText('addCustomerButton')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error for empty name', async () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const form = document.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('nameIsRequired')
      })
      expect(mockIpc.customers.create).not.toHaveBeenCalled()
    })

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const form = document.querySelector('form') as HTMLFormElement

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'invalid-email')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('pleaseEnterValidEmail')
      })
      expect(mockIpc.customers.create).not.toHaveBeenCalled()
    })

    it('should show error for empty phone', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const form = document.querySelector('form') as HTMLFormElement

      await user.type(nameInput, 'John Doe')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('phoneNumberIsRequired')
      })
      expect(mockIpc.customers.create).not.toHaveBeenCalled()
    })

    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(phoneInput, '+1234567890')

      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john@example.com')
      expect(phoneInput).toHaveValue('+1234567890')
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      loyaltyTier: 'Silver' as const,
    }

    it('should submit form successfully', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const loyaltySelect = screen.getByDisplayValue('Bronze')

      await user.type(nameInput, validFormData.name)
      await user.type(emailInput, validFormData.email)
      await user.type(phoneInput, validFormData.phone)
      await user.selectOptions(loyaltySelect, validFormData.loyaltyTier)

      const mockCustomer = { id: '1', ...validFormData, totalSpent: 0 }

      mockIpc.customers.create.mockResolvedValue({
        success: true,
        customer: mockCustomer,
      })

      const submitButton = screen.getByText('addCustomerButton')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockIpc.customers.create).toHaveBeenCalledWith({
          ...validFormData,
          totalSpent: 0,
        })
        expect(vi.mocked(useToast)().success).toHaveBeenCalledWith('customerAddedSuccessfully')
        expect(defaultProps.onCustomerAdded).toHaveBeenCalledWith(mockCustomer)
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })

    it('should handle duplicate customer error', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const loyaltySelect = screen.getByDisplayValue('Bronze')

      await user.type(nameInput, validFormData.name)
      await user.type(emailInput, validFormData.email)
      await user.type(phoneInput, validFormData.phone)
      await user.selectOptions(loyaltySelect, validFormData.loyaltyTier)

      mockIpc.customers.create.mockResolvedValue({
        success: false,
        message: 'Customer already exists',
        existingCustomer: { id: '1', name: 'Existing Customer' },
      })

      const submitButton = screen.getByText('addCustomerButton')
      await user.click(submitButton)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('Customer already exists')
        expect(vi.mocked(useToast)().info).toHaveBeenCalledWith('existingCustomer: Existing Customer')
        expect(defaultProps.onCustomerAdded).not.toHaveBeenCalled()
        expect(defaultProps.onClose).not.toHaveBeenCalled()
      })
    })

    it('should handle API errors', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const loyaltySelect = screen.getByDisplayValue('Bronze')

      await user.type(nameInput, validFormData.name)
      await user.type(emailInput, validFormData.email)
      await user.type(phoneInput, validFormData.phone)
      await user.selectOptions(loyaltySelect, validFormData.loyaltyTier)

      mockIpc.customers.create.mockResolvedValue({
        success: false,
        message: 'Database error',
      })

      const submitButton = screen.getByText('addCustomerButton')
      await user.click(submitButton)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('Database error')
        expect(defaultProps.onCustomerAdded).not.toHaveBeenCalled()
        expect(defaultProps.onClose).not.toHaveBeenCalled()
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const loyaltySelect = screen.getByDisplayValue('Bronze')

      await user.type(nameInput, validFormData.name)
      await user.type(emailInput, validFormData.email)
      await user.type(phoneInput, validFormData.phone)
      await user.selectOptions(loyaltySelect, validFormData.loyaltyTier)

      mockIpc.customers.create.mockRejectedValue(new Error('Network error'))

      const submitButton = screen.getByText('addCustomerButton')
      await user.click(submitButton)

      await waitFor(() => {
        expect(vi.mocked(useToast)().error).toHaveBeenCalledWith('Network error')
        expect(defaultProps.onCustomerAdded).not.toHaveBeenCalled()
        expect(defaultProps.onClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('Modal Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const cancelButton = screen.getByText('cancel')
      await user.click(cancelButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should reset form when modal closes', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const emailInput = screen.getByPlaceholderText('customer@example.com')
      const phoneInput = screen.getByPlaceholderText('+1234567890')

      await user.type(nameInput, 'Test Name')
      await user.type(emailInput, 'test@example.com')
      await user.type(phoneInput, '+1234567890')

      // Simulate form submission to trigger handleClose
      mockIpc.customers.create.mockResolvedValue({
        success: true,
        customer: { id: '1', name: 'Test Name', email: 'test@example.com', phone: '+1234567890', totalSpent: 0 },
      })

      const submitButton = screen.getByText('addCustomerButton')
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled()
      })

      // Form should be reset after successful submission
      expect(nameInput).toHaveValue('')
      expect(emailInput).toHaveValue('')
      expect(phoneInput).toHaveValue('')
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const submitButton = screen.getByText('addCustomerButton')

      await user.type(nameInput, 'John Doe')
      await user.type(phoneInput, '+1234567890')

      // Mock a delayed response
      mockIpc.customers.create.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, customer: { id: '1' } }), 100))
      )

      await user.click(submitButton)

      // Button should show loading text
      expect(screen.getByText('addingCustomer')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByText('addCustomerButton')).toBeInTheDocument()
      })
    })
  })

  describe('Loyalty Tier Selection', () => {
    it('should default to Bronze tier', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const loyaltySelect = screen.getByDisplayValue('Bronze')
      expect(loyaltySelect).toBeInTheDocument()
    })

    it('should allow changing loyalty tier', async () => {
      const user = userEvent.setup()
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const loyaltySelect = screen.getByDisplayValue('Bronze')

      await user.selectOptions(loyaltySelect, 'Gold')

      expect(loyaltySelect).toHaveValue('Gold')
    })

    it('should include all loyalty tiers', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      expect(screen.getByText('Bronze')).toBeInTheDocument()
      expect(screen.getByText('Silver')).toBeInTheDocument()
      expect(screen.getByText('Gold')).toBeInTheDocument()
      expect(screen.getByText('Platinum')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      expect(screen.getByText('customerNameRequired')).toBeInTheDocument()
      expect(screen.getByText('emailAddress')).toBeInTheDocument()
      expect(screen.getByText('phoneNumberRequired')).toBeInTheDocument()
      expect(screen.getByText('loyaltyTier')).toBeInTheDocument()
    })

    it('should have required attributes on required fields', () => {
      render(
          <AddCustomerModal {...defaultProps} />
      )

      const nameInput = screen.getByPlaceholderText('enterCustomerName')
      const phoneInput = screen.getByPlaceholderText('+1234567890')

      expect(nameInput).toBeRequired()
      expect(phoneInput).toBeRequired()
    })
  })
})