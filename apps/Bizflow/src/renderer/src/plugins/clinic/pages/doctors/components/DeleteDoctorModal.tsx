import React from 'react'
import { Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Doctor } from '../types'

interface Props {
  doctor: Doctor | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const DeleteDoctorModal: React.FC<Props> = ({ doctor, onClose, onConfirm }) => {
  const { t } = useLanguage()
  if (!doctor) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
          <Trash2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          {t('deleteDoctor') || 'Delete doctor'}?
        </h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('deleteDoctorMsg') ||
            `Are you sure you want to remove ${doctor.name}? Their past sessions and appointments will be retained in history as unassigned.`}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors active:scale-95"
          >
            {t('delete') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}