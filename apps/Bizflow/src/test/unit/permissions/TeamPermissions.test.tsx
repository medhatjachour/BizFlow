import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

const canMock = vi.fn(() => true)
vi.mock('@renderer/contexts/AuthContext', () => ({
  useAuth: () => ({ can: canMock, isAdmin: true, user: { id: '1', username: 'setup', role: 'admin' } }),
}))

vi.mock('@renderer/contexts/ToastContext', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}))

import TeamPermissions from '@renderer/pages/Settings/TeamPermissions'
import type { User } from '@renderer/pages/Settings/userMangement/types'

const users: User[] = [
  { id: '1', username: 'sarah', fullName: 'Sarah Baker', email: null, phone: null, role: 'member', isActive: true, createdAt: '', lastLogin: null, pluginRoles: { bakery: 'bakery_staff' } },
  { id: '2', username: 'omar', fullName: 'Omar Boss', email: null, phone: null, role: 'admin', isActive: true, createdAt: '', lastLogin: null, pluginRoles: {} },
]

const roles = {
  admin: { capabilities: [], isDefault: true, isWildcard: true },
  manager: { capabilities: [], isDefault: true, isWildcard: false },
  member: { capabilities: [], isDefault: true, isWildcard: false },
  finance: { capabilities: [], isDefault: true, isWildcard: false },
  inventory: { capabilities: [], isDefault: true, isWildcard: false },
  sales: { capabilities: [], isDefault: true, isWildcard: false },
  cashier: { capabilities: [], isDefault: true, isWildcard: false },
  bakery_staff: { capabilities: ['access_bakery'], isDefault: true, isWildcard: false },
  bakery_manager: {
    capabilities: ['access_bakery', 'manage_inventory', 'manage_staff', 'view_profit', 'manage_settings', 'export_data'],
    isDefault: true, isWildcard: false,
  },
}

function mockApi() {
  ;(window as any).api = {
    permissions: {
      getRoles: vi.fn().mockResolvedValue(roles),
      getCatalog: vi.fn().mockResolvedValue([]),
    },
    users: { getAll: vi.fn().mockResolvedValue({ success: true, data: users }) },
  }
}

describe('TeamPermissions', () => {
  beforeEach(() => {
    canMock.mockReturnValue(true)
    mockApi()
  })

  it('renders stats and auto-scopes to the single enabled plugin', async () => {
    render(<TeamPermissions enabledPlugins={['bakery']} />)
    expect(await screen.findByText('Team & Permissions')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Team members')).toBeInTheDocument())
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    // Bakery scope auto-selected -> its roles show up (as pills and user badges)
    expect(screen.getAllByText('Bakery Staff').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bakery Manager').length).toBeGreaterThan(0)
  })

  it('switching scope to System shows kernel roles', async () => {
    const user = userEvent.setup()
    render(<TeamPermissions enabledPlugins={['bakery', 'coffee']} />)
    await screen.findByText('Team & Permissions')
    await user.click(screen.getByRole('button', { name: /System/ }))
    await waitFor(() => expect(screen.getAllByText('System roles').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Member').length).toBeGreaterThan(0)
  })

  it('opening a user’s access preview shows what they can do', async () => {
    const user = userEvent.setup()
    render(<TeamPermissions enabledPlugins={['bakery']} />)
    await screen.findByText('Team & Permissions')
    const eye = await screen.findByLabelText('View access for sarah')
    await user.click(eye)
    expect(await screen.findByText(/What .* can do/)).toBeInTheDocument()
    expect(screen.getByText('Access the Bakery plugin')).toBeInTheDocument()
  })

  it('warns when the acting user cannot manage users', async () => {
    canMock.mockImplementation((cap: string) => cap !== 'manage_users')
    render(<TeamPermissions enabledPlugins={['bakery']} />)
    await screen.findByText('Team & Permissions')
    expect(await screen.findByText(/Manage user accounts/)).toBeInTheDocument()
  })
})
