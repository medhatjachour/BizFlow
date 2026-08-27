import { useState, useEffect, useCallback } from 'react'
import { VisitType } from '../types'
import { BUILTIN_VISIT_TYPES, VISIT_TYPE_COLORS } from '../constants'
import { getVisitTypeLabel } from '../utils'

export function useVisitTypes() {
  const [types, setTypes] = useState<VisitType[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const rows = (await window.api.vet?.visitTypes?.getAll()) as any
      if (Array.isArray(rows)) setTypes(rows)
    } catch {
      // fallback to built-ins
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const hexColor = (name: string) => types.find((t) => t.name === name)?.color
  const badgeClass = (name: string) =>
    VISIT_TYPE_COLORS[name] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'

  const options = types.length
    ? types.map((t) => ({ value: t.name, label: getVisitTypeLabel(t.name), color: t.color }))
    : BUILTIN_VISIT_TYPES.map((v) => ({ value: v.value, label: v.labelEn }))

  return { types, options, loading, reload, hexColor, badgeClass }
}