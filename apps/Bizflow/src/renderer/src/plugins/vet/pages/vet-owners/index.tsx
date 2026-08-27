import { useState } from 'react'
import { Users, Plus, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VetOwnerWithPets, VetOwner, VetPatient } from './types'
import { useVetOwners } from './hooks/useVetOwners'
import { VetOwnersToolbar } from './components/VetOwnersToolbar'
import { OwnerCard } from './components/OwnerCard'
import { OwnerTableView } from './components/OwnerTableView'
import { VetPatientFormModal } from './components/VetPatientFormModal'
import { VetOwnerProfileModal } from './components/VetOwnerProfileModal'
import { OwnerDeleteModal } from './components/OwnerDeleteModal'
import { VetSessionFormModal } from '../vet-sessions/components/VetSessionFormModal'
import { VetAppointmentFormModal } from '../vet-appointments/components/VetAppointmentFormModal'
import VetOwnerFormModal from './components/VetOwnerFormModal'

export default function VetOwnersTab() {
  const toast = useToast()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    owners,
    total,
    loading,
    isRefreshing,
    refresh,
    loadMore,
    search,
    setSearch,
    viewMode,
    setViewMode
  } = useVetOwners()

  // Modals
  const [showOwnerForm, setShowOwnerForm] = useState(false)
  const [editingOwner, setEditingOwner] = useState<VetOwnerWithPets | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VetOwnerWithPets | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [profileOwner, setProfileOwner] = useState<VetOwnerWithPets | null>(null)
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [preselectedOwner, setPreselectedOwner] = useState<VetOwner | null>(null)

  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showApptForm, setShowApptForm] = useState(false)
  const [preselectedPatient, setPreselectedPatient] = useState<VetPatient | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.owners.delete(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
      toast.success(isAr ? 'تم حذف المالك بنجاح' : 'Owner removed successfully')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const openAddPet = (owner: VetOwnerWithPets) => {
    setPreselectedOwner(owner)
    setShowPatientForm(true)
  }

  const openWalkIn = (patient: any) => {
    setPreselectedPatient(patient)
    setShowSessionForm(true)
  }

  const openBooking = (patient: any) => {
    setPreselectedPatient(patient)
    setShowApptForm(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Toolbar */}
      <VetOwnersToolbar
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddOwner={() => {
          setEditingOwner(null)
          setShowOwnerForm(true)
        }}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        totalOwners={total}
      />

      {/* Count Info */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{owners.length}</span>{' '}
          {isAr ? 'من إجمالي' : 'of'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{total}</span>{' '}
          {isAr ? 'ملاك مسجلين' : 'registered owners'}
        </p>
      </div>

      {/* Main Content Area */}
      {loading && owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل الملاك...' : 'Loading Pet Owners…'}
          </p>
        </div>
      ) : owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-inner">
            <Users size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {search
              ? (isAr ? 'لم يتم العثور على ملاك يطابقون بحثك' : 'No owners match your search')
              : (isAr ? 'لا يوجد ملاك مسجلين بعد' : 'No pet owners registered yet')}
          </p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            {isAr
              ? 'سجل ملاك الحيوانات الأليفة لإدارة ملفاتهم الطبية والمواعيد'
              : 'Register pet owners to manage their pets, medical records, and billing'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => {
                setEditingOwner(null)
                setShowOwnerForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
            >
              <Plus size={15} />
              <span>{isAr ? 'تسجيل أول مالك' : 'Register First Owner'}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-4  lg:grid-cols-3">
              {owners.map((owner) => (
                <OwnerCard
                  key={owner.id}
                  owner={owner}
                  onViewProfile={() => setProfileOwner(owner)}
                  onEdit={() => {
                    setEditingOwner(owner)
                    setShowOwnerForm(true)
                  }}
                  onDelete={() => setDeleteTarget(owner)}
                  onAddPet={() => openAddPet(owner)}
                  onWalkIn={openWalkIn}
                  onBook={openBooking}
                  onViewPet={(petId) => navigate(`/vet/patients/${petId}`)}
                />
              ))}
            </div>
          ) : (
            <OwnerTableView
              owners={owners}
              onViewProfile={(o) => setProfileOwner(o)}
              onEdit={(o) => {
                setEditingOwner(o)
                setShowOwnerForm(true)
              }}
              onDelete={(o) => setDeleteTarget(o)}
              onAddPet={(o) => openAddPet(o)}
            />
          )}

          {owners.length < total && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>
                  {isAr ? `تحميل المزيد (${total - owners.length} متبقي)` : `Load more (${total - owners.length} remaining)`}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showOwnerForm && (
        <VetOwnerFormModal
          owner={editingOwner}
          onSave={() => {
            setShowOwnerForm(false)
            setEditingOwner(null)
            refresh()
            toast.success(isAr ? 'تم حفظ بيانات المالك' : 'Owner saved successfully')
          }}
          onClose={() => {
            setShowOwnerForm(false)
            setEditingOwner(null)
          }}
        />
      )}

      {profileOwner && (
        <VetOwnerProfileModal
          owner={profileOwner}
          onClose={() => setProfileOwner(null)}
          onEdit={() => {
            setEditingOwner(profileOwner)
            setProfileOwner(null)
            setShowOwnerForm(true)
          }}
          onAddPet={() => {
            openAddPet(profileOwner)
            setProfileOwner(null)
          }}
          onViewPet={(petId) => {
            setProfileOwner(null)
            navigate(`/vet/patients/${petId}`)
          }}
          onBook={(p) => {
            openBooking(p)
            setProfileOwner(null)
          }}
          onWalkIn={(p) => {
            openWalkIn(p)
            setProfileOwner(null)
          }}
        />
      )}

      {showPatientForm && (
        <VetPatientFormModal
          preselectedOwner={preselectedOwner}
          onSave={() => {
            setShowPatientForm(false)
            setPreselectedOwner(null)
            refresh()
            toast.success(isAr ? 'تم تسجيل الحيوان الأليف بنجاح' : 'Pet saved successfully')
          }}
          onClose={() => {
            setShowPatientForm(false)
            setPreselectedOwner(null)
          }}
        />
      )}

      {showSessionForm && (
        <VetSessionFormModal
          preselectedPatient={preselectedPatient}
          onSave={() => {
            setShowSessionForm(false)
            setPreselectedPatient(null)
            refresh()
            toast.success(isAr ? 'تم تسجيل الجلسة' : 'Session saved')
          }}
          onClose={() => {
            setShowSessionForm(false)
            setPreselectedPatient(null)
          }}
        />
      )}

      {showApptForm && (
        <VetAppointmentFormModal
          preselectedPatient={preselectedPatient ?? undefined}
          onSave={() => {
            setShowApptForm(false)
            setPreselectedPatient(null)
            toast.success(isAr ? 'تم حجز الموعد' : 'Appointment saved')
          }}
          onClose={() => {
            setShowApptForm(false)
            setPreselectedPatient(null)
          }}
        />
      )}

      <OwnerDeleteModal
        owner={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}