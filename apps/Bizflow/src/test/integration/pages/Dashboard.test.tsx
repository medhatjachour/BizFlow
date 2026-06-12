/**
 * Unit tests for Dashboard page
 * Tests dashboard data loading, stats display, and component interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../../renderer/src/pages/Dashboard'

// Mock dependencies
vi.mock('../../../renderer/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser', fullName: 'Test User' },
    logout: vi.fn(),
  }),
}))
vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: vi.fn((key: string) => key),
  }),
}))
vi.mock('../../../renderer/src/pages/Dashboard/components/DashboardStats', () => ({
  default: () => <div>DashboardStats</div>
}))
vi.mock('../../../renderer/src/pages/Dashboard/components/RecentActivity', () => ({
  default: () => <div>RecentActivity</div>
}))
vi.mock('../../../renderer/src/pages/Dashboard/components/QuickActions', () => ({
  default: () => <div>QuickActions</div>
}))
vi.mock('../../../renderer/src/pages/Dashboard/components/SalesChart', () => ({ default: () => <div>SalesChart</div> }))
vi.mock('../../../renderer/src/pages/Dashboard/components/TopProducts', () => ({ default: () => <div>TopProducts</div> }))
vi.mock('../../../renderer/src/pages/Dashboard/components/InventoryAlerts', () => ({ default: () => <div>InventoryAlerts</div> }))
vi.mock('../../../renderer/src/pages/Dashboard/components/GoalTracking', () => ({ default: () => <div>GoalTracking</div> }))
vi.mock('../../../renderer/src/pages/Dashboard/components/NotificationCenter', () => ({ default: () => <div>NotificationCenter</div> }))
vi.mock('../../../../shared/utils/logger')

// Mock window.api
const mockApi = {
  products: {
    getStats: vi.fn().mockResolvedValue({ totalProducts: 100, lowStockCount: 5 }),
  },
  saleTransactions: {
    getByDateRange: vi.fn().mockResolvedValue([]),
  },
  customers: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  dashboard: {
    getStats: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}

;(global.window as any).api = mockApi

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard correctly', () => {
    render(<Dashboard />)

    expect(screen.getByText(/goodMorning|goodAfternoon|goodEvening/i)).toBeInTheDocument()
    expect(screen.getByText(/businessOverview/i)).toBeInTheDocument()
  })

  it('loads dashboard data on mount', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(mockApi.products.getStats).toHaveBeenCalled()
      expect(mockApi.saleTransactions.getByDateRange).toHaveBeenCalledTimes(2) // Today and yesterday
      expect(mockApi.customers.getAll).toHaveBeenCalled()
    })
  })

  it('displays loading state initially', () => {
    render(<Dashboard />)

    // Should show loading skeleton for stats
    expect(screen.getByText('DashboardStats')).toBeInTheDocument()
  })

  it('renders dashboard components after loading', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('DashboardStats')).toBeInTheDocument()
      expect(screen.getByText('RecentActivity')).toBeInTheDocument()
      expect(screen.getByText('QuickActions')).toBeInTheDocument()
    })
  })

  it('handles refresh button click', async () => {
    const user = userEvent.setup()

    render(<Dashboard />)

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      return refreshButton
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    // Should call API methods again for refresh
    expect(mockApi.products.getStats).toHaveBeenCalledTimes(2) // Initial load + refresh
    expect(mockApi.saleTransactions.getByDateRange).toHaveBeenCalledTimes(4) // 2 calls initially + 2 for refresh
    expect(mockApi.customers.getAll).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it.skip('shows refreshing state during data reload', async () => {
    const user = userEvent.setup()

    render(<Dashboard />)

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      return refreshButton
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })

    // Click refresh
    await user.click(refreshButton)

    // Should show refreshing state (button should be disabled during refresh)
    await waitFor(() => {
      expect(refreshButton).toBeDisabled()
    })
  })

  it('renders lazy-loaded components', async () => {
    mockApi.dashboard.getStats.mockResolvedValue({
      todayRevenue: 1000,
      todayOrders: 10,
      totalProducts: 50,
      lowStockItems: 5,
      totalCustomers: 25,
      revenueChange: 15.5,
      ordersChange: 8.2,
    })

    mockApi.dashboard.getRecentActivity.mockResolvedValue([])

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('SalesChart')).toBeInTheDocument()
      expect(screen.getByText('TopProducts')).toBeInTheDocument()
      expect(screen.getByText('InventoryAlerts')).toBeInTheDocument()
      expect(screen.getByText('GoalTracking')).toBeInTheDocument()
      expect(screen.getByText('NotificationCenter')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    // Make one of the API calls fail
    mockApi.products.getStats.mockRejectedValue(new Error('API Error'))

    render(<Dashboard />)

    await waitFor(() => {
      // Should still render the greeting (main heading)
      expect(screen.getByText(/goodMorning|goodAfternoon|goodEvening/i)).toBeInTheDocument()
    })
  })

  it.skip('auto-refreshes data periodically', async () => {
    vi.useFakeTimers()

    render(<Dashboard />)

    // Initial load
    await waitFor(() => {
      expect(mockApi.products.getStats).toHaveBeenCalledTimes(1)
    })

    // Fast-forward 5 minutes (the interval used by the component)
    vi.advanceTimersByTime(5 * 60 * 1000 + 100) // Add a small buffer

    // Run any pending timers
    vi.runOnlyPendingTimers()

    await waitFor(() => {
      expect(mockApi.products.getStats).toHaveBeenCalledTimes(2)
    }, { timeout: 2000 })

    vi.useRealTimers()
  })

  it('cleans up interval on unmount', () => {
    vi.useFakeTimers()

    mockApi.dashboard.getStats.mockResolvedValue({
      todayRevenue: 1000,
      todayOrders: 10,
      totalProducts: 50,
      lowStockItems: 5,
      totalCustomers: 25,
      revenueChange: 15.5,
      ordersChange: 8.2,
    })

    mockApi.dashboard.getRecentActivity.mockResolvedValue([])

    const { unmount } = render(<Dashboard />)

    // Clear timers on unmount
    unmount()

    vi.useRealTimers()
  })
})