/**
 * Unit Tests for Refund Period Logic
 * Tests the isWithinRefundPeriod function behavior
 */

import { describe, it, expect, vi } from 'vitest'

/**
 * `isWithinRefundPeriod` reads the clock itself, so a case that compares it
 * against a timestamp captured a few milliseconds earlier races on the elapsed
 * time between the two reads - which made the exact-limit assertions fail
 * intermittently under parallel load. Pin "now" for those cases.
 */
function withPinnedNow<T>(isoNow: string, run: (now: Date) => T): T {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date(isoNow))
    return run(new Date())
  } finally {
    vi.useRealTimers()
  }
}

/**
 * Function under test - extracted from Sales component
 */
function isWithinRefundPeriod(transactionDate: string, refundPeriodDays: number): boolean {
  if (refundPeriodDays === 0) return false // 0 means refunds disabled

  const transactionTime = new Date(transactionDate).getTime()
  const now = new Date().getTime()
  const daysDifference = (now - transactionTime) / (1000 * 60 * 60 * 24)

  return daysDifference <= refundPeriodDays
}

describe('Refund Period Logic', () => {
  describe('Basic Functionality', () => {
    it('should return false when refund period is 0 (refunds disabled)', () => {
      const today = new Date().toISOString()
      const refundPeriodDays = 0
      expect(isWithinRefundPeriod(today, refundPeriodDays)).toBe(false)
    })

    it('should return true for transaction made today when period is 30 days', () => {
      const today = new Date().toISOString()
      const refundPeriodDays = 30
      expect(isWithinRefundPeriod(today, refundPeriodDays)).toBe(true)
    })

    it('should return true for transaction made 1 day ago when period is 30 days', () => {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const refundPeriodDays = 30
      expect(isWithinRefundPeriod(oneDayAgo.toISOString(), refundPeriodDays)).toBe(true)
    })

    it('should return true for transaction made exactly at refund period limit', () => {
      withPinnedNow('2026-03-10T12:00:00.000Z', (now) => {
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        const refundPeriodDays = 30
        expect(isWithinRefundPeriod(thirtyDaysAgo.toISOString(), refundPeriodDays)).toBe(true)
      })
    })

    it('should return false for transaction made 31 days ago when period is 30 days', () => {
      const thirtyOneDaysAgo = new Date()
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31)
      const refundPeriodDays = 30
      expect(isWithinRefundPeriod(thirtyOneDaysAgo.toISOString(), refundPeriodDays)).toBe(false)
    })

    it('should return false for transaction made 60 days ago when period is 30 days', () => {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const refundPeriodDays = 30
      expect(isWithinRefundPeriod(sixtyDaysAgo.toISOString(), refundPeriodDays)).toBe(false)
    })
  })

  describe('Different Period Lengths', () => {
    it('should return true for transaction made 5 days ago when period is 7 days', () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const refundPeriodDays = 7
      expect(isWithinRefundPeriod(fiveDaysAgo.toISOString(), refundPeriodDays)).toBe(true)
    })

    it('should return false for transaction made 8 days ago when period is 7 days', () => {
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      const refundPeriodDays = 7
      expect(isWithinRefundPeriod(eightDaysAgo.toISOString(), refundPeriodDays)).toBe(false)
    })

    it('should handle long refund periods (90 days)', () => {
      const fortyFiveDaysAgo = new Date()
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
      const refundPeriodDays = 90
      expect(isWithinRefundPeriod(fortyFiveDaysAgo.toISOString(), refundPeriodDays)).toBe(true)
    })

    it('should handle very short refund periods (1 day)', () => {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const refundPeriodDays = 1
      expect(isWithinRefundPeriod(oneDayAgo.toISOString(), refundPeriodDays)).toBe(true)
    })
  })

  describe('Zero Period (Refunds Disabled)', () => {
    it('should return false when refund period is 0 even for very recent transactions', () => {
      const today = new Date().toISOString()
      const refundPeriodDays = 0
      expect(isWithinRefundPeriod(today, refundPeriodDays)).toBe(false)
    })

    it('should return false for 0 period even for transaction made 1 second ago', () => {
      const justNow = new Date(Date.now() - 1000).toISOString()
      const refundPeriodDays = 0
      expect(isWithinRefundPeriod(justNow, refundPeriodDays)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle transaction dates in the future', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const refundPeriodDays = 30
      expect(isWithinRefundPeriod(tomorrow.toISOString(), refundPeriodDays)).toBe(true)
    })

    it('should handle negative refund period days', () => {
      const today = new Date().toISOString()
      const refundPeriodDays = -1
      expect(isWithinRefundPeriod(today, refundPeriodDays)).toBe(false)
    })
  })

  describe('Real-world Scenarios: 7-day Return Policy', () => {
    it('7-day policy: Day 1 should be within period', () => {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      expect(isWithinRefundPeriod(oneDayAgo.toISOString(), 7)).toBe(true)
    })

    it('7-day policy: Day 7 should be within period (exactly at limit)', () => {
      withPinnedNow('2026-03-10T12:00:00.000Z', (now) => {
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
        expect(isWithinRefundPeriod(sevenDaysAgo.toISOString(), 7)).toBe(true)
      })
    })

    it('7-day policy: Day 8 should be outside period', () => {
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      expect(isWithinRefundPeriod(eightDaysAgo.toISOString(), 7)).toBe(false)
    })
  })

  describe('Real-world Scenarios: 30-day Return Policy', () => {
    it('30-day policy: Day 15 should be within period', () => {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
      expect(isWithinRefundPeriod(fifteenDaysAgo.toISOString(), 30)).toBe(true)
    })

    it('30-day policy: Day 30 should be within period', () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      expect(isWithinRefundPeriod(thirtyDaysAgo.toISOString(), 30)).toBe(true)
    })

    it('30-day policy: Day 31 should be outside period', () => {
      const thirtyOneDaysAgo = new Date()
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31)
      expect(isWithinRefundPeriod(thirtyOneDaysAgo.toISOString(), 30)).toBe(false)
    })
  })

  describe('Real-world Scenarios: No-refund Policy (0 days)', () => {
    it('No-refund policy: today should not be refundable', () => {
      const today = new Date().toISOString()
      expect(isWithinRefundPeriod(today, 0)).toBe(false)
    })

    it('No-refund policy: yesterday should not be refundable', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isWithinRefundPeriod(yesterday.toISOString(), 0)).toBe(false)
    })

    it('No-refund policy: last week should not be refundable', () => {
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
      expect(isWithinRefundPeriod(lastWeek.toISOString(), 0)).toBe(false)
    })
  })

  describe('Boundary Testing', () => {
    it('should handle transactions at exact millisecond boundaries', () => {
      withPinnedNow('2026-03-10T12:00:00.000Z', (now) => {
        const exactly30DaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        expect(isWithinRefundPeriod(exactly30DaysAgo.toISOString(), 30)).toBe(true)
      })
    })

    it('should handle very small time differences (minutes)', () => {
      const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000))
      expect(isWithinRefundPeriod(fiveMinutesAgo.toISOString(), 30)).toBe(true)
    })
  })
})
