import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Pagination from '../../../renderer/src/components/Pagination'

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
    totalItems: 50,
    itemsPerPage: 10,
    itemName: 'items'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders pagination controls when totalPages > 1', () => {
      render(<Pagination {...defaultProps} />)

      // Check that the range display and pagination nav are present
      expect(screen.getAllByText('1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('10').length).toBeGreaterThan(0)
      expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    })

    it('does not render when totalPages <= 1', () => {
      render(<Pagination {...defaultProps} totalPages={1} />)

      expect(screen.queryByText('Showing')).not.toBeInTheDocument()
    })

    it('displays correct item range for first page', () => {
      render(<Pagination {...defaultProps} />)

      // Check that the range numbers are displayed
      const rangeElements = screen.getAllByText('1')
      expect(rangeElements.length).toBeGreaterThan(0)
      const tenElements = screen.getAllByText('10')
      expect(tenElements.length).toBeGreaterThan(0)
    })

    it('displays correct item range for middle page', () => {
      render(<Pagination {...defaultProps} currentPage={3} />)

      const twentyOneElements = screen.getAllByText('21')
      expect(twentyOneElements.length).toBeGreaterThan(0)
      const thirtyElements = screen.getAllByText('30')
      expect(thirtyElements.length).toBeGreaterThan(0)
    })

    it('displays correct item range for last page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />)

      const fortyOneElements = screen.getAllByText('41')
      expect(fortyOneElements.length).toBeGreaterThan(0)
      const fiftyElements = screen.getAllByText('50')
      expect(fiftyElements.length).toBeGreaterThan(1) // Should appear in range and total
    })

    it('displays correct item range when last page is partial', () => {
      render(<Pagination {...defaultProps} totalItems={47} currentPage={5} />)

      const fortyOneElements = screen.getAllByText('41')
      expect(fortyOneElements.length).toBeGreaterThan(0)
      const fortySevenElements = screen.getAllByText('47')
      expect(fortySevenElements.length).toBeGreaterThan(1) // Should appear in range and total
    })

    it('uses custom item name', () => {
      render(<Pagination {...defaultProps} itemName="products" />)

      expect(screen.getByText((content) => content.includes('products'))).toBeInTheDocument()
    })
  })

  describe('Page Navigation', () => {
    it('calls onPageChange with previous page when Previous button is clicked', () => {
      const mockOnPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={3} onPageChange={mockOnPageChange} />)

      // Click the desktop Previous button (with sr-only text)
      const prevButtons = screen.getAllByText('Previous')
      fireEvent.click(prevButtons[0]) // Desktop version

      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange with next page when Next button is clicked', () => {
      const mockOnPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={2} onPageChange={mockOnPageChange} />)

      // Click the desktop Next button (with sr-only text)
      const nextButtons = screen.getAllByText('Next')
      fireEvent.click(nextButtons[0]) // Desktop version

      expect(mockOnPageChange).toHaveBeenCalledWith(3)
    })

    it('calls onPageChange with clicked page number', () => {
      const mockOnPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={mockOnPageChange} />)

      fireEvent.click(screen.getByText('3'))

      expect(mockOnPageChange).toHaveBeenCalledWith(3)
    })
  })

  describe('Button States', () => {
    it('disables Previous button on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />)

      // Get the Previous buttons (should be 2: mobile and desktop)
      const prevButtons = screen.getAllByRole('button', { name: /previous/i })
      expect(prevButtons).toHaveLength(2)
      prevButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('disables Next button on last page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />)

      // Get the Next buttons (should be 2: mobile and desktop)
      const nextButtons = screen.getAllByRole('button', { name: /next/i })
      expect(nextButtons).toHaveLength(2)
      nextButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('enables both buttons on middle pages', () => {
      render(<Pagination {...defaultProps} currentPage={3} />)

      const prevButtons = screen.getAllByRole('button', { name: /previous/i })
      const nextButtons = screen.getAllByRole('button', { name: /next/i })

      prevButtons.forEach(button => {
        expect(button).not.toBeDisabled()
      })
      nextButtons.forEach(button => {
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Page Numbers Display', () => {
    it('shows all pages when totalPages <= 5', () => {
      render(<Pagination {...defaultProps} totalPages={4} />)

      // Check for page buttons specifically
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
    })

    it('shows ellipsis and limited pages when totalPages > 5', () => {
      render(<Pagination {...defaultProps} totalPages={10} currentPage={5} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getAllByText('...')).toHaveLength(2) // Should have 2 ellipsis elements
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })

    it('shows correct ellipsis pattern at start', () => {
      render(<Pagination {...defaultProps} totalPages={10} currentPage={2} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
      expect(screen.getAllByText('...')).toHaveLength(1)
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })

    it('shows correct ellipsis pattern at end', () => {
      render(<Pagination {...defaultProps} totalPages={10} currentPage={9} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getAllByText('...')).toHaveLength(1)
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })
  })

  describe('Mobile View', () => {
    it('shows both mobile and desktop views', () => {
      render(<Pagination {...defaultProps} />)

      // Both mobile and desktop Previous/Next buttons should be present
      expect(screen.getAllByText('Previous')).toHaveLength(2)
      expect(screen.getAllByText('Next')).toHaveLength(2)

      // Desktop pagination nav should also be present
      expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles currentPage > totalPages gracefully', () => {
      render(<Pagination {...defaultProps} currentPage={10} totalPages={5} />)

      // Component shows calculated range even if page is out of bounds
      const ninetyOneElements = screen.getAllByText('91')
      expect(ninetyOneElements.length).toBeGreaterThan(0)
      const fiftyElements = screen.getAllByText('50')
      expect(fiftyElements.length).toBeGreaterThan(1)
    })

    it('handles currentPage < 1 gracefully', () => {
      render(<Pagination {...defaultProps} currentPage={0} />)

      // Component shows calculated range even if page is out of bounds
      const negativeNineElements = screen.getAllByText('-9')
      expect(negativeNineElements.length).toBeGreaterThan(0)
      const zeroElements = screen.getAllByText('0')
      expect(zeroElements.length).toBeGreaterThan(0)
    })

    it('handles zero totalItems', () => {
      render(<Pagination {...defaultProps} totalItems={0} />)

      const oneElements = screen.getAllByText('1')
      expect(oneElements.length).toBeGreaterThan(0)
      const zeroElements = screen.getAllByText('0')
      expect(zeroElements.length).toBeGreaterThan(1) // Should appear in range and total
    })

    it('handles large page numbers correctly', () => {
      render(<Pagination {...defaultProps} currentPage={100} totalPages={200} totalItems={10000} />)

      const nineNineOneElements = screen.getAllByText('991')
      expect(nineNineOneElements.length).toBeGreaterThan(0)
      const oneThousandElements = screen.getAllByText('1000')
      expect(oneThousandElements.length).toBeGreaterThan(0)
      expect(screen.getByText('10000')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    })

    it('has screen reader only text for navigation buttons', () => {
      render(<Pagination {...defaultProps} />)

      // Check that sr-only spans exist (though they may not be visible to getByText)
      const srOnlyElements = document.querySelectorAll('.sr-only')
      const srOnlyTexts = Array.from(srOnlyElements).map(el => el.textContent)
      expect(srOnlyTexts).toContain('Previous')
      expect(srOnlyTexts).toContain('Next')
    })
  })
})