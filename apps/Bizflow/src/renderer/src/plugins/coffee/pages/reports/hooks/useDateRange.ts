import { useState, useCallback, useMemo } from 'react'
import { DatePreset, DateRange, ReportFilters } from '../types'
import { applyPreset } from '../utils'

export function useDateRange(initialPreset: DatePreset = 'month') {
  const initial = applyPreset(initialPreset)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [activePreset, setActivePreset] = useState<DatePreset>(initialPreset)

  const setPreset = useCallback((preset: DatePreset) => {
    const range = applyPreset(preset)
    setFrom(range.from)
    setTo(range.to)
    setActivePreset(preset)
  }, [])

  const setCustomRange = useCallback((newFrom: string, newTo: string) => {
    setFrom(newFrom)
    setTo(newTo)
    setActivePreset('custom')
  }, [])

  const filters = useMemo<ReportFilters>(
    () => ({
      startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    }),
    [from, to]
  )

  const range: DateRange = useMemo(() => ({ from, to }), [from, to])

  return {
    from,
    to,
    range,
    filters,
    activePreset,
    setPreset,
    setCustomRange,
    setFrom,
    setTo,
  }
}
