import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import logger from '../../../shared/utils/logger'

interface DisplaySettings {
  showImagesInProductCards: boolean
  showImagesInPOSCards: boolean
  showImagesInInventory: boolean
}

interface DisplaySettingsContextType {
  settings: DisplaySettings
  updateSettings: (newSettings: Partial<DisplaySettings>) => void
}

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined)

const DEFAULT_SETTINGS: DisplaySettings = {
  showImagesInProductCards: true,
  showImagesInPOSCards: true,
  showImagesInInventory: true
}

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    try {
      const stored = localStorage.getItem('displaySettings')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      logger.error('Failed to parse displaySettings from localStorage:', error)
    }
    return DEFAULT_SETTINGS
  })

  const updateSettings = (newSettings: Partial<DisplaySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('displaySettings', JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    localStorage.setItem('displaySettings', JSON.stringify(settings))
  }, [settings])

  return (
    <DisplaySettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </DisplaySettingsContext.Provider>
  )
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext)
  if (!context) {
    throw new Error('useDisplaySettings must be used within DisplaySettingsProvider')
  }
  return context
}
