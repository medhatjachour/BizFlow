import { LocationItem } from './types'

export function buildLocationTree(locations: LocationItem[]): LocationItem[] {
  const map = new Map<string, LocationItem>()
  locations.forEach(loc => map.set(loc.id, { ...loc, children: [] }))

  const roots: LocationItem[] = []
  locations.forEach(loc => {
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.children!.push(map.get(loc.id)!)
    } else {
      roots.push(map.get(loc.id)!)
    }
  })
  return roots
}

export function filterLocationList(
  locations: LocationItem[],
  query: string,
  typeFilter: string
): LocationItem[] {
  const q = query.trim().toLowerCase()
  return locations.filter(loc => {
    if (typeFilter !== 'all' && loc.type !== typeFilter) return false
    if (!q) return true
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.code.toLowerCase().includes(q) ||
      loc.type.toLowerCase().includes(q)
    )
  })
}

export function getLocationBreadcrumbs(
  locationId: string,
  allLocations: LocationItem[]
): LocationItem[] {
  const crumbs: LocationItem[] = []
  const map = new Map<string, LocationItem>(allLocations.map(l => [l.id, l]))

  let curr: LocationItem | undefined = map.get(locationId)
  while (curr) {
    crumbs.unshift(curr)
    curr = curr.parentId ? map.get(curr.parentId) : undefined
  }
  return crumbs
}