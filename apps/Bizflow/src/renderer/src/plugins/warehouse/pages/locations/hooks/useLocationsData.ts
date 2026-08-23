import { useState, useEffect, useCallback } from 'react'
import { LocationItem, LocationFormData } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

export function useLocationsData() {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { t } = useLanguage()
  const toast = useToast()

  const loadLocations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.warehouse.getLocations()
      setLocations(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('[useLocationsData] Error loading locations:', err)
      const msg = err?.message || t('warehouseLoadLocationsFailed') || 'Failed to load locations'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  const saveLocation = async (data: LocationFormData, editingId?: string) => {
    try {
      const payload = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        type: data.type,
        parentId: data.parentId || undefined,
        notes: data.notes?.trim() || undefined
      }

      if (editingId) {
        await window.api.warehouse.updateLocation({ id: editingId, ...payload })
        toast.success(t('warehouseLocationUpdated') || 'Location updated')
      } else {
        await window.api.warehouse.createLocation(payload)
        toast.success(t('warehouseLocationCreated') || 'Location created')
      }
      await loadLocations()
      return true
    } catch (err: any) {
      toast.error(err?.message || t('warehouseSaveLocationFailed') || 'Save failed')
      return false
    }
  }

  const deleteLocation = async (loc: LocationItem) => {
    const prev = [...locations]
    setLocations(prev.filter(l => l.id !== loc.id))
    try {
      await window.api.warehouse.deleteLocation(loc.id)
      toast.success(t('warehouseLocationDeleted') || 'Location archived')
      await loadLocations()
    } catch (err: any) {
      setLocations(prev)
      toast.error(err?.message || t('warehouseDeleteLocationFailed') || 'Delete failed')
    }
  }

  return {
    locations,
    loading,
    error,
    refresh: loadLocations,
    saveLocation,
    deleteLocation
  }
}