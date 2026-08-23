import { useState, useEffect, useCallback } from 'react'
import { LocationItem, LocationProfileData } from '../types'

export function useLocationProfile(
  location: LocationItem | null,
  allLocations: LocationItem[]
) {
  const [data, setData] = useState<LocationProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfileDetails = useCallback(async () => {
    if (!location) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [stocksRes, movementsRes, ordersRes] = await Promise.all([
        window.api.warehouse.getStock({ locationId: location.id }),
        window.api.warehouse.getMovements({ locationId: location.id, take: 50 }),
        window.api.warehouse.getOrders({ locationId: location.id, take: 50 })
      ])

      const childLocations = allLocations.filter(l => l.parentId === location.id)

      setData({
        location,
        stocks: Array.isArray(stocksRes) ? stocksRes : [],
        movements: movementsRes?.data ?? [],
        orders: ordersRes?.data ?? [],
        children: childLocations
      })
    } catch (err: any) {
      console.error('[useLocationProfile] Failed to fetch profile:', err)
      setError(err?.message || 'Failed to load location details')
    } finally {
      setLoading(false)
    }
  }, [location, allLocations])

  useEffect(() => {
    fetchProfileDetails()
  }, [fetchProfileDetails])

  return {
    profileData: data,
    loading,
    error,
    refetch: fetchProfileDetails
  }
}