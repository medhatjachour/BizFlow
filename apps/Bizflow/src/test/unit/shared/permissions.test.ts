import {
  hasCapability,
  PLUGIN_PERMISSION_CATALOG,
  resolvePluginRoleCapabilities,
  resolveCapabilities,
} from '../../../shared/permissions'

describe('plugin-scoped permissions', () => {
  it('gives coffee staff access to operational coffee tabs only', () => {
    const capabilities = resolveCapabilities('coffee_staff')

    expect(capabilities).toContain('access_coffee')
    expect(capabilities).toContain('coffee_pos')
    expect(capabilities).toContain('coffee_tables')
    expect(capabilities).not.toContain('coffee_products')
    expect(capabilities).not.toContain('coffee_finance')
  })

  it('keeps admin wildcard and manager defaults fully enabled', () => {
    expect(hasCapability([], 'admin', 'coffee_finance')).toBe(true)
    expect(resolveCapabilities('manager')).toContain('coffee_finance')
  })

  it('treats a stored override as the role boundary', () => {
    const capabilities = resolveCapabilities('coffee_staff', ['coffee_pos'])

    expect(capabilities).toEqual(['coffee_pos'])
    expect(hasCapability(capabilities, 'coffee_staff', 'coffee_tables')).toBe(false)
  })

  it('resolves independent plugin assignments into one effective session', () => {
    const capabilities = resolvePluginRoleCapabilities({
      coffee: 'coffee_staff',
      warehouse: 'warehouse_staff',
    })

    expect(capabilities).toEqual(expect.arrayContaining(['access_coffee', 'coffee_pos', 'access_warehouse']))
  })

  it('keeps Coffee role presets separated by operational responsibility', () => {
    const cashier = resolvePluginRoleCapabilities({ coffee: 'coffee_cashier' })
    const inventoryManager = resolvePluginRoleCapabilities({ coffee: 'coffee_inventory_manager' })
    const shiftManager = resolvePluginRoleCapabilities({ coffee: 'coffee_shift_manager' })

    expect(cashier).toEqual(expect.arrayContaining(['coffee_pos', 'coffee_tables', 'coffee_sales']))
    expect(cashier).not.toContain('coffee_inventory')
    expect(inventoryManager).toEqual(expect.arrayContaining(['coffee_products', 'coffee_inventory', 'coffee_incoming']))
    expect(inventoryManager).not.toContain('coffee_pos')
    expect(shiftManager).toEqual(expect.arrayContaining(['coffee_pos', 'coffee_shifts', 'coffee_expenses']))
    expect(shiftManager).not.toContain('coffee_finance')
  })

  it('uses the Member kernel role as a least-privilege plugin base', () => {
    expect(resolveCapabilities('member')).toEqual([])
  })

  it('allows Coffee role permissions to be customised through stored overrides', () => {
    const capabilities = resolveCapabilities('coffee_cashier', ['access_coffee', 'coffee_pos', 'coffee_shifts'])

    expect(capabilities).toContain('coffee_shifts')
    expect(capabilities).not.toContain('coffee_tables')
  })

  it('registers Coffee pages and actions in the permission catalog', () => {
    const catalog = PLUGIN_PERMISSION_CATALOG.coffee

    expect(catalog?.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'shifts', capability: 'coffee_shifts', kind: 'page' }),
      expect.objectContaining({ id: 'void-sale', capability: 'void_sale', kind: 'action', parentId: 'pos' }),
    ]))
  })
})
