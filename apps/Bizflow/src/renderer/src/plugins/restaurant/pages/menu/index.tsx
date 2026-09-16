import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useMenuManagement } from './hooks/useMenuManagement'
import { MenuToolbar } from './components/MenuToolbar'
import { MenuItemRow } from './components/MenuItemRow'
import { MenuItemFormModal } from './components/MenuItemFormModal'
import { RecipeCostBreakdownDrawer } from './components/RecipeCostBreakdownDrawer'
import { RecipeEditorModal } from './components/RecipeEditorModal'
import { MenuItemData } from './types'

export default function MenuEngineeringPage() {
  const { t } = useLanguage()
  const {
    groupedByCategory,
    categories,
    loading,
    error,
    stats,
    selectedCategory,
    setSelectedCategory,
    selectedStation,
    setSelectedStation,
    searchQuery,
    setSearchQuery,
    showOutOfStockOnly,
    setShowOutOfStockOnly,
    refreshMenu,
    toggleItem86,
    saveItem,
    deleteItem,
    ingredients,
    saveRecipe,
    deleteRecipe
  } = useMenuManagement()

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null)
  const [breakdownItem, setBreakdownItem] = useState<MenuItemData | null>(null)
  const [recipeItem, setRecipeItem] = useState<MenuItemData | null>(null)
  const [recipeSaved, setRecipeSaved] = useState(false)

  // The recipe editor closes on success, so the confirmation has to live on the
  // page. Auto-dismisses so it never needs manual clearing.
  useEffect(() => {
    if (!recipeSaved) return
    const timer = window.setTimeout(() => setRecipeSaved(false), 4000)
    return () => window.clearTimeout(timer)
  }, [recipeSaved])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleOpenEdit = (item: MenuItemData) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleSaveRecipe = async (
    menuItemId: string,
    payload: {
      yieldCount: number
      prepNotes: string
      ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
    }
  ) => {
    const ok = await saveRecipe(menuItemId, payload)
    if (ok) {
      setRecipeItem(null)
      setBreakdownItem(null)
      setRecipeSaved(true)
    }
    return ok
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Menu Toolbar & Telemetry */}
      <MenuToolbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showOutOfStockOnly={showOutOfStockOnly}
        onToggleOutOfStockOnly={() => setShowOutOfStockOnly(!showOutOfStockOnly)}
        stats={stats}
        onOpenAddModal={handleOpenAdd}
        onRefresh={refreshMenu}
        loading={loading}
      />

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {recipeSaved && (
        <div
          role="status"
          className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{t('restRecipeSaved')}</span>
          <button
            type="button"
            onClick={() => setRecipeSaved(false)}
            aria-label={t('restRecipeCancel')}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Menu Catalog Grouped by Category */}
      {loading && Object.keys(groupedByCategory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
          <p className="text-xs font-bold text-slate-400">{t('restMenuLoading')}</p>
        </div>
      ) : Object.keys(groupedByCategory).length === 0 ? (
        <div className="py-20 px-6 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t('restMenuEmptyTitle')}
          </h3>
          <p className="text-xs text-slate-400">{t('restMenuEmptyBody')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([cat, catItems]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {cat} ({catItems.length})
                </h3>
              </div>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onOpenCostBreakdown={setBreakdownItem}
                    onToggle86={toggleItem86}
                    onEdit={handleOpenEdit}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Cost Breakdown (read-only bill of materials) */}
      <RecipeCostBreakdownDrawer
        item={breakdownItem}
        onClose={() => setBreakdownItem(null)}
        onOpenEditRecipe={(item) => {
          setBreakdownItem(null)
          setRecipeItem(item)
        }}
      />

      {/* Recipe (bill of materials) authoring */}
      {recipeItem && (
        <RecipeEditorModal
          isOpen
          onClose={() => setRecipeItem(null)}
          item={recipeItem}
          ingredients={ingredients}
          onSave={handleSaveRecipe}
          onDelete={deleteRecipe}
        />
      )}

      {/* Add / Edit Form Modal */}
      <MenuItemFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingItem={editingItem}
        existingCategories={categories}
        onSave={saveItem}
      />
    </div>
  )
}
