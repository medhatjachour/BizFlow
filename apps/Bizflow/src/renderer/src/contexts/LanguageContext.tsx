import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from '../i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, any>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language
    return stored || 'en'
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

  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[language][key] || translations.en[key] || key
    
    if (params) {
      // Simple interpolation: replace {key} with params.key
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]))
      })
    }
    
    return translation
  }

  const contextValue = { language, setLanguage, t }

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
