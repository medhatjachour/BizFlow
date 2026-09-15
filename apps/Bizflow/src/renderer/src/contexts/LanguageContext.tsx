import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translate, Language } from '../i18n/translations'

interface LanguageContextType {
  language: Language
  isRtl: boolean
  isRTL: boolean
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, any>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language
    return stored || 'ar'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    
    // Set document direction for RTL languages
    if (language === 'ar') {
      document.documentElement.dir = 'rtl'
    } else {
      document.documentElement.dir = 'ltr'
    }
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: string, params?: Record<string, any>): string => translate(language, key, params)

  const isRtl = language === 'ar'
  const contextValue: LanguageContextType = {
    language,
    isRtl,
    isRTL: isRtl,
    setLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
