// ─── Floating "Undo" strip, paired with useUndoBar ───────────────────────────
// Renders nothing until an offer exists, so callers can mount it unconditionally
// from any tab without a visibility flag of their own.
// ─────────────────────────────────────────────────────────────────────────────

import { RotateCcw, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { UndoOffer } from '../hooks/useUndoBar'

interface UndoStripProps {
  offer: UndoOffer | null
  onUndo: () => void | Promise<void>
  onDismiss: () => void
}

export default function UndoStrip({ offer, onUndo, onDismiss }: UndoStripProps) {
  const { t } = useLanguage()
  if (!offer) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex max-w-[min(32rem,100%)] items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg animate-scale-up dark:border-slate-600">
        <span className="text-xs font-medium text-white">{offer.message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-2.5 text-xs font-semibold text-[color:var(--accent-contrast)] transition-colors hover:bg-[color:var(--accent-strong)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('pwUndo')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('pwUndoDismiss')}
          className="-me-1 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
