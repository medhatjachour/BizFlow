/**
 * Test utilities and common mocks for the application
 */

import { vi } from 'vitest'

// Common mock implementations
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

export const mockLanguage = {
  t: vi.fn((key: string) => key), // Return key as translation for simplicity
  language: 'en',
  setLanguage: vi.fn(),
}

export const mockAuth = {
  user: { id: '1', name: 'Test User', role: 'admin' },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

export const mockDisplaySettings = {
  theme: 'light',
  language: 'en',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  setTheme: vi.fn(),
  setLanguage: vi.fn(),
  setCurrency: vi.fn(),
  setDateFormat: vi.fn(),
}

export const mockIPC = {
  customers: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkDelete: vi.fn(),
    getPurchaseHistory: vi.fn(),
  },
  products: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
  employees: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sales: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  saleTransactions: {
    create: vi.fn(),
    getByCustomerId: vi.fn(),
    getTodayStats: vi.fn(),
    getActivityFeed: vi.fn(),
  },
  inventory: {
    getAll: vi.fn(),
    updateStock: vi.fn(),
  },
  reports: {
    generateSalesReport: vi.fn(),
    generateFinancialReport: vi.fn(),
  },
}

// Mock data factories
export const createMockCustomer = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  loyaltyTier: 'Bronze',
  totalSpent: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: '1',
  name: 'Test Product',
  baseSKU: 'TEST-001',
  description: 'A test product',
  price: 10.99,
  cost: 5.50,
  stock: 100,
  category: 'Test Category',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockEmployee = (overrides = {}) => ({
  id: '1',
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'cashier',
  salary: 30000,
  hireDate: new Date(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockSale = (overrides = {}) => ({
  id: '1',
  customerId: '1',
  employeeId: '1',
  total: 50.99,
  status: 'completed',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Test wrapper components
export const createTestWrapper = (providers: React.ComponentType[] = []) => {
  return ({ children }: { children: React.ReactNode }) => {
    let wrappedChildren = children

    providers.forEach((Provider) => {
      wrappedChildren = <Provider>{wrappedChildren}</Provider>
    })

    return wrappedChildren
  }
}

// Common test helpers
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const mockConsoleError = () => {
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })
}