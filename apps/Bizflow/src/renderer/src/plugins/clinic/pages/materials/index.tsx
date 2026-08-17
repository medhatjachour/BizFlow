import { useState } from 'react'

import { useMaterials } from './hooks/useMaterials'
import { useCategories } from './hooks/useCategories'
import { MaterialStatCards } from './components/MaterialStatCards'
import { MaterialToolbar } from './components/MaterialToolbar'
import { MaterialTable } from './components/MaterialTable'
import { MaterialPagination } from './components/MaterialPagination'
import { MaterialFormModal } from './components/MaterialFormModal'
import { CategoryManagementModal } from './components/CategoryManagementModal'
import { BatchManagementModal } from './components/BatchManagementModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import type { Material } from './types'

export default function MaterialsTab() {
  const {
    materials,
    stats,
    loading,
    total,
    hasMore,
    page,
    pageSize,
    search,
    categoryFilter,
    stockFilter,
    expiryFilter,
    sortBy,
    sortDir,
    hasActiveFilters,
    setSearch,
    setCategoryFilter,
    setStockFilter,
    setExpiryFilter,
    setSortBy,
    setSortDir,
    setPage,
    setPageSize,
    clearFilters,
    deleteMaterial,
    reload
  } = useMaterials()

  const { categories, reload: reloadCategories } = useCategories()

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [managingBatchesFor, setManagingBatchesFor] = useState<Material | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      <MaterialStatCards
        stats={stats}
        stockFilter={stockFilter}
        expiryFilter={expiryFilter}
        onSelectTotal={() => {
          setStockFilter('all')
          setExpiryFilter('all')
        }}
        onSelectLowStock={() => setStockFilter('low_stock')}
        onSelectExpired={() => setExpiryFilter('expired')}
        onSelectExpiringSoon={() => setExpiryFilter('expiring_soon')}
      />

      <MaterialToolbar
        search={search}
        categories={categories}
        categoryFilter={categoryFilter}
        stockFilter={stockFilter}
        expiryFilter={expiryFilter}
        sortBy={sortBy}
        sortDir={sortDir}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearch}
        onCategoryChange={setCategoryFilter}
        onStockChange={setStockFilter}
        onExpiryChange={setExpiryFilter}
        onSortByChange={setSortBy}
        onSortDirToggle={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
        onClearFilters={clearFilters}
        onRefresh={reload}
        onOpenCategories={() => setShowCategoryModal(true)}
        onOpenCreateModal={() => {
          setEditingMaterial(null)
          setShowFormModal(true)
        }}
      />

      <MaterialTable
        materials={materials}
        categories={categories}
        loading={loading}
        onManageBatches={(m) => setManagingBatchesFor(m)}
        onEdit={(m) => {
          setEditingMaterial(m)
          setShowFormModal(true)
        }}
        onDelete={(id) => setDeleteTargetId(id)}
        onAddNew={() => {
          setEditingMaterial(null)
          setShowFormModal(true)
        }}
      />

      {total > 0 && (
        <MaterialPagination
          page={page}
          pageSize={pageSize}
          total={total}
          count={materials.length}
          hasMore={hasMore}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {showFormModal && (
        <MaterialFormModal
          existing={editingMaterial}
          categories={categories}
          onClose={() => {
            setShowFormModal(false)
            setEditingMaterial(null)
          }}
          onSaved={() => {
            setShowFormModal(false)
            setEditingMaterial(null)
            reload()
          }}
        />
      )}

      {managingBatchesFor && (
        <BatchManagementModal
          material={managingBatchesFor}
          onClose={() => {
            setManagingBatchesFor(null)
            reload()
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryManagementModal
          onClose={() => {
            setShowCategoryModal(false)
            reloadCategories()
          }}
        />
      )}

      {deleteTargetId && (
        <DeleteConfirmModal
          onClose={() => setDeleteTargetId(null)}
          onConfirm={async () => {
            await deleteMaterial(deleteTargetId)
            setDeleteTargetId(null)
          }}
        />
      )}
    </div>
  )
}