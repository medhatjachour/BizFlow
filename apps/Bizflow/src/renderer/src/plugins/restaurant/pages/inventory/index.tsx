import { useState } from 'react'
import { AlertCircle, Package, RefreshCw } from 'lucide-react'
import { useInventory } from './hooks/useInventory'
import { InventoryToolbar } from './components/InventoryToolbar'
import { IngredientCard } from './components/IngredientCard'
import { IngredientFormModal } from './components/IngredientFormModal'
import { AdjustStockModal } from './components/AdjustStockModal'
import { IngredientData } from './types'

export default function RestaurantInventoryPage() {
  const {
    ingredients,
    categories,
    loading,
    error,
    stats,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    showLowStockOnly,
    setShowLowStockOnly,
    refreshInventory,
    saveIngredient,
    adjustStock,
    deleteIngredient
  } = useInventory()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<IngredientData | null>(null)
  const [adjustingIngredient, setAdjustingIngredient] = useState<IngredientData | null>(null)

  const handleOpenAdd = () => {
    setEditingIngredient(null)
    setShowAddModal(true)
  }

  const handleOpenEdit = (ing: IngredientData) => {
    setEditingIngredient(ing)
    setShowAddModal(true)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Toolbar & Summary KPIs */}
      <InventoryToolbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showLowStockOnly={showLowStockOnly}
        onToggleLowStockOnly={() => setShowLowStockOnly(!showLowStockOnly)}
        stats={stats}
        onOpenAddModal={handleOpenAdd}
        onRefresh={refreshInventory}
        loading={loading}
      />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingredients Grid */}
      {loading && ingredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">Loading pantry inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {ingredients.map((ing) => (
            <IngredientCard
              key={ing.id}
              ingredient={ing}
              onAdjustStock={setAdjustingIngredient}
              onEdit={handleOpenEdit}
              onDelete={deleteIngredient}
            />
          ))}

          {ingredients.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Ingredients Found
              </h3>
              <p className="text-xs text-slate-400">
                Click "+ New Ingredient" to start tracking raw food materials.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <IngredientFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingIngredient={editingIngredient}
        existingCategories={categories}
        onSave={saveIngredient}
      />

      <AdjustStockModal
        isOpen={Boolean(adjustingIngredient)}
        onClose={() => setAdjustingIngredient(null)}
        ingredient={adjustingIngredient}
        onAdjust={adjustStock}
      />
    </div>
  )
}