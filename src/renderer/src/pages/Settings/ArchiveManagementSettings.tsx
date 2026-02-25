import { useState, useEffect } from 'react'
import { Archive, RefreshCw, Trash2, Search, Package, Users, User } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import logger from '../../../../shared/utils/logger'

type ArchiveTab = 'products' | 'customers' | 'users'

interface ArchivedItem {
  id: string
  name: string
  archivedAt: string
  archivedBy: string
  archiveReason?: string
  // Additional metadata
  email?: string // for customers/users
  category?: string // for products
  phone?: string // for customers
}

export default function ArchiveManagementSettings() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<ArchiveTab>('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const tabs = [
    { id: 'products' as const, name: t('archivedProducts'), icon: Package },
    { id: 'customers' as const, name: t('archivedCustomers'), icon: Users },
    { id: 'users' as const, name: t('deactivatedUsers'), icon: User }
  ]

  // Load archived items when tab changes
  useEffect(() => {
    loadItems()
  }, [activeTab])

  const loadItems = async () => {
    setLoading(true)
    try {
      let result
      
      if (activeTab === 'products') {
        result = await window.electron.ipcRenderer.invoke('delete:get-archived-products')
      } else if (activeTab === 'customers') {
        result = await window.electron.ipcRenderer.invoke('delete:get-archived-customers')
      } else {
        result = await window.electron.ipcRenderer.invoke('delete:get-deactivated-users')
      }

      if (result.success && result.data) {
        // Transform data to common format
        const transformedItems = result.data.map((item: any) => ({
          id: item.id,
          name: activeTab === 'products' ? item.name : 
                activeTab === 'customers' ? item.name : 
                item.username || item.email,
          archivedAt: activeTab === 'users' ? item.deactivatedAt : item.archivedAt,
          archivedBy: activeTab === 'users' ? (item.deactivatedBy || 'System') : (item.archivedBy || 'System'),
          archiveReason: item.archiveReason,
          email: item.email,
          category: item.category?.name,
          phone: item.phone
        }))
        
        setItems(transformedItems)
      } else {
        logger.error(`Failed to load archived ${activeTab}:`, result.error || 'Unknown error')
        setItems([])
      }
    } catch (error) {
      logger.error(`Failed to load archived ${activeTab}:`, error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (itemId: string, itemName: string) => {
    setActionLoading(itemId)
    try {
      let result
      
      if (activeTab === 'products') {
        result = await window.electron.ipcRenderer.invoke('delete:restore-product', { productId: itemId })
      } else if (activeTab === 'customers') {
        result = await window.electron.ipcRenderer.invoke('delete:restore-customer', { customerId: itemId })
      } else {
        result = await window.electron.ipcRenderer.invoke('delete:reactivate-user', { userId: itemId })
      }

      if (result.success) {
        // Remove from list
        setItems(items.filter(item => item.id !== itemId))
        // Show success message
        alert(`"${itemName}" ${t('restore')}d successfully!`)
      } else {
        alert(`Failed to ${t('restore').toLowerCase()}: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      logger.error('Restore failed:', error)
      alert('Failed to restore item')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`⚠️ ${t('permanentlyDelete')} "${itemName}"?\n\n${t('cannotBeUndone')}`)) {
      return
    }

    setActionLoading(itemId)
    try {
      let result
      
      if (activeTab === 'products') {
        result = await window.electron.ipcRenderer.invoke('delete:hard-delete-product', { productId: itemId })
      } else if (activeTab === 'customers') {
        result = await window.electron.ipcRenderer.invoke('delete:hard-delete-customer', { customerId: itemId })
      } else {
        result = await window.electron.ipcRenderer.invoke('delete:hard-delete-user', { userId: itemId })
      }

      if (result.success) {
        // Remove from list
        setItems(items.filter(item => item.id !== itemId))
        alert(`"${itemName}" ${t('permanentlyDeleted')}`)
      } else {
        alert(`${t('cannotPermanentlyDelete')}: ${result.error}\n\nTip: ${t('mayHaveDependencies')}`)
      }
    } catch (error: any) {
      logger.error('Permanent delete failed:', error)
      alert(`${t('deleteFailed')}: ${error.message || 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.archiveReason?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Archive className="w-7 h-7 text-amber-600" />
          {t('archiveManagement')}
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {t('viewManageArchived')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors
                  ${isActive 
                    ? 'border-amber-600 text-amber-600 dark:text-amber-500' 
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${t('searchArchived')} ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={loadItems}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {searchQuery ? t('noResultsFound') : `${t('noArchived')} ${activeTab}`}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery 
              ? t('tryAdjustingSearch') 
              : `${activeTab === 'users' ? t('deactivatedWillAppearHere') : t('archivedWillAppearHere')} ${activeTab}`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    {item.category && (
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  
                  {(item.email || item.phone) && (
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {item.email && <span>{item.email}</span>}
                      {item.phone && <span>{item.phone}</span>}
                    </div>
                  )}
                  
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      {activeTab === 'users' ? t('deactivated') : t('archived')} {t('archiveOn')} {formatDate(item.archivedAt)} {t('archiveBy')} {item.archivedBy}
                    </div>
                    {item.archiveReason && (
                      <div className="italic">
                        {t('archiveReason')}: {item.archiveReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(item.id, item.name)}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
                  >
                    {actionLoading === item.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {activeTab === 'users' ? t('reactivate') : t('restore')}
                  </button>
                  
                  <button
                    onClick={() => handlePermanentDelete(item.id, item.name)}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
