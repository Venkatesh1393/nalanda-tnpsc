import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { motionBase } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

/** Same restrained page-to-page cross-fade as `layouts/practice-layout.tsx`. */
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
 * Weekly Live Exam's shared chrome (Step 48, docs/InformationArchitecture.md
 * §7.10) — the exact same minimal header/no-sidebar simplification
 * `layouts/practice-layout.tsx` uses ahead of a real
 * `layouts/dashboard-layout.tsx`. Kept as its own layout (not reusing
 * `PracticeLayout` directly) since Live Exams is a deliberately distinct
 * module identity, not a Practice mode — see `features/live-exams/README.md`.
 */
export function LiveExamsLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
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
