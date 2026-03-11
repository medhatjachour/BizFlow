import React, { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import SkipToContent from '../ui/SkipToContent'
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp'
import { useModuleEnabled } from '../../hooks/useModuleEnabled'
import { MODULE_IDS } from '@/shared/modules'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Settings,
  LogOut,
  Store,
  BoxIcon,
  CreditCard,
  Users,
  UserSquare2,
  FileBarChart,
  Receipt,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  UtensilsCrossed,
  Warehouse as WarehouseIcon
} from 'lucide-react'

interface NavItem {
  name: string
  translationKey: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    translationKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'sales', 'inventory', 'finance']
  },
  {
    name: 'Stores',
    translationKey: 'stores',
    href: '/stores',
    icon: Store,
    roles: ['admin', 'manager']
  },
  {
    name: 'Products',
    translationKey: 'products',
    href: '/products',
    icon: BoxIcon,
    roles: ['admin', 'manager', 'inventory']
  },
  {
    name: 'POS',
    translationKey: 'pos',
    href: '/pos',
    icon: CreditCard,
    roles: ['admin', 'manager', 'sales']
  },
  {
    name: 'Inventory',
    translationKey: 'inventory',
    href: '/inventory',
    icon: Package,
    roles: ['admin', 'manager', 'inventory']
  },
  {
    name: 'Sales',
    translationKey: 'sales',
    href: '/sales',
    icon: ShoppingCart,
    roles: ['admin', 'manager', 'sales']
  },
  {
    name: 'Employees',
    translationKey: 'employees',
    href: '/employees',
    icon: Users,
    roles: ['admin', 'manager']
  },
  {
    name: 'Customers',
    translationKey: 'customers',
    href: '/customers',
    icon: UserSquare2,
    roles: ['admin', 'manager', 'sales']
  },
  {
    name: 'Reports',
    translationKey: 'reports',
    href: '/reports',
    icon: FileBarChart,
    roles: ['admin', 'manager', 'finance']
  },
  {
    name: 'Finance',
    translationKey: 'finance',
    href: '/finance',
    icon: Wallet,
    roles: ['admin', 'manager', 'finance']
  },
  {
    name: 'Expenses',
    translationKey: 'expenses',
    href: '/expenses',
    icon: Receipt,
    roles: ['admin', 'manager', 'finance']
  },
  {
    name: 'Settings',
    translationKey: 'settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin']
  }
]

interface RootLayoutProps {
  children: React.ReactNode;
  userRole: string;
}

export default function RootLayout({ children, userRole }: RootLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const bakeryEnabled = useModuleEnabled(MODULE_IDS.BAKERY)
  const restaurantEnabled = useModuleEnabled(MODULE_IDS.RESTAURANT)
  const warehouseEnabled = useModuleEnabled(MODULE_IDS.WAREHOUSE)

  // Build dynamic nav — inject module items after Employees
  const navItems: NavItem[] = [
    ...navigation.slice(0, navigation.findIndex(n => n.href === '/employees') + 1),
    ...(__PLUGIN_BAKERY__ && bakeryEnabled ? [{
      name: 'Bakery',
      translationKey: 'bakery',
      href: '/bakery',
      icon: ChefHat,
      roles: ['admin', 'manager', 'inventory']
    }] : []),
    ...(__PLUGIN_RESTAURANT__ && restaurantEnabled ? [{
      name: 'Restaurant',
      translationKey: 'restaurant',
      href: '/restaurant',
      icon: UtensilsCrossed,
      roles: ['admin', 'manager', 'sales']
    }] : []),
    ...(__PLUGIN_WAREHOUSE__ && warehouseEnabled ? [{
      name: 'Warehouse',
      translationKey: 'warehouse',
      href: '/warehouse',
      icon: WarehouseIcon,
      roles: ['admin', 'manager', 'inventory']
    }] : []),
    ...navigation.slice(navigation.findIndex(n => n.href === '/employees') + 1)
  ]

  const handleLogout = async () => {
    navigate('/login')
  }

  if (location.pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      
      <SkipToContent />
      <KeyboardShortcutsHelp />
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white dark:bg-slate-800 
          border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out
          flex flex-col
        `}
      >
        {/* Logo & Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              BF
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold ">
                BizFlow
              </span>
            )}
          </div>
          
          {/* Desktop Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
          </button>

          {/* Mobile Close */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Main navigation">
          {navItems
            .filter(item => item.roles.includes(userRole))
            .map(item => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-xl px-3 py-2.5
                    text-sm font-medium transition-all duration-200
                    group relative
                    ${isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }
                  `}
                  title={!sidebarOpen ? item.name : undefined}
                  aria-label={`Navigate to ${item.name}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon 
                    className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'
                    }`}
                    aria-hidden="true"
                  />
                  {sidebarOpen && <span>{t(item.translationKey as any)}</span>}
                  
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50" role="tooltip">
                      {t(item.translationKey as any)}
                    </div>
                  )}
                </Link>
              )
            })}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} gap-3`}>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Admin User</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">{userRole}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            >
              <Menu size={24} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary lg:hidden flex items-center justify-center text-white font-bold text-sm">
                BF
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t((navItems.find(item => item.href === location.pathname)?.translationKey || 'dashboard') as any)}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Point of Sale Management System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {t('live')}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900" tabIndex={-1}>
          {children}
        </main>
        
        {/* status bar */}
        <div className='px-6 py-1  text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700'>
          © 2026 BizFlow. Made by <a href="https://www.linkedin.com/in/medhatjachour" target="_blank" rel="noopener noreferrer">MedhatJachour</a>
        </div>
      </div>
    </div>
  )
}