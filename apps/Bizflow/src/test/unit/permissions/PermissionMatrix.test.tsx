import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PermissionMatrix from '@renderer/pages/Settings/PermissionMatrix'
import type { PluginPermissionCatalog } from '@/shared/permissions'

const catalog: PluginPermissionCatalog = {
  id: 'bakery',
  label: 'Bakery',
  isPrimary: true,
  entries: [
    { id: 'overview', label: 'Overview', capability: 'access_bakery', kind: 'page' },
    { id: 'recipes', label: 'Recipes', capability: 'manage_inventory', kind: 'page' },
    { id: 'production', label: 'Production', capability: 'manage_inventory', kind: 'page' },
    { id: 'sales', label: 'Sales', capability: 'access_bakery', kind: 'page' },
    { id: 'pnl', label: 'Profit & Loss', capability: 'view_profit', kind: 'page' },
    { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'sales' },
    { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'sales' },
    { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'pnl' },
  ],
}

describe('PermissionMatrix', () => {
  it('renders every page in the catalog', () => {
    render(<PermissionMatrix catalog={catalog} capabilities={[]} onChange={() => {}} />)
    for (const page of ['Overview', 'Recipes', 'Production', 'Sales', 'Profit & Loss']) {
      expect(screen.getByText(page)).toBeInTheDocument()
    }
  })

  it('shows a link hint when multiple pages share one capability', () => {
    render(<PermissionMatrix catalog={catalog} capabilities={[]} onChange={() => {}} />)
    // Recipes & Production both use manage_inventory
    expect(screen.getByText(/also controls Production/)).toBeInTheDocument()
    // Overview & Sales both use access_bakery
    expect(screen.getByText(/also controls Overview/)).toBeInTheDocument()
    expect(screen.getByText(/also controls Sales/)).toBeInTheDocument()
  })

  it('disabling a parent page cascades to its children', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PermissionMatrix catalog={catalog} capabilities={['access_bakery', 'give_discount', 'void_sale']} onChange={onChange} />
    )
    await user.click(screen.getByText('Sales'))
    expect(onChange).toHaveBeenCalledWith(expect.not.arrayContaining(['give_discount', 'void_sale']))
  })

  it('Viewer preset selects only page capabilities', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PermissionMatrix catalog={catalog} capabilities={[]} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Viewer/ }))
    const caps = onChange.mock.calls[0][0]
    expect(caps).toEqual(expect.arrayContaining(['access_bakery', 'manage_inventory', 'view_profit']))
    expect(caps).not.toContain('give_discount')
    expect(caps).not.toContain('export_data')
  })

  it('Admin preset selects pages and actions but preserves unrelated caps', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PermissionMatrix catalog={catalog} capabilities={['manage_users']} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Admin/ }))
    const caps = onChange.mock.calls[0][0]
    expect(caps).toEqual(expect.arrayContaining(['access_bakery', 'manage_inventory', 'give_discount', 'export_data']))
    expect(caps).toContain('manage_users')
  })

  it('disables toggles when not editable', () => {
    render(<PermissionMatrix catalog={catalog} capabilities={[]} onChange={() => {}} disabled />)
    screen.getAllByRole('checkbox').forEach(cb => expect(cb).toBeDisabled())
  })
})
