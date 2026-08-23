import React, { useState, useMemo, useRef, useEffect } from 'react'
import { LocationItem } from './types'
import { buildLocationTree, filterLocationList } from './utils'
import { useLocationsData } from './hooks/useLocationsData'
import { LocationsSkeleton } from './components/LocationsSkeleton'
import { LocationsHero } from './components/LocationsHero'
import { LocationsFilterBar } from './components/LocationsFilterBar'
import { LocationHierarchyTree } from './components/LocationHierarchyTree'
import { LocationFormModal } from './components/LocationFormModal'
import { LocationProfileDrawer } from './components/LocationProfileDrawer'

export default function LocationsTab() {
  const { locations, loading, refresh, saveLocation, deleteLocation } = useLocationsData()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null)
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null)
  const [parentCandidate, setParentCandidate] = useState<LocationItem | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setEditingLocation(null)
        setParentCandidate(null)
        setShowFormModal(true)
        return
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape') {
        if (showFormModal) setShowFormModal(false)
        else if (selectedLocation) setSelectedLocation(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFormModal, selectedLocation])

  const filtered = useMemo(() => {
    return filterLocationList(locations, query, typeFilter)
  }, [locations, query, typeFilter])

  const tree = useMemo(() => {
    return buildLocationTree(filtered)
  }, [filtered])

  const handleOpenAdd = () => {
    setEditingLocation(null)
    setParentCandidate(null)
    setShowFormModal(true)
  }

  const handleAddChild = (parent: LocationItem) => {
    setEditingLocation(null)
    setParentCandidate(parent)
    setShowFormModal(true)
  }

  const handleEdit = (loc: LocationItem) => {
    setEditingLocation(loc)
    setParentCandidate(null)
    setShowFormModal(true)
  }

  if (loading && locations.length === 0) {
    return <LocationsSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Topology Metrics Hero */}
      <LocationsHero
        locations={locations}
        loading={loading}
        onRefresh={refresh}
        onAddLocation={handleOpenAdd}
      />

      {/* 2. Search & Type Filter Bar */}
      <LocationsFilterBar
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        totalCount={filtered.length}
        searchRef={searchInputRef}
      />

      {/* 3. Interactive Hierarchy Tree */}
      <LocationHierarchyTree
        tree={tree}
        onSelect={loc => setSelectedLocation(loc)}
        onEdit={handleEdit}
        onDelete={deleteLocation}
        onAddChild={handleAddChild}
      />

      {/* 4. Location Form Modal (Create / Edit) */}
      <LocationFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        editingLocation={editingLocation}
        parentLocationCandidate={parentCandidate}
        locations={locations}
        onSave={saveLocation}
      />

      {/* 5. Comprehensive Location Profile Slide-Over Drawer */}
      <LocationProfileDrawer
        location={selectedLocation}
        allLocations={locations}
        onClose={() => setSelectedLocation(null)}
        onSelectSubLocation={loc => setSelectedLocation(loc)}
      />
    </div>
  )
}