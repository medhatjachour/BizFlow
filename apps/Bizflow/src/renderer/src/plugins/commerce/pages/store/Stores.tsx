import { useCallback, useEffect } from 'react'
import { Store as StoreIcon } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useStores } from './hooks/useStores'
import { useStoreForm } from './hooks/useStoreForm'
import { StoresStats } from './components/StoresStats'
import { StoresToolbar } from './components/StoresToolbar'
import { StoresGrid } from './components/StoresGrid'
import { EditStoreModal } from './components/EditStoreModal'

export default function Stores(): JSX.Element {
  const { t } = useLanguage()

  const {
    stores,
    loading,
    metrics,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    loadStores,
    createStore,
    updateStore,
    deleteStore,
    toggleStatus
  } = useStores()

  const {
    formData,
    selectedStore,
    isModalOpen,
    isEditMode,
    openCreateModal,
    openEditModal,
    closeModal,
    updateField
  } = useStoreForm()

  // Keyboard shortcut: Ctrl + N / Cmd + N to open creation dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openCreateModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCreateModal])

  // Unified save handler
  const handleSaveStore = useCallback(async () => {
    if (isEditMode && selectedStore) {
      const ok = await updateStore(selectedStore.id, formData)
      if (ok) closeModal()
    } else {
      const ok = await createStore(formData)
      if (ok) closeModal()
    }
  }, [isEditMode, selectedStore, formData, updateStore, createStore, closeModal])

  const handleDeleteWithConfirm = useCallback(
    async (id: string, name: string) => {
      if (confirm(`${t('confirmDeleteStore') || 'Are you sure you want to delete branch:'} "${name}"?`)) {
        await deleteStore(id, name)
      }
    },
    [deleteStore, t]
  )

  return (
    <div className="w-full space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
            <StoreIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {t('storeManagement') || 'Stores & Branch Registry'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('storeManagementDesc') || 'Configure multi-location branches, operating hours, and localized cash registers.'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <StoresStats metrics={metrics} />

      {/* Toolbar with Search, Status, Sort & View Switcher */}
      <StoresToolbar
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddStore={openCreateModal}
        onRefresh={loadStores}
      />

      {/* Dual Presentation Grid / Table */}
      <StoresGrid
        stores={stores}
        loading={loading}
        viewMode={viewMode}
        onEdit={openEditModal}
        onToggleStatus={toggleStatus}
        onDelete={handleDeleteWithConfirm}
        onAddStore={openCreateModal}
      />

      {/* Create / Edit Modal Dialog */}
      <EditStoreModal
        isOpen={isModalOpen}
        isEditMode={isEditMode}
        formData={formData}
        onClose={closeModal}
        onSave={handleSaveStore}
        onFieldChange={updateField}
      />
    </div>
  )
}