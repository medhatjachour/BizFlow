import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertTriangle,
  Pencil,
  Calendar,
  FileText,
  Clock,
  UploadCloud,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useVetPatientProfile, VetSession } from './hooks/useVetPatientProfile'

import { PatientHeaderCard } from './components/PatientHeaderCard'
import { PatientOwnerInfoCard } from './components/PatientOwnerInfoCard'
import { PatientFinanceSummary } from './components/PatientFinanceSummary'
import { PatientSessionTimeline } from './components/PatientSessionTimeline'
import { PatientCheckResults } from './components/PatientCheckResults'

import { VetPatientFormModal } from '../vet-owners/components/VetPatientFormModal'
import { VetSessionFormModal } from '../vet-sessions/components/VetSessionFormModal'
import { VetAppointmentFormModal } from '../vet-appointments/components/VetAppointmentFormModal'

interface Props {
  patientId?: string
  onBack?: () => void
}

type ActiveTab = 'timeline' | 'lab_results'

export default function VetPatientProfile({ patientId: propPatientId, onBack }: Props) {
  const { id: routeId } = useParams<{ id: string }>()
  const id = propPatientId || routeId
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    patient,
    checkResults,
    loading,
    error,
    uploading,
    reload,
    uploadFile,
    deleteFile
  } = useVetPatientProfile(id)

  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline')
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
      <div className="flex flex-col items-center justify-center h-full gap-3 py-32 text-slate-400">
        <Loader2 className="h-9 w-9 animate-spin text-violet-600 stroke-[2.5]" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isAr ? 'جاري تحميل الملف الطبي للمريض...' : 'Loading Clinical Medical Record…'}
        </p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-24 text-center px-4">
        <div className="w-14 h-14 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shadow-xs">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-black text-base text-slate-900 dark:text-white">
            {isAr ? 'تعذر العثور على ملف المريض' : 'Patient Record Not Found'}
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm">
            {error ?? (isAr ? 'المريض المطلوب غير موجود في قاعدة البيانات' : 'The requested patient profile does not exist or was removed.')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all"
        >
          <ArrowLeft size={14} />
          <span>{isAr ? 'العودة للعيادة البيطرية' : 'Return to Vet Dashboard'}</span>
        </button>
      </div>
    )
  }

  const sessionsCount = patient.sessions?.length || 0
  const checkResultsCount = checkResults?.length || 0

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex flex-col h-full bg-slate-100/60 dark:bg-slate-950 overflow-hidden"
    >
      {/* ── Top Sticky Header / Breadcrumbs Bar ────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shrink-0 flex items-center justify-between gap-4 flex-wrap">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowLeft size={15} className={isAr ? 'rotate-180' : ''} />
            <span>{isAr ? 'العيادة' : 'Clinic'}</span>
          </button>
          <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="font-bold text-slate-400">{isAr ? 'الملف الطبي' : 'Patient Profile'}</span>
          <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="font-black text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            {patient.name}
          </span>
        </div>

        {/* Action Buttons Strip */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPatientForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
            title={isAr ? 'تعديل بيانات المريض' : 'Edit Patient Information'}
          >
            <Pencil size={13} />
            <span>{isAr ? 'تعديل البيانات' : 'Edit Patient'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowApptForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            <Calendar size={13} />
            <span>{isAr ? 'حجز موعد' : 'Book Appt'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSession(null)
              setShowSessionForm(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>{isAr ? 'جلسة علاجية جديدة' : 'New Session'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Clinical Viewport (Scrollable) ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
        <div className="max-w-[1500px] mx-auto space-y-5">
          {/* Patient Overview Header Card */}
          <PatientHeaderCard patient={patient} totalVisits={sessionsCount} />

          {/* Allergy / Critical Condition Warning Banner */}
          {patient.allergies && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs shadow-xs">
              <AlertCircle size={17} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-700 dark:text-amber-400">
                  {isAr ? 'تنبيه حساسية / محاذير طبية' : 'Allergy & Medical Precaution'}
                </span>
                <p className="font-semibold mt-0.5">{patient.allergies}</p>
              </div>
            </div>
          )}

          {/* ── 2-Column Responsive Clinical Layout ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (4 cols / ~33%): Owner & Financial Summary */}
            <div className="lg:col-span-4 space-y-5">
              <PatientOwnerInfoCard owner={patient.owner} />
              <PatientFinanceSummary finance={patient.finance} />
            </div>

            {/* Right Column (8 cols / ~67%): Medical Timeline & Lab Files */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              {/* Tab Switcher */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'timeline'
                        ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Clock size={13} />
                    <span>{isAr ? 'سجل الزيارات والجلسات' : 'Clinical History'}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                      {sessionsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('lab_results')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'lab_results'
                        ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText size={13} />
                    <span>{isAr ? 'الفحوصات والأشعة' : 'Lab Tests & Scans'}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {checkResultsCount}
                    </span>
                  </button>
                </div>

                {/* Tab Context Action */}
                {activeTab === 'lab_results' && (
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800/80 rounded-xl text-xs font-bold hover:bg-violet-100 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UploadCloud size={13} />
                    )}
                    <span>{isAr ? 'رفع ملف فحص' : 'Upload Test File'}</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Visits Timeline */}
              {activeTab === 'timeline' && (
                <PatientSessionTimeline
                  sessions={patient.sessions || []}
                  onEditSession={(s) => {
                    setEditingSession(s)
                    setShowSessionForm(true)
                  }}
                />
              )}

              {/* Tab 2: Lab Results / Diagnostic Documents */}
              {activeTab === 'lab_results' && (
                <PatientCheckResults
                  checkResults={checkResults}
                  uploading={uploading}
                  onUpload={handleUploadClick}
                  onDelete={deleteFile}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Modals ─────────────────────────────────────────────────── */}
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