/**
 * Main Application Component
 * Features:
 * - Lazy Loading for Code Splitting (all pages)
 * - Per-route Error Boundaries for granular error handling
 * - Route-based Code Splitting
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, ReactNode } from 'react'
import { useState } from 'react'
import RootLayout from './components/layout/RootLayout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ToastProvider } from './contexts/ToastContext'
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext'
import PageLoader from './components/ui/PageLoader'
import { ErrorBoundary } from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { MigrationProgress } from './components/MigrationProgress'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'

// Lazy-load ALL pages for maximum code splitting and fast initial load
const Dashboard    = lazy(() => import('./pages/Dashboard/index'))
const Login        = lazy(() => import('./pages/login'))
const Finance      = lazy(() => import('./pages/Finance/index'))
const Products     = lazy(() => import('./pages/Products/index'))
const Settings     = lazy(() => import('./pages/Settings/index'))
const POS          = lazy(() => import('./pages/POS/index'))
const Inventory    = lazy(() => import('./pages/Inventory/index'))
const Expenses     = lazy(() => import('./pages/Expenses/index'))
const Sales        = lazy(() => import('./pages/Sales'))
const Stores       = lazy(() => import('./pages/Stores'))
const Employees    = lazy(() => import('./pages/Employees'))
const Customers    = lazy(() => import('./pages/Customers'))
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'))
const Reports      = lazy(() => import('./pages/Reports'))
const Installments = lazy(() => import('./pages/Installments'))

// ------------------------------------------------------------------
// Per-route error boundary — wraps each page in isolation so one
// broken page never crashes the whole app or the sidebar/layout.
// ------------------------------------------------------------------
function RouteErrorBoundary({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {name} failed to load
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              An unexpected error occurred. Your data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

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
      <ErrorBoundary>
        <MigrationProgress />
      </ErrorBoundary>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Dashboard"><Dashboard /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/sales"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Sales"><Sales /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Inventory"><Inventory /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/finance"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Finance"><Finance /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/stores"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Stores"><Stores /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Products"><Products /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="POS"><POS /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/employees"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Employees"><Employees /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Customers"><Customers /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Customer Profile"><CustomerProfile /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Reports"><Reports /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Expenses"><Expenses /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/installments"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Installments"><Installments /></RouteErrorBoundary>
                </RootLayoutWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <RootLayoutWrapper>
                  <RouteErrorBoundary name="Settings"><Settings /></RouteErrorBoundary>
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
