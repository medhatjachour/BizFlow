import { useState, useEffect, useCallback } from 'react'
import { loadStoredUnits, saveStoredUnits } from '../utils'
import type { UnitItem } from '../types'

export function useMedicineUnits() {
  const [units, setUnits] = useState<string[]>(loadStoredUnits)
  const [unitRecords, setUnitRecords] = useState<UnitItem[]>([])

  const fetchUnits = useCallback(async () => {
    try {
      const rows = await (window as any).api?.vet?.medicineUnits?.getAll()
      if (Array.isArray(rows) && rows.length > 0) {
        setUnitRecords(rows)
        const names = rows.map((u: UnitItem) => u.name)
        setUnits(names)
        saveStoredUnits(names)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return {
    units,
    unitRecords,
    refreshUnits: fetchUnits
  }
}