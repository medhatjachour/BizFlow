import { useState } from 'react'
import { Stethoscope, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VetStaff } from './types'
import { useVetStaff } from './hooks/useVetStaff'
import { VetStaffToolbar } from './components/VetStaffToolbar'
import { StaffCard } from './components/StaffCard'
import { StaffTableView } from './components/StaffTableView'
import { VetStaffFormModal } from './components/VetStaffFormModal'
import { VetStaffProfileModal } from './components/VetStaffProfileModal'
import { StaffDeleteModal } from './components/StaffDeleteModal'

export default function VetStaffTab() {
  const toast = useToast()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    staffList,
    filteredCount,
    metrics,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    empTypeFilter,
    setEmpTypeFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    refresh
  } = useVetStaff()

  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<VetStaff | null>(null)
  const [profileStaff, setProfileStaff] = useState<VetStaff | null>(null)
  const [deleteStaff, setDeleteStaff] = useState<VetStaff | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaved = () => {
    setShowForm(false)
    setEditingStaff(null)
    refresh()
    toast.success(isAr ? 'تم حفظ بيانات الطبيب البيطري' : 'Veterinarian profile saved')
  }

  const handleDelete = async () => {
    if (!deleteStaff) return
    setIsDeleting(true)
    try {
      await window.api.vet?.staff.delete(deleteStaff.id)
      setDeleteStaff(null)
      refresh()
      toast.success(isAr ? 'تمت إزالة الطبيب البيطري بنجاح' : 'Veterinarian removed successfully')
    } catch (err: any) {
      toast.error(err.message ?? (isAr ? 'فشل الحذف' : 'Failed to remove veterinarian'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Dynamic Senior Toolbar */}
      <VetStaffToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        empTypeFilter={empTypeFilter}
        onEmpTypeFilterChange={setEmpTypeFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortAsc={sortAsc}
        onToggleSortOrder={() => setSortAsc((prev) => !prev)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddStaff={() => {
          setEditingStaff(null)
          setShowForm(true)
        }}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        metrics={metrics}
      />

      {/* Showing Count Information */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{filteredCount}</span>{' '}
          {isAr ? 'من إجمالي' : 'of'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{metrics.total}</span>{' '}
          {isAr ? 'أطباء بيطريين' : 'registered veterinarians'}
        </p>
      </div>

      {/* Main Content Area */}
      {loading && staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل الفريق البيطري...' : 'Loading Medical Team…'}
          </p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-inner">
            <Stethoscope size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {search
              ? (isAr ? 'لم يتم العثور على أطباء يطابقون بحثك' : 'No veterinarians match your search criteria')
              : (isAr ? 'لا يوجد أطباء بيطريين مسجلين بعد' : 'No veterinarians registered yet')}
          </p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            {search
              ? (isAr ? 'جرب البحث باسم آخر، رقم هاتف أو قم بإلغاء التصفية' : 'Try searching with a different name or clearing active filters')
              : (isAr ? 'أضف أول طبيب بيطري للبدء في تعيين المواعيد وإدارة الجلسات السريرية' : 'Add your clinic veterinary doctors to manage consultations and appointments')}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => {
                setEditingStaff(null)
                setShowForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
            >
              <Plus size={15} />
              <span>{isAr ? 'إضافة أول طبيب بيطري' : 'Add First Veterinarian'}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              onViewProfile={() => setProfileStaff(s)}
              onEdit={() => {
                setEditingStaff(s)
                setShowForm(true)
              }}
              onDelete={() => setDeleteStaff(s)}
            />
          ))}
        </div>
      ) : (
        <StaffTableView
          staffList={staffList}
          onViewProfile={(s) => setProfileStaff(s)}
          onEdit={(s) => {
            setEditingStaff(s)
            setShowForm(true)
          }}
          onDelete={(s) => setDeleteStaff(s)}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <VetStaffFormModal
          staff={editingStaff}
          onSave={handleSaved}
          onClose={() => {
            setShowForm(false)
            setEditingStaff(null)
          }}
        />
      )}

      {/* Profile Modal */}
      {profileStaff && (
        <VetStaffProfileModal
          staff={profileStaff}
          onClose={() => setProfileStaff(null)}
          onEdit={() => {
            setEditingStaff(profileStaff)
            setProfileStaff(null)
            setShowForm(true)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <StaffDeleteModal
        staff={deleteStaff}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteStaff(null)}
      />
    </div>
  )
}