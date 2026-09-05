import {
  hasCapability,
  PLUGIN_PERMISSION_CATALOG,
  PLUGIN_TAB_CAPABILITIES,
  CAPABILITIES,
  ALL_CAPABILITIES,
  ROLE_DEFINITIONS,
  capabilitiesForScope,
  sanitiseCapabilities,
  presetCapabilities,
  resolvePluginRoleCapabilities,
  resolveCapabilities,
} from '../../../shared/permissions'

const PLUGIN_IDS = [
  'commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee',
] as const

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
    expect(resolveCapabilities('member')).toEqual(['view_dashboard'])
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
      expect.objectContaining({ id: 'void-sale', capability: 'coffee_void_sale', kind: 'action', parentId: 'pos' }),
    ]))
  })

  it('provides a detailed permission catalog for every plugin', () => {
    for (const pluginId of PLUGIN_IDS) {
      const catalog = PLUGIN_PERMISSION_CATALOG[pluginId]

      expect(catalog).toBeDefined()
      expect(catalog?.entries.some(entry => entry.kind === 'page')).toBe(true)
      expect(catalog?.entries.some(entry => entry.kind === 'page' && entry.viewer)).toBe(true)
    }
  })

  it('keeps every permission-matrix page aligned with its plugin tab gate', () => {
    for (const pluginId of PLUGIN_IDS) {
      const catalog = PLUGIN_PERMISSION_CATALOG[pluginId]!
      for (const entry of catalog.entries.filter(entry => entry.kind === 'page')) {
        expect(PLUGIN_TAB_CAPABILITIES[pluginId][entry.id], `${pluginId}.${entry.id}`).toBe(entry.capability)
      }
    }
  })
})

describe('capability scope isolation', () => {
  it('assigns every capability to exactly one scope', () => {
    for (const capability of ALL_CAPABILITIES) {
      expect(CAPABILITIES[capability], capability).toBeDefined()
      expect(CAPABILITIES[capability].scope, capability).toBeTruthy()
    }
  })

  it('never shares a capability between two plugins', () => {
    const owners = new Map<string, string>()
    for (const pluginId of PLUGIN_IDS) {
      for (const entry of PLUGIN_PERMISSION_CATALOG[pluginId]!.entries) {
        const existing = owners.get(entry.capability)
        expect(existing ?? pluginId, `${entry.capability} shared with ${existing}`).toBe(pluginId)
        owners.set(entry.capability, pluginId)
      }
    }
  })

  it('strips out-of-scope capabilities when saving a role', () => {
    const cleaned = sanitiseCapabilities('coffee', ['coffee_pos', 'bakery_recipes', 'manage_users'])

    expect(cleaned).toContain('coffee_pos')
    expect(cleaned).toContain('access_coffee')
    expect(cleaned).not.toContain('bakery_recipes')
    expect(cleaned).not.toContain('manage_users')
  })

  it('leaves a role with nothing when every capability is out of scope', () => {
    expect(sanitiseCapabilities('gym', ['clinic_patients', 'vet_refund'])).toEqual([])
  })

  it('confines every built-in plugin role to its own plugin', () => {
    for (const role of ROLE_DEFINITIONS.filter(role => role.scope !== 'kernel')) {
      const allowed = new Set(capabilitiesForScope(role.scope))
      for (const capability of role.capabilities) {
        expect(allowed.has(capability), `${role.key} leaks ${capability}`).toBe(true)
      }
    }
  })

  it('lets kernel roles span plugins but never invents capabilities', () => {
    const declared = new Set(ALL_CAPABILITIES)
    for (const role of ROLE_DEFINITIONS.filter(role => role.scope === 'kernel')) {
      for (const capability of role.capabilities) {
        expect(declared.has(capability), `${role.key} declares unknown ${capability}`).toBe(true)
      }
    }
  })

  it('escalates presets from viewer through admin', () => {
    const viewer = presetCapabilities('pharmacy', 'viewer')
    const editor = presetCapabilities('pharmacy', 'editor')
    const admin = presetCapabilities('pharmacy', 'admin')

    expect(presetCapabilities('pharmacy', 'none')).toEqual([])
    expect(viewer.length).toBeLessThan(editor.length)
    expect(editor.length).toBeLessThan(admin.length)
    expect(viewer).toContain('access_pharmacy')
    expect(editor).not.toContain('pharmacy_refund')
    expect(admin).toContain('pharmacy_refund')
  })
})

