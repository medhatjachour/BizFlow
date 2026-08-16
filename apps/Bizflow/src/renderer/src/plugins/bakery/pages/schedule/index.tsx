import Pagination from '../components/Pagination'
import { PAGE_SIZES } from './constants'
import { useBakerySchedule } from './hooks/useBakerySchedule'
import { ScheduleStatsCards } from './components/ScheduleStatsCards'
import { ScheduleToolbar } from './components/ScheduleToolbar'
import { ScheduleList } from './components/ScheduleList'
import { ScheduleFormModal } from './components/ScheduleFormModal'
import { CompleteModal } from './components/CompleteModal'
import { DeleteScheduleConfirmModal } from './components/DeleteScheduleConfirmModal'

export default function ScheduleTab() {
  const {
    items,
    filteredCount,
    recipes,
    loading,
    refreshing,
    actioningId,
    counts,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    showFormModal,
    setShowFormModal,
    completeItem,
    setCompleteItem,
    deletingId,
    setDeletingId,
    handleCreate,
    handleUpdateStatus,
    handleDelete,
    refresh,
  } = useBakerySchedule()

  const hasFilters = search !== '' || statusFilter !== 'all' || dateRange !== 'all'

  return (
    <div className="space-y-5 pb-4">
      {/* 1. Production Status KPI Bar */}
      <ScheduleStatsCards
        counts={counts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* 2. Search, Filters & Actions Toolbar */}
      <ScheduleToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        overdueCount={counts.overdue}
        refreshing={refreshing}
        onRefresh={refresh}
        onAddClick={() => setShowFormModal(true)}
      />

      {/* 3. Grouped Production Run List */}
      <ScheduleList
        items={items}
        loading={loading}
        hasFilters={hasFilters}
        actioningId={actioningId}
        onStatusUpdate={handleUpdateStatus}
        onCompleteClick={setCompleteItem}
        onDeleteClick={id => setDeletingId(id)}
        onAddClick={() => setShowFormModal(true)}
        onClearFilters={() => {
          setSearch('')
          setStatusFilter('all')
          setDateRange('all')
        }}
      />

      {/* 4. Desktop Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filteredCount}
            onPage={setPage}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            onPageSize={ps => {
              setPageSize(ps)
              setPage(1)
            }}
          />
        </div>
      )}

      {/* 5. Schedule Creation Modal */}
      <ScheduleFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleCreate}
        recipes={recipes}
      />

      {/* 6. Batch Completion Quantity Modal */}
      {completeItem && (
        <CompleteModal
          item={completeItem}
          onConfirm={qty => handleUpdateStatus(completeItem.id, 'completed', qty)}
          onCancel={() => setCompleteItem(null)}
        />
      )}

      {/* 7. Delete Confirmation Modal */}
      <DeleteScheduleConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
      />
    </div>
  )
}