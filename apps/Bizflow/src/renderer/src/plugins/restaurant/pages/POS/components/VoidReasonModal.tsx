// src/plugins/restaurant/pages/POS/components/VoidReasonModal.tsx
//
// One modal for both void paths — a single line or the whole check — because the
// reason vocabulary is the same and the audit trail reads identically. Before
// this existed, a fired line could not be taken off a check at all.
import React, { useState } from 'react'
import { AlertTriangle, X, Ban } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { sounds } from '../../utils/sound'

export type VoidReasonKey =
  | 'wrong_item'
  | 'guest_changed'
  | 'kitchen_error'
  | 'comp'
  | 'walkout'
  | 'other'

interface Props {
  isOpen: boolean
  mode: 'item' | 'check'
  /** Human label of what is about to be voided, e.g. "2x Margherita". */
  subjectLabel?: string
  /** True when the line was already fired to the kitchen. */
  alreadyFired?: boolean
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (reasonLabel: string, reasonKey: VoidReasonKey, note: string) => Promise<void> | void
}

export const VoidReasonModal: React.FC<Props> = ({
  isOpen,
  mode,
  subjectLabel,
  alreadyFired,
  isSubmitting,
  onClose,
  onConfirm
}) => {
  const { t } = useLanguage()
  const [reasonKey, setReasonKey] = useState<VoidReasonKey>('wrong_item')
  const [note, setNote] = useState('')

  if (!isOpen) return null

  const REASONS: Array<{ key: VoidReasonKey; label: string }> = [
    { key: 'wrong_item', label: t('restPosVoidReasonWrongItem') },
    { key: 'guest_changed', label: t('restPosVoidReasonGuestChanged') },
    { key: 'kitchen_error', label: t('restPosVoidReasonKitchenError') },
    { key: 'comp', label: t('restPosVoidReasonComp') },
    ...(mode === 'check'
      ? [{ key: 'walkout' as VoidReasonKey, label: t('restPosVoidReasonWalkout') }]
      : []),
    { key: 'other', label: t('restPosVoidReasonOther') }
  ]

  const selected = REASONS.find((r) => r.key === reasonKey) || REASONS[0]

  const handleConfirm = async () => {
    sounds.playError()
    const full = note.trim() ? `${selected.label} — ${note.trim()}` : selected.label
    await onConfirm(full, reasonKey, note.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {mode === 'check'
                  ? t('restPosVoidModalCheckTitle')
                  : t('restPosVoidModalItemTitle')}
              </h3>
              {subjectLabel && (
                <p className="text-xs text-slate-400 truncate max-w-[15rem]">{subjectLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label={t('cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
            {alreadyFired ? t('restPosVoidItemWarn') : t('restPosVoidCheckWarn')}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {t('restPosVoidReasonLabel')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((reason) => {
              const active = reason.key === reasonKey
              return (
                <button
                  key={reason.key}
                  type="button"
                  onClick={() => {
                    sounds.playBump()
                    setReasonKey(reason.key)
                  }}
                  className={`px-2.5 py-2 rounded-2xl border text-[11px] font-bold text-start transition-all ${
                    active
                      ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/25'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {reason.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {t('restPosVoidNoteLabel')}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('restPosVoidNotePlaceholder')}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('restPosVoidCancel')}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-500/20 active:scale-[0.98] transition-transform"
          >
            {isSubmitting
              ? t('restPosVoidSubmitting')
              : mode === 'check'
                ? t('restPosVoidConfirmCheck')
                : t('restPosVoidConfirmItem')}
          </button>
        </div>
      </div>
    </div>
  )
}
