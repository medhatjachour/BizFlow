import { useEffect } from 'react'

/**
 * One-shot "open the create form" intent, handed from the command palette to a
 * tab. The palette cannot call the tab directly: the tab may not be mounted yet
 * when the palette runs (it navigates first, then the tab appears). Parking the
 * intent in module state lets the tab claim it on its first render, whether it
 * was already on screen or just mounted.
 */
let pending: string | null = null

export function requestIntent(target: string): void {
  pending = target
}

/**
 * Claims a pending intent. The effect deliberately has no dependency array:
 * the palette always closes right after requesting an intent, which re-renders
 * the whole page, so the target tab checks on that pass.
 */
export function useIntent(target: string, handler: () => void): void {
  useEffect(() => {
    if (pending !== target) return
    pending = null
    handler()
  })
}
