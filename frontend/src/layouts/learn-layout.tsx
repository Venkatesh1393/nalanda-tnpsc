import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bookmark, LayoutDashboard, RotateCcw } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { motionBase } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

/** Cross-fades every hierarchy navigation (Subjects -> Topics -> Subtopics ->
 * Lesson -> Video/Notes), the same restrained `motionBase` pattern already
 * used by `layouts/website-layout.tsx`'s `AnimatedOutlet` — this is what
 * satisfies the "smooth transitions" requirement across the whole module. */
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
 * The Learn module's shared chrome (docs/Learn_Module.md) — a minimal
 * header (logo, quick links to Bookmarks/Revision, back to Dashboard, theme
 * toggle) rather than the real sidebar/top-bar shell
 * (`layouts/dashboard-layout.tsx`, docs/InformationArchitecture.md §4),
 * which is docs/MASTER_ROADMAP.md Phase 7 and doesn't exist yet — the same
 * known, temporary simplification `pages/dashboard/dashboard-page.tsx` and
 * `pages/onboarding/onboarding-page.tsx` already use.
 */
export function LearnLayout() {
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
            <Link to={ROUTES.learnRevision}>
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Revision</span>
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
