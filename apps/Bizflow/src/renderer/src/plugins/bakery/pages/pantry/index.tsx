import { useBakeryPantry } from './hooks/useBakeryPantry'
import { PantryKpiStrip } from './components/PantryKpiStrip'
import { PantryToolbar } from './components/PantryToolbar'
import { PantryTable } from './components/PantryTable'
import { PantryFormModal } from './components/PantryFormModal'
import { AdjustStockModal } from './components/AdjustStockModal'
import { ReceiveStockModal } from './components/ReceiveStockModal'
import { BulkRestockModal } from './components/BulkRestockModal'
import { DeleteIngredientModal } from './components/DeleteIngredientModal'

export default function PantryTab() {
  const {
    items,
    allItems,
    loading,
    summary,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFormModal,
    setShowFormModal,
    editingItem,
    openAdd,
    openEdit,
    adjustTarget,
    setAdjustTarget,
    reorderTarget,
    setReorderTarget,
    showBulkModal,
    setShowBulkModal,
    deletingId,
    setDeletingId,
    handleSaveIngredient,
    handleAdjustStock,
    handleReceiveReorder,
    handleBulkRestock,
    handleDelete,
  } = useBakeryPantry()

  const hasRestockItems = (summary.lowCount > 0 || summary.reorderCount > 0)

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Inventory Valuation & Alert KPI Cards */}
      <PantryKpiStrip
        totalValuation={summary.totalValuation}
        totalItems={summary.totalItems}
        lowCount={summary.lowCount}
        reorderCount={summary.reorderCount}
      />

      {/* 2. Search, Status Filter & Action Toolbar */}
      <PantryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        hasRestockItems={hasRestockItems}
        onBulkRestockClick={() => setShowBulkModal(true)}
        onAddClick={openAdd}
      />

      {/* 3. Main Pantry Table */}
      <PantryTable
        items={items}
        loading={loading}
        onAdjustClick={setAdjustTarget}
        onReorderClick={setReorderTarget}
        onEditClick={openEdit}
        onDeleteClick={id => setDeletingId(id)}
      />

      {/* 4. Add / Edit Ingredient Modal */}
      <PantryFormModal
        isOpen={showFormModal}
        existing={editingItem}
        allItems={allItems}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveIngredient}
      />

      {/* 5. Adjust Stock Level Modal */}
      <AdjustStockModal
        target={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onConfirm={handleAdjustStock}
      />

      {/* 6. Single Stock Delivery Receipt Modal */}
      <ReceiveStockModal
        target={reorderTarget}
        onClose={() => setReorderTarget(null)}
        onConfirm={handleReceiveReorder}
      />

      {/* 7. Bulk Restock Modal */}
      <BulkRestockModal
        isOpen={showBulkModal}
        allItems={allItems}
        onClose={() => setShowBulkModal(false)}
        onConfirm={handleBulkRestock}
      />

      {/* 8. Delete Confirmation Modal */}
      <DeleteIngredientModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
      />
    </div>
  )
}