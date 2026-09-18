// ─── A short-lived "Undo" affordance, scoped to the personal plugin ──────────
// The shared ToastContext has no action button, and widening a primitive used by
// every module for one plugin's needs is the wrong trade. This hook keeps the
// undo state local: a caller shows a message together with the action that
// reverses it, and the offer expires on its own so a stale "Undo" can never be
// clicked hours later.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

export const UNDO_TIMEOUT_MS = 8000

export type UndoOffer = {
  message: string
  action: () => void | Promise<void>
}

export function useUndoBar(timeoutMs: number = UNDO_TIMEOUT_MS) {
  const [offer, setOffer] = useState<UndoOffer | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // A tab can be unmounted while an offer is pending; the timer must not outlive it.
  useEffect(() => clearTimer, [clearTimer])

  const show = useCallback(
    (message: string, action: () => void | Promise<void>) => {
      clearTimer()
      setOffer({ message, action })
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setOffer(null)
      }, timeoutMs)
    },
    [clearTimer, timeoutMs]
  )

  const dismiss = useCallback(() => {
    clearTimer()
    setOffer(null)
  }, [clearTimer])

  const undo = useCallback(async () => {
    const pending = offer
    dismiss()
    if (pending) await pending.action()
  }, [offer, dismiss])

  return { offer, show, dismiss, undo }
}
