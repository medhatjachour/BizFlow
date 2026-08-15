import {
  hasCapability,
  PLUGIN_PERMISSION_CATALOG,
  PLUGIN_ROLE_DEFAULTS,
  PLUGIN_ROLE_LABELS,
  pluginRoleLabel,
  resolvePluginRoleCapabilities,
  resolveCapabilities,
  type PluginId,
} from '../../../shared/permissions'

const ALL_PLUGINS: PluginId[] = ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee']

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

  it('registers a permission catalog for every plugin (page + tabs + actions)', () => {
    for (const id of ALL_PLUGINS) {
      const catalog = PLUGIN_PERMISSION_CATALOG[id]
      expect(catalog, `catalog for ${id}`).toBeDefined()
      expect(catalog.entries.length, `entries for ${id}`).toBeGreaterThanOrEqual(5)
      expect(catalog.entries.filter(e => e.kind === 'page').length, `pages for ${id}`).toBeGreaterThanOrEqual(3)
      // Every action/tab is anchored to a page that exists in the catalog.
      const pageIds = new Set(catalog.entries.filter(e => e.kind === 'page').map(e => e.id))
      for (const entry of catalog.entries) {
        if (entry.parentId) expect(pageIds.has(entry.parentId), `${id}:${entry.id} parent ${entry.parentId}`).toBe(true)
      }
    }
  })

  it('every plugin role resolves to at least its plugin access capability', () => {
    for (const id of ALL_PLUGINS) {
      for (const [role, caps] of Object.entries(PLUGIN_ROLE_DEFAULTS[id])) {
        expect(caps, `${role}`).toContain(`access_${id}`)
        expect(pluginRoleLabel(role), `${role} label`).not.toBe('')
      }
    }
  })

  it('adds full manager roles for every non-coffee plugin', () => {
    const managerRoles = [
      'bakery_manager', 'restaurant_manager', 'warehouse_manager',
      'clinic_manager', 'vet_manager', 'gym_manager', 'pharmacy_manager',
    ]
    for (const role of managerRoles) {
      const caps = resolveCapabilities(role)
      expect(PLUGIN_ROLE_LABELS[role], `${role} label`).toBeDefined()
      expect(caps, `${role}`).toEqual(expect.arrayContaining(['view_profit', 'view_finance', 'export_data', 'manage_staff']))
    }
  })

  it('scopes a single-plugin run to that plugin only', () => {
    // A user running the app for only the Bakery plugin needs just bakery roles.
    const bakeryStaff = resolvePluginRoleCapabilities({ bakery: 'bakery_staff' })
    const bakeryManager = resolvePluginRoleCapabilities({ bakery: 'bakery_manager' })

    expect(bakeryStaff).toContain('access_bakery')
    expect(bakeryManager).toEqual(expect.arrayContaining(['access_bakery', 'manage_inventory', 'view_profit']))
    expect(bakeryManager).not.toContain('access_coffee')
    expect(bakeryStaff).not.toContain('access_commerce')
  })

  it('gives coffee_manager the sensitive sales actions by default', () => {
    const caps = resolveCapabilities('coffee_manager')
    expect(caps).toEqual(expect.arrayContaining(['give_discount', 'issue_refund', 'void_sale']))
  })

  it('keeps an override as the hard boundary even when a full role exists', () => {
    const caps = resolveCapabilities('bakery_manager', ['access_bakery', 'manage_inventory'])

    expect(caps).toEqual(['access_bakery', 'manage_inventory'])
    expect(hasCapability(caps, 'bakery_manager', 'view_finance')).toBe(false)
  })
})
