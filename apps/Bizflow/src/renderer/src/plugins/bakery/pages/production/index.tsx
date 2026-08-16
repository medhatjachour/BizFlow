import { useState } from 'react'
import { useBakeryProduction } from './hooks/useBakeryProduction'
import { ProductionKpiStrip } from './components/ProductionKpiStrip'
import { ProductionCapacityBanner } from './components/ProductionCapacityBanner'
import { ProductionToolbar } from './components/ProductionToolbar'
import { ProductionBatchTable } from './components/ProductionBatchTable'
import { LogProductionModal } from './components/LogProductionModal'
import { ProductionConfirmModal } from './components/ProductionConfirmModal'
import { QuickSellBatchModal } from './components/QuickSellBatchModal'
import { LogLossBatchModal } from './components/LogLossBatchModal'
import { DeleteBatchConfirmModal } from './components/DeleteBatchConfirmModal'

export default function ProductionTab() {
  const {
    batches,
    pagedBatches,
    recipes,
    capacity,
    loading,
    summaryKpis,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    showLogModal,
    setShowLogModal,
    confirmParams,
    setConfirmParams,
    quickSellBatch,
    setQuickSellBatch,
    logLossBatch,
    setLogLossBatch,
    deletingId,
    setDeletingId,
    handleCommitProduction,
    handleQuickSell,
    handleLogLoss,
    handleDeleteBatch,
  } = useBakeryProduction()

  const [selectedRecipeIdToBake, setSelectedRecipeIdToBake] = useState<string | undefined>()

  const handleOpenLogWithRecipe = (recipeId: string) => {
    setSelectedRecipeIdToBake(recipeId)
    setShowLogModal(true)
  }

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Production Financial & Volume KPIs */}
      <ProductionKpiStrip
        totalBatches={summaryKpis.totalBatches}
        totalProduced={summaryKpis.totalProduced}
        totalSold={summaryKpis.totalSold}
        totalLost={summaryKpis.totalLost}
      />

      {/* 2. Pantry Capacity Estimator Banner */}
      <ProductionCapacityBanner
        capacity={capacity}
        onSelectRecipeToBake={handleOpenLogWithRecipe}
      />

      {/* 3. Search Toolbar & Primary Action */}
      <ProductionToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenLogModal={() => {
          setSelectedRecipeIdToBake(undefined)
          setShowLogModal(true)
        }}
      />

      {/* 4. Production Batch Table */}
      <ProductionBatchTable
        batches={batches}
        pagedBatches={pagedBatches}
        loading={loading}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={ps => {
          setPageSize(ps)
          setPage(1)
        }}
        onSellClick={setQuickSellBatch}
        onLossClick={setLogLossBatch}
        onDeleteClick={id => setDeletingId(id)}
        onLogProductionClick={() => setShowLogModal(true)}
      />

      {/* 5. Step 1: Log Production Parameters Modal */}
      <LogProductionModal
        isOpen={showLogModal}
        recipes={recipes}
        capacity={capacity}
        preselectedRecipeId={selectedRecipeIdToBake}
        onClose={() => setShowLogModal(false)}
        onProceedToConfirm={params => {
          setShowLogModal(false)
          setConfirmParams(params)
        }}
      />

      {/* 6. Step 2: Ingredient Deduction Verification Modal */}
      {confirmParams && (
        <ProductionConfirmModal
          recipeId={confirmParams.recipeId}
          quantity={confirmParams.quantity}
          batchDate={confirmParams.batchDate}
          notes={confirmParams.notes}
          onClose={() => {
            setConfirmParams(null)
            setShowLogModal(true)
          }}
          onConfirm={() => handleCommitProduction(confirmParams)}
        />
      )}

      {/* 7. Quick Sell Batch Modal */}
      <QuickSellBatchModal
        batch={quickSellBatch}
        onClose={() => setQuickSellBatch(null)}
        onSell={handleQuickSell}
      />

      {/* 8. Log Waste / Loss Modal */}
      <LogLossBatchModal
        batch={logLossBatch}
        onClose={() => setLogLossBatch(null)}
        onConfirmLoss={handleLogLoss}
      />

      {/* 9. Delete Confirmation Dialog */}
      <DeleteBatchConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteBatch(deletingId)}
      />
    </div>
  )
}