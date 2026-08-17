import React from 'react'
import { ArrowLeft, Pencil, FilePlus, Download, Plus, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { calcAge, initials } from '../utils'
import { AVATAR_GRADIENTS, BLOOD_TYPE_COLORS } from '../constants'
import type { PatientProfileData } from '../types'

interface Props {
  patient: PatientProfileData
  exportingPdf: boolean
  onBack: () => void
  onEditPatient: () => void
  onUploadResult: () => void
  onExportPdf: () => void
  onNewSession: () => void
}

export const PatientBanner: React.FC<Props> = ({
  patient,
  exportingPdf,
  onBack,
  onEditPatient,
  onUploadResult,
  onExportPdf,
  onNewSession
}) => {
  const { t } = useLanguage()
  const colorIdx = patient.name ? patient.name.charCodeAt(0) % AVATAR_GRADIENTS.length : 0

  return (
    <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 px-6 pt-5 pb-6 flex-shrink-0 shadow-sm">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        {/* Left: Avatar + Identity */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${AVATAR_GRADIENTS[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white/20`}
          >
            <span className="text-2xl font-bold tracking-tight text-white">{initials(patient.name)}</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {patient.dateOfBirth && (
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {calcAge(patient.dateOfBirth)}
                </span>
              )}
              {patient.gender && (
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">
                  {t(patient.gender as any)}
                </span>
              )}
              {patient.bloodType && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${
                    BLOOD_TYPE_COLORS[patient.bloodType] ?? 'bg-white/20 text-white border-transparent'
                  }`}
                >
                  {patient.bloodType}
                </span>
              )}
              {patient.nationalId && (
                <span className="bg-white/15 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-mono">
                  {patient.nationalId}
                </span>
              )}
              {patient.folderNumber && (
                <span className="bg-white/20 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/30">
                  #{patient.folderNumber}
                </span>
              )}
            </div>

            {patient.allergies && (
              <div className="inline-flex items-center gap-1.5 mt-2.5 bg-amber-400/25 border border-amber-300/30 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-200 flex-shrink-0" />
                <span className="text-xs text-amber-100 font-medium">{patient.allergies}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onEditPatient}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            {t('editPatient')}
          </button>
          <button
            onClick={onUploadResult}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-sm"
          >
            <FilePlus className="h-4 w-4" />
            Upload Result
          </button>
          <button
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-sm disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-teal-800 hover:bg-teal-50 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t('newSession')}
          </button>
        </div>
      </div>

      {/* Contact Row */}
      <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 pt-3 border-t border-white/10 text-white/85 text-xs sm:text-sm">
        {patient.phone && (
          <div className="flex items-center gap-1.5 font-medium">
            <Phone className="h-3.5 w-3.5 text-white/70" /> {patient.phone}
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-1.5 font-medium">
            <Mail className="h-3.5 w-3.5 text-white/70" /> {patient.email}
          </div>
        )}
        {patient.address && (
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-white/70" /> {patient.address}
          </div>
        )}
      </div>
    </div>
  )
}