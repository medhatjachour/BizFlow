/**
 * Copyable device identifier.
 *
 * Used by the activation gate, the licence request form and the owner panel.
 * The clipboard API needs a secure context and fails in some packaged builds,
 * so there is a textarea fallback — the same one the Help Centre already uses.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import type { LicenseStrings } from './licenseStrings'

interface Props {
  deviceId: string
  deviceName?: string
  strings: LicenseStrings
  compact?: boolean
}

export default function LicenceDeviceId({ deviceId, deviceName, strings, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copy = useCallback(async () => {
    if (!deviceId) return
    try {
      await navigator.clipboard.writeText(deviceId)
    } catch {
      const area = document.createElement('textarea')
      area.value = deviceId
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
      } catch {
        /* the ID is on screen either way */
      }
      document.body.removeChild(area)
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }, [deviceId])

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {strings.deviceIdLabel}
      </p>
      {deviceName ? (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{deviceName}</p>
      ) : null}
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
          {deviceId || '—'}
        </code>
        <button
          type="button"
          onClick={copy}
          disabled={!deviceId}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
          {copied ? strings.copied : compact ? strings.copy : strings.copyDeviceId}
        </button>
      </div>
    </div>
  )
}
