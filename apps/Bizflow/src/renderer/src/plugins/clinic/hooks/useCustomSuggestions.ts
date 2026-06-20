import { useState, useCallback } from 'react'

export function useCustomSuggestions(storageKey: string) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
  })

  // Tracks which built-in defaults the user has hidden
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + ':hidden') ?? '[]') } catch { return [] }
  })

  const add = useCallback((item: string) => {
    const trimmed = item.trim()
    if (!trimmed) return
    setItems(prev => {
      if (prev.some(v => v.toLowerCase() === trimmed.toLowerCase())) return prev
      const next = [...prev, trimmed].sort((a, b) => a.localeCompare(b))
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const remove = useCallback((item: string) => {
    setItems(prev => {
      const next = prev.filter(v => v !== item)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const hideDefault = useCallback((item: string) => {
    setHiddenDefaults(prev => {
      if (prev.includes(item)) return prev
      const next = [...prev, item]
      localStorage.setItem(storageKey + ':hidden', JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const showDefault = useCallback((item: string) => {
    setHiddenDefaults(prev => {
      const next = prev.filter(v => v !== item)
      localStorage.setItem(storageKey + ':hidden', JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { items, add, remove, hiddenDefaults, hideDefault, showDefault }
}
