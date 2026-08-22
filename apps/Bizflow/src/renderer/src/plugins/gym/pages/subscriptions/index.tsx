import { Loader2 } from 'lucide-react'
import { useSubscriptions } from './hooks/useSubscriptions'
import { SubscriptionToolbar } from './components/SubscriptionToolbar'
import { SubscriptionStatsStrip } from './components/SubscriptionStatsStrip'
import { SubscriptionCard } from './components/SubscriptionCard'
import { SubscriptionTable } from './components/SubscriptionTable'
import { SubscriptionFormModal } from './components/SubscriptionFormModal'
import { FreezeSubscriptionModal } from './components/FreezeSubscriptionModal'
import { DeleteSubscriptionModal } from './components/DeleteSubscriptionModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function SubscriptionsTab() {
  const { t } = useLanguage()
  const {
    subs,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    expiringSoonCount,
    loading,
    formOpen,
    setFormOpen,
    renewTarget,
    setRenewTarget,
    freezeTarget,
    setFreezeTarget,
    freezeDays,
    setFreezeDays,
    deleteTarget,
    setDeleteTarget,
    actingId,
    handleFreeze,
    handleUnfreeze,
    handleDelete,
    handleRenew,
    reload
  } = useSubscriptions()

  const handleOpenAdd = () => {
    setRenewTarget(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <SubscriptionToolbar
        activeFilter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        expiringCount={expiringSoonCount}
        loading={loading}
        onRefresh={reload}
        onAddNew={handleOpenAdd}
      />

      {/* KPI Overview Summary */}
      <SubscriptionStatsStrip subscriptions={subs} />

      {/* Main Content Pane */}
      {loading && subs.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {searchQuery
              ? 'No subscriptions match your search filter'
              : t('gymNoSubscriptions') || 'No subscriptions recorded in this category'}
          </p>
          {!searchQuery && (
            <p className="text-xs text-slate-400 mt-1">
              Click "New Subscription" to enroll a member into a membership plan.
            </p>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subs.map(sub => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  actingId={actingId}
                  onFreezeClick={setFreezeTarget}
                  onUnfreezeClick={handleUnfreeze}
                  onRenewClick={handleRenew}
                  onDeleteClick={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <SubscriptionTable
              subscriptions={subs}
              actingId={actingId}
              onFreezeClick={setFreezeTarget}
              onUnfreezeClick={handleUnfreeze}
              onRenewClick={handleRenew}
              onDeleteClick={setDeleteTarget}
            />
          )}
        </>
      )}

      {/* Registration & Renewal Form Modal */}
      <SubscriptionFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setRenewTarget(null)
        }}
        onSaved={reload}
        renewTarget={renewTarget}
      />

      {/* Freeze Confirmation Modal */}
      <FreezeSubscriptionModal
        target={freezeTarget}
        freezeDays={freezeDays}
        onFreezeDaysChange={setFreezeDays}
        acting={!!actingId}
        onClose={() => setFreezeTarget(null)}
        onConfirm={handleFreeze}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSubscriptionModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}