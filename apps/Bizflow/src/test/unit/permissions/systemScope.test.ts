import { describe, it, expect } from 'vitest'
import { SYSTEM_SCOPE_CAPABILITIES, isSystemScopeCapability } from '@/shared/permissions'

describe('SYSTEM_SCOPE_CAPABILITIES', () => {
  it('keeps kernel-level capabilities (visibility, sales, operations, admin, access_*)', () => {
    expect(SYSTEM_SCOPE_CAPABILITIES).toContain('manage_settings')
    expect(SYSTEM_SCOPE_CAPABILITIES).toContain('view_profit')
    expect(SYSTEM_SCOPE_CAPABILITIES).toContain('manage_users')
    expect(SYSTEM_SCOPE_CAPABILITIES).toContain('access_bakery')
    expect(SYSTEM_SCOPE_CAPABILITIES).toContain('access_coffee')
  })

  it('excludes coffee-specific page capabilities from the kernel scope', () => {
    for (const cap of ['coffee_pos', 'coffee_sales', 'coffee_reports', 'coffee_finance', 'coffee_shifts']) {
      expect(isSystemScopeCapability(cap as any), cap).toBe(false)
    }
  })

  it('does not contain any coffee_* capability besides access_coffee', () => {
    const leaked = SYSTEM_SCOPE_CAPABILITIES.filter(cap => cap.startsWith('coffee_'))
    expect(leaked).toEqual([])
  })
})
