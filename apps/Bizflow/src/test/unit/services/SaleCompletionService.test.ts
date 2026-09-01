import { describe, expect, it } from 'vitest'
import {
  buildCompletionSchedule,
  DEFAULT_SALE_COMPLETION_DELAY_DAYS,
  normalizeCompletionDelayDays
} from '../../../main/services/SaleCompletionService'

describe('SaleCompletionService', () => {
  it('uses seven days when the configured delay is invalid', () => {
    expect(normalizeCompletionDelayDays(undefined)).toBe(DEFAULT_SALE_COMPLETION_DELAY_DAYS)
    expect(normalizeCompletionDelayDays('invalid')).toBe(DEFAULT_SALE_COMPLETION_DELAY_DAYS)
  })

  it('clamps the delay to the supported range', () => {
    expect(normalizeCompletionDelayDays(-4)).toBe(0)
    expect(normalizeCompletionDelayDays(500)).toBe(365)
    expect(normalizeCompletionDelayDays(14.8)).toBe(14)
  })

  it('builds the completion date from the supplied start date', () => {
    const start = new Date('2026-09-01T12:00:00.000Z')
    expect(buildCompletionSchedule(7, start).toISOString()).toBe('2026-09-08T12:00:00.000Z')
  })
})
