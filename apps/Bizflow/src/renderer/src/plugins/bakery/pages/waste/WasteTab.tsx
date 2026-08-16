import Pagination from '../components/Pagination'
import { useBakeryWaste } from './hooks/useBakeryWaste'
import { WasteSummaryCards } from './components/WasteSummaryCards'
import { WasteBreakdown } from './components/WasteBreakdown'
import { WasteToolbar } from './components/WasteToolbar'
import { WasteTable } from './components/WasteTable'
import { WasteFormModal } from './components/WasteFormModal'
import { DeleteWasteConfirmModal } from './components/DeleteWasteConfirmModal'

export default function WasteTab() {
  const {
    logs,
    totalLogs,
    page,
    totalPages,
    pageSize,
    setPage,
    recipes,
    pantryItems,
    summary,
    loading,
    filterType,
    applyTypeFilter,
    filterReason,
    setFilterReason,
    searchQuery,
    setSearchQuery,
    showForm,
    setShowForm,
    deletingId,
    setDeletingId,
    handleSaveWaste,
    handleDeleteWaste,
  } = useBakeryWaste()

  return (
    <div className="space-y-6">
      {/* 1. KPI Financial Impact Cards */}
      <WasteSummaryCards summary={summary} />

      {/* 2. Visual Loss Breakdown Bar */}
      <WasteBreakdown summary={summary} />

      {/* 3. Filter and Action Toolbar */}
      <WasteToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={applyTypeFilter}
        filterReason={filterReason}
        onFilterReasonChange={setFilterReason}
        onAddClick={() => setShowForm(true)}
      />

      {/* 4. Interactive Waste Data Table */}
      <WasteTable
        logs={logs}
        loading={loading}
        onDelete={id => setDeletingId(id)}
      />

      {/* 5. Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalLogs}
            onPage={setPage}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* 6. Form Modal */}
      <WasteFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveWaste}
        pantryItems={pantryItems}
        recipes={recipes}
      />

      {/* 7. Delete Confirmation Dialog */}
      <DeleteWasteConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteWaste(deletingId)}
      />
    </div>
  )
}