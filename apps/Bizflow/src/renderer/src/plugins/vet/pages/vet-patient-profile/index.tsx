import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Loader2, AlertTriangle, Pencil, Calendar } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useVetPatientProfile, VetSession } from './hooks/useVetPatientProfile'
import { PatientHeaderCard } from './components/PatientHeaderCard'
import { PatientOwnerInfoCard } from './components/PatientOwnerInfoCard'
import { PatientFinanceSummary } from './components/PatientFinanceSummary'
import { PatientSessionTimeline } from './components/PatientSessionTimeline'
import { PatientCheckResults } from './components/PatientCheckResults'

import { VetPatientFormModal } from '../vet-owners/components/VetPatientFormModal'
import { VetSessionFormModal } from '../vet-sessions/components/VetSessionFormModal'
import VetAppointmentFormModal from '../components/appointments/VetAppointmentFormModal'

interface Props {
  patientId?: string
  onBack?: () => void
}

export default function VetPatientProfile({ patientId: propPatientId, onBack }: Props) {
  const { id: routeId } = useParams<{ id: string }>()
  const id = propPatientId || routeId
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const { patient, checkResults, loading, error, uploading, reload, uploadFile, deleteFile } =
    useVetPatientProfile(id)

  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [showApptForm, setShowApptForm] = useState(false)
  const [editingSession, setEditingSession] = useState<VetSession | null>(null)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/vet')
    }
  }

  const handleUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) uploadFile(file)
    }
    input.click()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-28">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {isAr ? 'جاري تحميل الملف الطبي للمريض...' : 'Loading Clinical File…'}
        </p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <p className="text-sm font-bold text-rose-600">{error ?? 'Patient record not found'}</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-bold text-violet-600 hover:underline"
        >
          ← {isAr ? 'العودة للعيادة البيطرية' : 'Back to Vet Clinic'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{isAr ? 'العودة لقائمة العيادة' : 'Back to Clinic'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingSession(null)
              setShowSessionForm(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>{isAr ? 'جلسة جديدة' : 'New Session'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowApptForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200"
          >
            <Calendar size={14} />
            <span>{isAr ? 'حجز موعد' : 'Book Appt'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPatientForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200"
          >
            <Pencil size={14} />
            <span>{isAr ? 'تعديل البيانات' : 'Edit Info'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        <PatientHeaderCard patient={patient} totalVisits={patient.sessions?.length || 0} />
        <PatientOwnerInfoCard owner={patient.owner} />
        <PatientFinanceSummary finance={patient.finance} />
        <PatientSessionTimeline
          sessions={patient.sessions || []}
          onEditSession={(s) => {
            setEditingSession(s)
            setShowSessionForm(true)
          }}
        />
        <PatientCheckResults
          checkResults={checkResults}
          uploading={uploading}
          onUpload={handleUploadClick}
          onDelete={deleteFile}
        />
      </div>

      {/* Modals */}
      {showSessionForm && (
        <VetSessionFormModal
          session={editingSession as any}
          preselectedPatient={patient}
          onSave={() => {
            setShowSessionForm(false)
            setEditingSession(null)
            reload()
          }}
          onClose={() => {
            setShowSessionForm(false)
            setEditingSession(null)
          }}
        />
      )}

      {showPatientForm && (
        <VetPatientFormModal
          patient={patient}
          onSave={() => {
            setShowPatientForm(false)
            reload()
          }}
          onClose={() => setShowPatientForm(false)}
        />
      )}

      {showApptForm && (
        <VetAppointmentFormModal
          preselectedPatient={patient}
          onSave={() => {
            setShowApptForm(false)
            reload()
          }}
          onClose={() => setShowApptForm(false)}
        />
      )}
    </div>
  )
}