import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bookmark, LayoutDashboard } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { motionBase } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

/** The same restrained cross-fade as `layouts/learn-layout.tsx` and
 * `layouts/practice-layout.tsx` — every Current Affairs screen transition
 * (feed <-> article detail) gets it for free. */
function AnimatedOutlet() {
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={motionBase}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * The Current Affairs module's shared chrome — the same minimal-header
 * simplification `learn-layout.tsx`/`practice-layout.tsx` already use ahead
 * of a real sidebar/top-bar shell (`layouts/dashboard-layout.tsx`, still not
 * built). The Bookmarks link points at Learn's Bookmarks page since Current
 * Affairs bookmarks live in that same shared store
 * (`services/learnProgressService.ts`) and surface there under the
 * "Current Affairs" filter tab — there's no separate Current-Affairs-only
 * bookmarks screen.
 */
export function CurrentAffairsLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.learnBookmarks}>
              <Bookmark className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Bookmarks</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
