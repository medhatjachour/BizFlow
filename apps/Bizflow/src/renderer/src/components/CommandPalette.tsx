/**
 * CommandPalette Component
 * Global command search interface (Ctrl+K)
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Wallet,
  Settings,
  Store,
  BoxIcon,
  Users,
  FileBarChart,
  Plus,
  Download,
  RefreshCw,
  X
} from 'lucide-react'
import logger from '../../../shared/utils/logger'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  keywords?: string[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View sales overview and analytics',
      icon: LayoutDashboard,
      action: () => {
        navigate('/dashboard')
        onClose()
      },
      keywords: ['home', 'overview', 'analytics']
    },
    {
      id: 'nav-products',
      label: 'Go to Products',
      description: 'Manage product catalog',
      icon: BoxIcon,
      action: () => {
        navigate('/products')
        onClose()
      },
      keywords: ['items', 'catalog', 'inventory']
    },
    {
      id: 'nav-inventory',
      label: 'Go to Inventory',
      description: 'View stock levels',
      icon: Package,
      action: () => {
        navigate('/inventory')
        onClose()
      },
      keywords: ['stock', 'warehouse']
    },
    {
      id: 'nav-sales',
      label: 'Go to Sales',
      description: 'View sales history',
      icon: ShoppingCart,
      action: () => {
        navigate('/sales')
        onClose()
      },
      keywords: ['transactions', 'orders']
    },
    {
      id: 'nav-stores',
      label: 'Go to Stores',
      description: 'Manage store locations',
      icon: Store,
      action: () => {
        navigate('/stores')
        onClose()
      },
      keywords: ['locations', 'branches']
    },
    {
      id: 'nav-customers',
      label: 'Go to Customers',
      description: 'Manage customer database',
      icon: Users,
      action: () => {
        navigate('/customers')
        onClose()
      },
      keywords: ['clients', 'contacts']
    },
    {
      id: 'nav-finance',
      label: 'Go to Finance',
      description: 'View financial reports',
      icon: Wallet,
      action: () => {
        navigate('/finance')
        onClose()
      },
      keywords: ['money', 'accounting', 'revenue']
    },
    {
      id: 'nav-reports',
      label: 'Go to Reports',
      description: 'Generate business reports',
      icon: FileBarChart,
      action: () => {
        navigate('/reports')
        onClose()
      },
      keywords: ['analytics', 'insights', 'statistics']
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Configure application',
      icon: Settings,
      action: () => {
        navigate('/settings')
        onClose()
      },
      keywords: ['preferences', 'config']
    },

    // Quick Actions
    {
      id: 'action-new-product',
      label: 'New Product',
      description: 'Create a new product',
      icon: Plus,
      action: () => {
        navigate('/products?create=true')
        onClose()
      },
      keywords: ['add', 'create', 'item']
    },
    {
      id: 'action-new-customer',
      label: 'New Customer',
      description: 'Add a new customer',
      icon: Plus,
      action: () => {
        navigate('/customers?create=true')
        onClose()
      },
      keywords: ['add', 'create', 'client']
    },
    {
      id: 'action-export-inventory',
      label: 'Export Inventory',
      description: 'Download inventory as Excel',
      icon: Download,
      action: () => {
        navigate('/inventory')
        onClose()
        logger.info('Navigate to inventory to export')
      },
      keywords: ['download', 'excel', 'xlsx']
    },
    {
      id: 'action-refresh',
      label: 'Refresh Data',
      description: 'Reload current page data',
      icon: RefreshCw,
      action: () => {
        window.location.reload()
        onClose()
      },
      keywords: ['reload', 'update']
    }
  ]

  // Filter commands based on search
  const filteredCommands = search.trim() === '' 
    ? commands 
    : commands.filter(cmd => {
        const searchLower = search.toLowerCase()
        const matchesLabel = cmd.label.toLowerCase().includes(searchLower)
        const matchesDescription = cmd.description?.toLowerCase().includes(searchLower)
        const matchesKeywords = cmd.keywords?.some(kw => kw.includes(searchLower))
        return matchesLabel || matchesDescription || matchesKeywords
      })

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="text-slate-400" size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands... (type to filter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-lg"
            aria-label="Search commands"
            id="command-palette-title"
          />
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close command palette"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12" role="status">
              <Search className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={48} aria-hidden="true" />
              <p className="text-slate-500 dark:text-slate-400">No commands found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div role="listbox" aria-label="Available commands">
              {filteredCommands.map((command, index) => {
                const Icon = command.icon
                const isSelected = index === selectedIndex
                
                return (
                  <button
                    key={command.id}
                    onClick={() => command.action()}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{command.label}</p>
                      {command.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {command.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs">Esc</kbd>
                Close
              </span>
            </div>
            <span>{filteredCommands.length} commands</span>
          </div>
        </div>
      </div>
    </div>
  )
}
