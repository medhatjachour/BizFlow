import { useState, useEffect } from 'react'
import { Plus, Store, MapPin, Phone, Clock, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react'
import Modal from '@renderer/components/ui/Modal'
import AddStoreDialog from '@renderer/components/AddStoreDialog'
import { ipc } from '@renderer/utils/ipc'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'

type StoreType = {
  id: string
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: string
}

export default function Stores(): JSX.Element {
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    hours: '',
    manager: '',
    status: 'active'
  })
  const { t } = useLanguage()

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const data = await ipc.stores.getAll()
      setStores(data)
    } catch (error) {
      logger.error('Failed to load stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      phone: '',
      hours: '',
      manager: '',
      status: 'active'
    })
  }

  const handleAddStore = async () => {
    // Store was already created by AddStoreDialog; just refresh the list
    await loadStores()
  }

  const handleEditStore = async () => {
    if (!selectedStore) return
    
    try {
      const result = await ipc.stores.update(selectedStore.id, formData)
      if (result.success) {
        await loadStores()
        setShowEditModal(false)
        setSelectedStore(null)
        resetForm()
      }
    } catch (error) {
      logger.error('Failed to update store:', error)
      alert(t('failedToUpdateStore'))
    }
  }

  const handleDeleteStore = async (id: string) => {
    if (!confirm(t('confirmDeleteStore'))) return
    
    try {
      const result = await ipc.stores.delete(id)
      if (result.success) {
        await loadStores()
      }
    } catch (error) {
      logger.error('Failed to delete store:', error)
      alert(t('failedToDeleteStore'))
    }
  }

  const handleToggleStatus = async (store: StoreType) => {
    const newStatus = store.status === 'active' ? 'inactive' : 'active'
    try {
      const result = await ipc.stores.update(store.id, { ...store, status: newStatus })
      if (result.success) {
        await loadStores()
      }
    } catch (error) {
      logger.error('Failed to toggle store status:', error)
      alert(t('failedToToggleStatus'))
    }
  }

  const openEditModal = (store: StoreType) => {
    setSelectedStore(store)
    setFormData({
      name: store.name,
      location: store.location,
      phone: store.phone,
      hours: store.hours,
      manager: store.manager,
      status: store.status
    })
    setShowEditModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('storeManagement')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('storeManagementDesc')}</p>
        </div>
        <button 
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('addNewStore')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">{t('loadingStores')}</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Store size={48} className="mx-auto mb-4 text-slate-400 opacity-50" />
            <p className="text-slate-600 dark:text-slate-400">{t('noStoresYet')}</p>
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="glass-card glass-card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Store className="text-primary" size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${store.status === 'active' ? 'bg-success/10 text-success' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>
                  {store.status}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{store.name}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                  <MapPin size={16} />
                  {store.location}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                  <Phone size={16} />
                  {store.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                  <Clock size={16} />
                  {store.hours}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('manager')}: {store.manager}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(store)}
                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                    title={t('editStore')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(store)}
                    className={`p-2 rounded-lg transition-colors ${
                      store.status === 'active' 
                        ? 'hover:bg-error/10 text-error' 
                        : 'hover:bg-success/10 text-success'
                    }`}
                    title={store.status === 'active' ? t('deactivateStore') : t('activateStore')}
                  >
                    <ArrowRightLeft size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteStore(store.id)}
                    className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                    title={t('deleteStore')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Store Dialog (reusable component) */}
      <AddStoreDialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleAddStore}
      />

      {/* Edit Store Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false)
          setSelectedStore(null)
          resetForm()
        }} 
        title={t('editStore')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('storeName')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              placeholder={t('enterStoreName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('storeLocation')}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field w-full"
              placeholder={t('enterAddress')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('phone')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field w-full"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('hours')}
            </label>
            <input
              type="text"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              className="input-field w-full"
              placeholder="9 AM - 9 PM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('manager')}
            </label>
            <input
              type="text"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              className="input-field w-full"
              placeholder={t('managerName')}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleEditStore}
              className="btn-primary flex-1"
            >
              {t('save')}
            </button>
            <button
              onClick={() => {
                setShowEditModal(false)
                setSelectedStore(null)
                resetForm()
              }}
              className="btn-secondary flex-1"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
