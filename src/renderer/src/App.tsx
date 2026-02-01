/**
 * Main Application Component
 * Features:
 * - Lazy Loading for Code Splitting
 * - Error Boundaries for graceful error handling
 * - Performance Monitoring
 * - Route-based Code Splitting
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, ReactNode, useState } from 'react'
import RootLayout from '../components/layout/RootLayout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ToastProvider } from './contexts/ToastContext'
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext'
import PageLoader from './components/ui/PageLoader'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import Dashboard from './pages/Dashboard/index'
import Login from './pages/login'
import Finance from './pages/Finance/index'
import Products from './pages/Products/index'
import Settings from './pages/Settings/index'
import POS from './pages/POS/index'
import Inventory from './pages/Inventory/index'
import Expenses from './pages/Expenses/index'

// Lazy load pages for optimal performance (code splitting)
const Sales = lazy(() => import('./pages/Sales'))
const Stores = lazy(() => import('./pages/Stores'))
const Employees = lazy(() => import('./pages/Employees'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'))
const Reports = lazy(() => import('./pages/Reports'))
const Installments = lazy(() => import('./pages/Installments'))

function AppContent() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      action: () => setCommandPaletteOpen(true),
      description: 'Open command palette'
    }
  ])

  return (
    <>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Dashboard />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/sales"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Sales />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Inventory />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/finance"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Finance />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/stores"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Stores />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Products />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <POS />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/employees"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Employees />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Customers />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <CustomerProfile />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Reports />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Expenses />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/installments"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Installments />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <Settings />
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
         
      </Suspense>
     
    </>
  )
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <DisplaySettingsProvider>
            <ToastProvider>
              <AuthProvider>
                <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                  <AppContent />
                </HashRouter>
              </AuthProvider>
            </ToastProvider>
          </DisplaySettingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function RequireAuth({ children }: Readonly<{ children: React.ReactElement }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RootLayoutWrapper({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth()
  return <RootLayout userRole={user?.role || 'admin'}>{children}</RootLayout>
}
