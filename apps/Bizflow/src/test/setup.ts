import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Create a proper localStorage mock
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
}

// Setup localStorage before each test
beforeEach(() => {
  // Create a new localStorage mock for each test
  const localStorageMock = createLocalStorageMock()
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  // Ensure timer functions are available globally
  Object.defineProperty(global, 'setTimeout', {
    value: global.setTimeout || globalThis.setTimeout,
    writable: true,
  })
  Object.defineProperty(global, 'clearTimeout', {
    value: global.clearTimeout || globalThis.clearTimeout,
    writable: true,
  })
  Object.defineProperty(global, 'setInterval', {
    value: global.setInterval || globalThis.setInterval,
    writable: true,
  })
  Object.defineProperty(global, 'clearInterval', {
    value: global.clearInterval || globalThis.clearInterval,
    writable: true,
  })
})

// Mock window.api (IPC)
Object.defineProperty(window, 'api', {
  value: {
    saleTransactions: {
      create: vi.fn()
    },
    products: {
      getAll: vi.fn()
    },
    customers: {
      getAll: vi.fn()
    }
  },
  writable: true,
})
