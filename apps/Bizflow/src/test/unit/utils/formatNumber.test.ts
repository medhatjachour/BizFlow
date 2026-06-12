/**
 * Unit tests for formatNumber utility functions
 */

import { describe, it, expect } from 'vitest'
import { formatLargeNumber, formatCurrency } from '../../../renderer/src/utils/formatNumber'

describe('formatLargeNumber', () => {
  it('should format numbers less than 1000 with locale string', () => {
    expect(formatLargeNumber(0)).toBe('0')
    expect(formatLargeNumber(999)).toBe('999')
    expect(formatLargeNumber(123)).toBe('123')
  })

  it('should format numbers >= 1000 with K suffix', () => {
    expect(formatLargeNumber(1000)).toBe('1.0K')
    expect(formatLargeNumber(1500)).toBe('1.5K')
    expect(formatLargeNumber(9999)).toBe('10.0K')
    expect(formatLargeNumber(1234)).toBe('1.2K')
  })

  it('should format numbers >= 1,000,000 with M suffix', () => {
    expect(formatLargeNumber(1000000)).toBe('1.0M')
    expect(formatLargeNumber(1500000)).toBe('1.5M')
    expect(formatLargeNumber(9999999)).toBe('10.0M')
    expect(formatLargeNumber(1234567)).toBe('1.2M')
  })

  it('should format numbers >= 1,000,000,000 with B suffix', () => {
    expect(formatLargeNumber(1000000000)).toBe('1.0B')
    expect(formatLargeNumber(1500000000)).toBe('1.5B')
    expect(formatLargeNumber(9999999999)).toBe('10.0B')
    expect(formatLargeNumber(1234567890)).toBe('1.2B')
  })

  it('should respect custom decimal places', () => {
    expect(formatLargeNumber(1234, 0)).toBe('1K')
    expect(formatLargeNumber(1234, 2)).toBe('1.23K')
    expect(formatLargeNumber(1234567, 0)).toBe('1M')
    expect(formatLargeNumber(1234567, 3)).toBe('1.235M')
  })

  it('should handle edge cases', () => {
    expect(formatLargeNumber(999.9)).toBe('999.9')
    expect(formatLargeNumber(1000.1)).toBe('1.0K')
    expect(formatLargeNumber(999999.9)).toBe('1000.0K')
    expect(formatLargeNumber(1000000.1)).toBe('1.0M')
  })
})

describe('formatCurrency', () => {
  it('should format currency less than 1000 with locale string and $', () => {
    expect(formatCurrency(0)).toBe('$0')
    expect(formatCurrency(999)).toBe('$999')
    expect(formatCurrency(123)).toBe('$123')
  })

  it('should format currency >= 1000 with K suffix and $', () => {
    expect(formatCurrency(1000)).toBe('$1.0K')
    expect(formatCurrency(1500)).toBe('$1.5K')
    expect(formatCurrency(9999)).toBe('$10.0K')
    expect(formatCurrency(1234)).toBe('$1.2K')
  })

  it('should format currency >= 1,000,000 with M suffix and $', () => {
    expect(formatCurrency(1000000)).toBe('$1.0M')
    expect(formatCurrency(1500000)).toBe('$1.5M')
    expect(formatCurrency(9999999)).toBe('$10.0M')
    expect(formatCurrency(1234567)).toBe('$1.2M')
  })

  it('should format currency >= 1,000,000,000 with B suffix and $', () => {
    expect(formatCurrency(1000000000)).toBe('$1.0B')
    expect(formatCurrency(1500000000)).toBe('$1.5B')
    expect(formatCurrency(9999999999)).toBe('$10.0B')
    expect(formatCurrency(1234567890)).toBe('$1.2B')
  })

  it('should respect custom decimal places for currency', () => {
    expect(formatCurrency(1234, 0)).toBe('$1K')
    expect(formatCurrency(1234, 2)).toBe('$1.23K')
    expect(formatCurrency(1234567, 0)).toBe('$1M')
    expect(formatCurrency(1234567, 3)).toBe('$1.235M')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-1000)).toBe('$-1.0K')
    expect(formatCurrency(-1234567)).toBe('$-1.2M')
  })

  it('should handle decimal inputs', () => {
    expect(formatCurrency(1234.56)).toBe('$1.2K')
    expect(formatCurrency(1234567.89)).toBe('$1.2M')
  })
})