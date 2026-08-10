import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/providers/auth-provider'
import { LanguageProvider } from '@/providers/language-provider'
import { ThemeProvider } from '@/providers/theme-provider'

/**
 * Composes every app-wide provider in one place so `main.tsx` stays a plain
 * render call, and so adding a future provider (e.g. an AuthProvider) means
 * editing this one file instead of nesting another layer directly into
 * main.tsx. Order matters only where a provider depends on another already
 * being present — `I18nextProvider` is the one exception: it's nested
 * directly inside `LanguageProvider` since it reacts to the language state
 * that provider owns (`LanguageProvider` calls `i18n.changeLanguage()` on
 * every change). Every other provider here is independent of the rest.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="nalanda-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="nalanda-language">
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              {/* Mounted once, app-wide — every Tooltip (ui/tooltip.tsx) needs an
                  ancestor TooltipProvider; it's a cross-cutting concern like Theme
                  or QueryClient, not something each usage should re-wrap. */}
              <TooltipProvider>
                <BrowserRouter>{children}</BrowserRouter>
                {/* Mounted once, app-wide — every Toast component (ui/sonner.tsx)
                    call anywhere in the app renders through this single instance. */}
                <Toaster position="bottom-right" />
              </TooltipProvider>
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
          </AuthProvider>
        </I18nextProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
