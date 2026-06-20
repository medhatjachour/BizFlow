/**
 * Unit tests for DiscountModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DiscountModal from '../../../renderer/src/components/DiscountModal'

describe('DiscountModal', () => {
  const mockOnClose = vi.fn()
  const mockOnApply = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onApply: mockOnApply,
    productName: 'Test Product',
    originalPrice: 100,
    maxDiscountPercentage: 50,
    maxDiscountAmount: 100,
    requireReason: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<DiscountModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /Apply Discount/i })).toBeInTheDocument()
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<DiscountModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('heading', { name: /Apply Discount/i })).not.toBeInTheDocument()
  })

  it('switches between percentage and fixed amount', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const percentageBtn = screen.getByText('Percentage')
    const fixedBtn = screen.getByText('Fixed Amount')
    
    // Initially percentage is selected
    expect(percentageBtn.parentElement).toHaveClass('border-primary')
    
    // Switch to fixed amount
    fireEvent.click(fixedBtn)
    expect(fixedBtn.parentElement).toHaveClass('border-primary')
  })

  it('validates percentage discount exceeding max', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('0')
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } })
    fireEvent.click(applyBtn)
    
    expect(screen.getByText('Discount cannot exceed 50%')).toBeInTheDocument()
    expect(mockOnApply).not.toHaveBeenCalled()
  })

  it('validates fixed discount exceeding max', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const fixedBtn = screen.getByText('Fixed Amount')
    fireEvent.click(fixedBtn)
    
    const input = screen.getByPlaceholderText('0')
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '150' } })
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } })
    fireEvent.click(applyBtn)
    
    expect(screen.getByText('Discount cannot exceed $100.00')).toBeInTheDocument()
    expect(mockOnApply).not.toHaveBeenCalled()
  })

  it('validates discount greater than or equal to price', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const fixedBtn = screen.getByText('Fixed Amount')
    fireEvent.click(fixedBtn)
    
    const input = screen.getByPlaceholderText('0')
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '100' } })
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } })
    fireEvent.click(applyBtn)
    
    expect(screen.getByText('Discount cannot be greater than or equal to the price')).toBeInTheDocument()
    expect(mockOnApply).not.toHaveBeenCalled()
  })

  it('requires reason when requireReason is true', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('0')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(applyBtn)
    
    expect(screen.getByText('Please provide a reason for the discount')).toBeInTheDocument()
    expect(mockOnApply).not.toHaveBeenCalled()
  })

  it('validates discount must be greater than 0', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } })
    
    // Button should be disabled when discount is 0
    expect(applyBtn).toBeDisabled()
  })

  it('calculates percentage discount correctly', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '20' } })
    
    // Check if final price is displayed (100 - 20% = 80)
    expect(screen.getByText(/\$\s*80\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s*20\.00/)).toBeInTheDocument() // savings
  })

  it('calculates fixed discount correctly', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const fixedBtn = screen.getByText('Fixed Amount')
    fireEvent.click(fixedBtn)
    
    const input = screen.getByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '25' } })
    
    // Check if final price is displayed (100 - 25 = 75)
    expect(screen.getByText(/\$\s*75\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s*25\.00/)).toBeInTheDocument() // savings
  })

  it('applies discount successfully with valid data', async () => {
    render(<DiscountModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('0')
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '15' } })
    fireEvent.change(reasonInput, { target: { value: 'Loyal customer' } })
    fireEvent.click(applyBtn)
    
    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith({
        type: 'PERCENTAGE',
        value: 15,
        reason: 'Loyal customer'
      })
    })
  })

  it('closes modal on cancel', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal on X button', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const closeBtn = screen.getByLabelText('Close')
    fireEvent.click(closeBtn)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('allows discount without reason when requireReason is false', async () => {
    render(<DiscountModal {...defaultProps} requireReason={false} />)
    
    const input = screen.getByPlaceholderText('0')
    const applyBtn = screen.getByRole('button', { name: /^Apply Discount$/i })
    
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(applyBtn)
    
    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith({
        type: 'PERCENTAGE',
        value: 10,
        reason: ''
      })
    })
  })

  it('shows character count for reason', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale')
    
    fireEvent.change(reasonInput, { target: { value: 'Test' } })
    expect(screen.getByText(/4.*200/)).toBeInTheDocument()
    
    fireEvent.change(reasonInput, { target: { value: 'A longer reason text' } })
    expect(screen.getByText(/20.*200/)).toBeInTheDocument()
  })

  it('has maxLength attribute of 200 on reason textarea', () => {
    render(<DiscountModal {...defaultProps} />)
    
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale') as HTMLTextAreaElement
    
    expect(reasonInput).toHaveAttribute('maxlength', '200')
  })

  it('resets form when opened', () => {
    const { rerender } = render(<DiscountModal {...defaultProps} isOpen={false} />)
    
    rerender(<DiscountModal {...defaultProps} isOpen={true} />)
    
    const input = screen.getByPlaceholderText('0') as HTMLInputElement
    const reasonInput = screen.getByPlaceholderText('e.g., Customer loyalty, Price match, Clearance sale') as HTMLTextAreaElement
    
    expect(input.value).toBe('0')
    expect(reasonInput.value).toBe('')
  })
})
