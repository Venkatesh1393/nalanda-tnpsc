import { useEffect, useState, type ReactNode } from 'react'

import { setApiLanguage } from '@/api/client'
import { LanguageContext, type Language } from '@/context/language-context'
import { i18n } from '@/i18n'
import { invalidateDashboardCache } from '@/services/dashboardService'
import { queryClient } from '@/lib/query-client'

type LanguageProviderProps = {
  children: ReactNode
  defaultLanguage?: Language
  storageKey?: string
}

/**
 * Persists the user's EN/தமிழ் choice (docs/UI_Design_System.md's bilingual-
 * dignity principle — the choice is remembered, never re-asked every visit)
 * AND propagates it to every place that needs to react to it: `i18next`
 * (static UI copy), `api/client.ts` (every outgoing request's `?lang=`
 * param, so real backend content — Learn/Practice/CurrentAffairs/Analytics/
 * LiveExams/Notifications/Bookmarks — comes back in the right language),
 * and React Query's cache (already-fetched data doesn't know the language
 * changed underneath it, so it's force-invalidated rather than left stale).
 * `i18n/index.ts` mirrors this same `localStorage` key at import time for
 * its *initial* value — this provider stays the only writer to that key.
 */
export function LanguageProvider({
  children,
  defaultLanguage = 'en',
  storageKey = 'nalanda-language',
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(storageKey) as Language | null) ?? defaultLanguage,
  )

  useEffect(() => {
    void i18n.changeLanguage(language)
    setApiLanguage(language)
    invalidateDashboardCache()
    void queryClient.invalidateQueries()
  }, [language])

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(storageKey, nextLanguage)
    setLanguageState(nextLanguage)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
