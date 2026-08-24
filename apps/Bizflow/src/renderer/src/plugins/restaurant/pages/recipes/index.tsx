import { useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Utensils } from 'lucide-react'
import { useRecipes } from './hooks/useRecipes'
import { RecipeCard } from './components/RecipeCard'
import { RecipeBuilderModal } from './components/RecipeBuilderModal'
import { MenuItemRecipeData } from './types'

export default function RecipesPage() {
  const {
    recipes,
    menuItems,
    ingredients,
    loading,
    error,
    refreshRecipes,
    saveRecipe,
    deleteRecipe
  } = useRecipes()

  const [showModal, setShowModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<MenuItemRecipeData | null>(null)

  const handleOpenAdd = () => {
    setEditingRecipe(null)
    setShowModal(true)
  }

  const handleOpenEdit = (rec: MenuItemRecipeData) => {
    setEditingRecipe(rec)
    setShowModal(true)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Recipe Bill of Materials (BOM)
          </h3>
          <p className="text-xs text-slate-400">
            Map menu items to raw ingredients for automated stock depletion and real-time food costing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshRecipes}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-orange-500/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Recipe BOM</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recipes Grid */}
      {loading && recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">Loading recipe mappings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((rec) => (
            <RecipeCard
              key={rec.id}
              recipe={rec}
              onEdit={handleOpenEdit}
              onDelete={deleteRecipe}
            />
          ))}

          {recipes.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
              <Utensils className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Recipe BOMs Configured
              </h3>
              <p className="text-xs text-slate-400">
                Link raw ingredients to menu dishes to enable automated stock deduction.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recipe Builder Modal */}
      <RecipeBuilderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingRecipe={editingRecipe}
        menuItems={menuItems}
        ingredientsList={ingredients}
        onSave={saveRecipe}
      />
    </div>
  )
}