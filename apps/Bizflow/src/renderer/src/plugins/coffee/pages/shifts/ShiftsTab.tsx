import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useShifts } from './hooks/useShifts'
import { SummaryCards } from './components/SummaryCards'
import { FilterBar } from './components/FilterBar'
import { ActiveShiftPanel } from './components/ActiveShiftPanel'
import { EmptyState } from './components/EmptyState'
import { ShiftCard } from './components/ShiftCard'
import { OpenShiftModal } from './components/OpenShiftModal'
import { CloseShiftModal } from './components/CloseShiftModal'
import { ShiftDetailDrawer } from './components/ShiftDetailDrawer'

export default function ShiftsTab() {
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const s = useShifts(toast, user)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Filter bar */}
      <FilterBar
        preset={s.preset}
        onPreset={s.setPreset}
        from={s.from}
        to={s.to}
        setFrom={s.setFrom}
        setTo={s.setTo}
        statusFilter={s.statusFilter}
        setStatusFilter={s.setStatusFilter}
        onRefresh={s.load}
        onOpenShift={s.openOpenModal}
        hasActiveShift={!!s.activeShift}
      />

      {/* Summary cards */}
      <SummaryCards summary={s.summary} loading={s.loading} />

      {/* Active shift panel */}
      {s.activeShift ? (
        <ActiveShiftPanel
          shift={s.activeShift}
          expectedDrawer={s.activeExpectedDrawer}
          onClose={s.openCloseModal}
        />
      ) : !s.loading && (
        <EmptyState onOpenShift={s.openOpenModal} />
      )}

      {/* History */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{t('cfShiftHistory')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {s.total} {t('cfShifts')} · {t('cfPage')} {s.page} {t('cfOf')} {s.totalPages || 1}
            </p>
          </div>
        </div>

        {s.history.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400">
            {s.loading ? t('cfLoading') : t('cfNoShiftHistory')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {s.history.map(shift => (
              <ShiftCard key={shift.id} shift={shift} onView={s.openDetail} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {s.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => s.setPage(Math.max(1, s.page - 1))}
              disabled={s.page === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {s.page} / {s.totalPages}
            </span>
            <button
              onClick={() => s.setPage(Math.min(s.totalPages, s.page + 1))}
              disabled={s.page === s.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <OpenShiftModal
        open={s.openModal}
        form={s.openForm}
        patchForm={s.patchOpenForm}
        onSubmit={s.submitOpen}
        onClose={s.closeOpenModal}
        saving={s.opening}
        user={user}
      />
      <CloseShiftModal
        open={s.closeModal}
        shift={s.activeShift}
        form={s.closeForm}
        patchForm={s.patchCloseForm}
        onSubmit={s.submitClose}
        onClose={s.closeCloseModal}
        saving={s.closing}
        expectedDrawer={s.activeExpectedDrawer}
        variance={s.activeVariance}
      />
      <ShiftDetailDrawer
        shift={s.detailShift}
        loading={s.loadingDetail}
        onClose={s.closeDetail}
      />
    </div>
  )
}
