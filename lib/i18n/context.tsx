'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, LANGS, type Lang, type Translations } from './translations'

type I18nContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('nexora_lang') as Lang | null
    if (saved && LANGS.includes(saved)) setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('nexora_lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
