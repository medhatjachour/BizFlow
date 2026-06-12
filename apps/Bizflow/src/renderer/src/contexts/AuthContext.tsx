import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import logger from '../../../shared/utils/logger'

type User = { id: string; username: string; role: string } | null

type AuthContextType = {
  user: User
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  // Permission helpers
  isAdmin: boolean
  isManager: boolean
  canEdit: boolean
  canDelete: boolean
  canManageInventory: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize user from localStorage if available
  const [user, setUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = async (username: string, password: string) => {
    try {
      // Try using preload API if available
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).api?.auth?.login) {
        // @ts-ignore
        const res = await (window as any).api.auth.login(username, password)
        
        if (res.success && res.user) {
          setUser(res.user)
          // Persist to localStorage
          localStorage.setItem('user', JSON.stringify(res.user))
          return res.user
        } else {
          throw new Error(res.message || 'Login failed')
        }
      }
    } catch (e) {
      logger.error('API login failed', e)
      throw e
    }

    // Fallback: mock user (should not happen if database works)
    logger.warn('⚠️ Using fallback mock login - database API not available')
    const mock = { id: 'mock-' + Date.now(), username, role: 'admin' }
    setUser(mock)
    localStorage.setItem('user', JSON.stringify(mock))
    return mock
  }

  const logout = () => {
    setUser(null)
    // Clear localStorage
    localStorage.removeItem('user')
    try {
      // @ts-ignore
      if (typeof globalThis !== 'undefined' && (globalThis as any).api?.auth?.logout) {
        // @ts-ignore
        ;(globalThis as any).api.auth.logout()
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      logger.error('logout IPC failed', e)
    }
  }

  // Calculate permissions based on user role
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager' || isAdmin
  const canEdit = isManager // Managers and admins can edit
  const canDelete = isAdmin // Only admins can delete
  const canManageInventory = isManager // Managers and admins can manage inventory

  const value = useMemo(
    () => ({ 
      user, 
      login, 
      logout,
      isAdmin,
      isManager,
      canEdit,
      canDelete,
      canManageInventory
    }), 
    [user, isAdmin, isManager, canEdit, canDelete, canManageInventory]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
