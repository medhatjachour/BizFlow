/**
 * Stores Page
 * Manage store locations — list, create, edit, toggle status, delete
 */

import { useCallback } from 'react'
import AddStoreDialog from '@renderer/components/AddStoreDialog'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useStores } from './hooks/useStores'
import { useStoreForm } from './hooks/useStoreForm'
import { StoresHeader } from './components/StoresHeader'
import { StoresGrid } from './components/StoresGrid'
import { EditStoreModal } from './components/EditStoreModal'

export default function Stores(): JSX.Element {
  const { t } = useLanguage()

  const { stores, loading, loadStores, updateStore, deleteStore, toggleStatus } = useStores()

  const {
    formData,
    selectedStore,
    showAddModal,
    showEditModal,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    updateField,
  } = useStoreForm()

  const handleAddStore = useCallback(async () => {
    // Store was already created by AddStoreDialog; just refresh the list
    await loadStores()
  }, [loadStores])

  const handleEditStore = useCallback(async () => {
    if (!selectedStore) return

    const success = await updateStore(selectedStore.id, formData)
    if (success) {
      closeEditModal()
    } else {
      alert(t('failedToUpdateStore'))
    }
  }, [selectedStore, formData, updateStore, closeEditModal, t])

  return (
    <div className="p-6 space-y-6">
      <StoresHeader onAddStore={openAddModal} />

      <StoresGrid
        stores={stores}
        loading={loading}
        onEdit={openEditModal}
        onToggleStatus={toggleStatus}
        onDelete={deleteStore}
      />

      <AddStoreDialog
        isOpen={showAddModal}
        onClose={closeAddModal}
        onCreated={handleAddStore}
      />

      <EditStoreModal
        isOpen={showEditModal}
        formData={formData}
        onClose={closeEditModal}
        onSave={handleEditStore}
        onFieldChange={updateField}
      />
    </div>
  )
}