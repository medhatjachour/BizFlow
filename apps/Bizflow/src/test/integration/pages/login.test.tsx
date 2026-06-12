/**
 * Unit tests for Login page
 * Tests authentication flow and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../../renderer/src/pages/login'

// Mock dependencies
vi.mock('../../../renderer/src/contexts/AuthContext')
vi.mock('../../../renderer/src/contexts/LanguageContext')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

// Import mocked modules after mocking
import { useAuth } from '../../../renderer/src/contexts/AuthContext'
import { useLanguage } from '../../../renderer/src/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'

const mockAuth = {
  login: vi.fn(),
  user: null,
  logout: vi.fn(),
  isAdmin: false,
  isManager: false,
  canEdit: false,
  canDelete: false,
  canManageInventory: false,
}

const mockLanguage = {
  language: 'en' as const,
  setLanguage: vi.fn(),
  t: vi.fn((key: string) => key), // Return key as translation for simplicity
}

const mockNavigate = vi.fn()

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock implementations
    vi.mocked(useAuth).mockReturnValue(mockAuth)
    vi.mocked(useLanguage).mockReturnValue(mockLanguage)
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  })

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
  }

  it('renders login form correctly', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /signInToAccount/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signIn/i })).toBeInTheDocument()
  })

  it('shows validation error for empty fields', async () => {
    const user = userEvent.setup()
    renderLogin()

    const loginButton = screen.getByRole('button', { name: /signIn/i })
    await act(async () => {
      await user.click(loginButton)
    })

    expect(mockLanguage.t).toHaveBeenCalledWith('enterBothFields')
  })

  it('calls auth.login with correct credentials', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockResolvedValue({ id: '1', username: 'test' })

    renderLogin()

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /signIn/i })

    await act(async () => {
      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'testpass')
      await user.click(loginButton)
    })

    expect(mockAuth.login).toHaveBeenCalledWith('testuser', 'testpass')
  })

  it('navigates to dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockResolvedValue({ id: '1', username: 'test' })

    renderLogin()

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /signIn/i })

    await act(async () => {
      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'testpass')
      await user.click(loginButton)
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message on login failure', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockRejectedValue(new Error('Invalid credentials'))

    renderLogin()

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /signIn/i })

    await act(async () => {
      await user.type(usernameInput, 'wronguser')
      await user.type(passwordInput, 'wrongpass')
      await user.click(loginButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i)
    // Find the toggle button by its position in the password field container
    const passwordContainer = passwordInput.parentElement
    const toggleButton = passwordContainer?.querySelector('button') as HTMLButtonElement

    expect(toggleButton).toBeInTheDocument()

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    await act(async () => {
      await user.click(toggleButton)
    })
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await act(async () => {
      await user.click(toggleButton)
    })
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('handles setup login button', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockResolvedValue({ id: '1', username: 'setup' })

    renderLogin()

    const setupButton = screen.getByRole('button', { name: /useSetupAccount/i })
    await act(async () => {
      await user.click(setupButton)
    })

    expect(mockAuth.login).toHaveBeenCalledWith('setup', 'setup123')
  })

  it('prevents multiple login attempts while loading', async () => {
    const user = userEvent.setup()
    mockAuth.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    renderLogin()

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /signIn/i })

    await act(async () => {
      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'testpass')
    })

    // Click login once
    await act(async () => {
      await user.click(loginButton)
    })

    // Wait for loading state to be set
    await waitFor(() => {
      expect(loginButton).toBeDisabled()
    })

    // Try clicking again while loading - this should not trigger another call
    await act(async () => {
      await user.click(loginButton)
      await user.click(loginButton)
    })

    // Should only call login once
    expect(mockAuth.login).toHaveBeenCalledTimes(1)
  })
})