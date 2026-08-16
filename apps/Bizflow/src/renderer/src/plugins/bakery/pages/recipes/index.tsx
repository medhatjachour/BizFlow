import { BookOpen, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useBakeryRecipes } from './hooks/useBakeryRecipes'
import { RecipeKpiStrip } from './components/RecipeKpiStrip'
import { RecipeToolbar } from './components/RecipeToolbar'
import { RecipeAccordionCard } from './components/RecipeAccordionCard'
import { RecipeFormModal } from './components/RecipeFormModal'
import { ScalingCalculatorModal } from './components/ScalingCalculatorModal'
import { RecipeCardModal } from './components/RecipeCardModal'
import { DeleteRecipeModal } from './components/DeleteRecipeModal'

export default function RecipesTab() {
  const { t } = useLanguage()

  const {
    recipes,
    rawRecipes,
    loading,
    summaryKpis,
    searchQuery,
    setSearchQuery,
    expandedId,
    toggleExpand,
    formModalOpen,
    setFormModalOpen,
    editingRecipe,
    openCreate,
    openEdit,
    scalingRecipe,
    setScalingRecipe,
    cardRecipe,
    setCardRecipe,
    deletingId,
    setDeletingId,
    handleSaveRecipe,
    handleDeleteRecipe,
  } = useBakeryRecipes()

  if (loading && rawRecipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs">{t('bakeryLoadingRecipes') || 'Loading recipe formulas…'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Recipe & Formula Financial KPIs */}
      <RecipeKpiStrip
        totalRecipes={summaryKpis.totalRecipes}
        avgUnitCost={summaryKpis.avgUnitCost}
        avgMargin={summaryKpis.avgMargin}
        linkedProductsCount={summaryKpis.linkedProductsCount}
      />

      {/* 2. Search Toolbar & New Formula Action */}
      <RecipeToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreate={openCreate}
      />

      {/* 3. Empty State */}
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30 px-6">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">
            {t('bakeryNoRecipes') || 'No recipe formulas created'}
          </p>
          <p className="text-xs mt-1 text-slate-400 max-w-sm">
            {t('bakeryNoRecipesDesc') ||
              'Create recipes to calculate per-unit costs, automatically deplete pantry stocks on bake, and link to POS sales.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            {t('bakeryNewRecipe') || 'Create First Recipe'}
          </button>
        </div>
      ) : (
        /* 4. Interactive Formula Accordion Cards */
        <div className="space-y-3">
          {recipes.map(recipe => (
            <RecipeAccordionCard
              key={recipe.id}
              recipe={recipe}
              isOpen={expandedId === recipe.id}
              onToggle={() => toggleExpand(recipe.id)}
              onScaleClick={() => setScalingRecipe(recipe)}
              onCardClick={() => setCardRecipe(recipe)}
              onEditClick={() => openEdit(recipe)}
              onDeleteClick={() => setDeletingId(recipe.id)}
            />
          ))}
        </div>
      )}

      {/* 5. Create / Edit Recipe Modal */}
      <RecipeFormModal
        open={formModalOpen}
        recipe={editingRecipe}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveRecipe}
      />

      {/* 6. Scaling Calculator Modal */}
      <ScalingCalculatorModal
        recipe={scalingRecipe}
        onClose={() => setScalingRecipe(null)}
      />

      {/* 7. Printable Recipe Card Modal */}
      <RecipeCardModal
        recipe={cardRecipe}
        onClose={() => setCardRecipe(null)}
      />

      {/* 8. Delete Confirmation Dialog */}
      <DeleteRecipeModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteRecipe(deletingId)}
      />
    </div>
  )
}