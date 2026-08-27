
import { useState } from 'react'
import { Activity, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VetSessionRecord } from './types'
import { useVetSessions } from './hooks/useVetSessions'
import { useVisitTypes } from './hooks/useVisitTypes'
import { VetSessionsToolbar } from './components/VetSessionsToolbar'
import { SessionKpiCards } from './components/SessionKpiCards'
import { SessionTableView } from './components/SessionTableView'
import { SessionCard } from './components/SessionCard'
import { VetSessionFormModal } from './components/VetSessionFormModal'
import { SessionDetailModal } from './components/SessionDetailModal'
import { QuickPaymentModal } from './components/QuickPaymentModal'
import { SessionDeleteModal } from './components/SessionDeleteModal'
import { VetVisitTypesManager } from './components/VetVisitTypesManager'

export default function VetSessionsTab() {
  const toast = useToast()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    sessions,
    filteredCount,
    metrics,
    total,
    loading,
    isRefreshing,
    refresh,
    loadMore,
    updateSessionRecord,
    search,
    setSearch,
    visitTypeFilter,
    setVisitTypeFilter,
    paymentFilter,
    setPaymentFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode
  } = useVetSessions()

  const { hexColor, badgeClass, options: visitTypeOptions, reload: reloadVisitTypes } = useVisitTypes()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<VetSessionRecord | null>(null)
  const [viewTarget, setViewTarget] = useState<VetSessionRecord | null>(null)
  const [payTarget, setPayTarget] = useState<VetSessionRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VetSessionRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTypeMgr, setShowTypeMgr] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.sessions.delete(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
      toast.success(isAr ? 'تم حذف الجلسة العلاجية بنجاح' : 'Session record deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Interactive Toolbar */}
      <VetSessionsToolbar
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customRange.from}
        customTo={customRange.to}
        onCustomChange={(from, to) => setCustomRange({ from, to })}
        search={search}
        onSearchChange={setSearch}
        visitTypeFilter={visitTypeFilter}
        onVisitTypeFilterChange={setVisitTypeFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortAsc={sortAsc}
        onToggleSortOrder={() => setSortAsc((p) => !p)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddSession={() => {
          setEditTarget(null)
          setShowForm(true)
        }}
        onManageTypes={() => setShowTypeMgr(true)}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        visitTypeOptions={visitTypeOptions}
      />

      {/* Clinical KPI Summary */}
      <SessionKpiCards metrics={metrics} />

      {/* Showing Count Information */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{filteredCount}</span>{' '}
          {isAr ? 'من إجمالي' : 'of'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{total}</span>{' '}
          {isAr ? 'جلسات بيطرية' : 'clinical sessions'}
        </p>
      </div>

      {/* Main Content Area */}
      {loading && sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل الجلسات السريرية...' : 'Loading Clinical Sessions…'}
          </p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-inner">
            <Activity size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {search || visitTypeFilter !== 'all' || paymentFilter !== 'all'
              ? (isAr ? 'لم يتم العثور على جلسات تطابق البحث' : 'No sessions match your search or filter')
              : (isAr ? 'لا توجد جلسات علاجية مسجلة في هذه الفترة' : 'No clinical sessions recorded in this period')}
          </p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            {isAr
              ? 'سجل الزيارات الطبية، التشخيص، العلامات الحيوية والوصفات الدوائية'
              : 'Record patient examinations, diagnoses, vital signs, prescriptions, and billing'}
          </p>
          {!search && visitTypeFilter === 'all' && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null)
                setShowForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
            >
              <Plus size={15} />
              <span>{isAr ? 'تسجيل أول جلسة' : 'Record First Session'}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <SessionTableView
              sessions={sessions}
              hexColor={hexColor}
              badgeClass={badgeClass}
              onView={(s) => setViewTarget(s)}
              onEdit={(s) => {
                setEditTarget(s)
                setShowForm(true)
              }}
              onDelete={(s) => setDeleteTarget(s)}
              onPay={(s) => setPayTarget(s)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  hexColor={hexColor}
                  badgeClass={badgeClass}
                  onView={() => setViewTarget(s)}
                  onEdit={() => {
                    setEditTarget(s)
                    setShowForm(true)
                  }}
                  onDelete={() => setDeleteTarget(s)}
                  onPay={() => setPayTarget(s)}
                />
              ))}
            </div>
          )}

          {sessions.length < total && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>
                  {isAr ? `تحميل المزيد (${total - sessions.length} متبقي)` : `Load more (${total - sessions.length} remaining)`}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Session Form Modal */}
      {showForm && (
        <VetSessionFormModal
          session={editTarget}
          onSave={() => {
            setShowForm(false)
            setEditTarget(null)
            refresh()
            toast.success(isAr ? 'تم حفظ الجلسة بنجاح' : 'Session saved successfully')
          }}
          onClose={() => {
            setShowForm(false)
            setEditTarget(null)
          }}
        />
      )}

      {/* Clinical Details Modal */}
      {viewTarget && (
        <SessionDetailModal
          session={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => {
            setEditTarget(viewTarget)
            setViewTarget(null)
            setShowForm(true)
          }}
        />
      )}

      {/* Quick Payment Settlement Modal */}
      {payTarget && (
        <QuickPaymentModal
          session={payTarget}
          onSuccess={(updated) => updateSessionRecord(updated)}
          onClose={() => setPayTarget(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <SessionDeleteModal
        session={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Visit Types Manager */}
      {showTypeMgr && (
        <VetVisitTypesManager
          onClose={() => setShowTypeMgr(false)}
          onChanged={reloadVisitTypes}
        />
      )}
    </div>
  )
}