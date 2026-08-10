import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import { motionBase } from '@/animations/variants'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'

/**
 * A page-to-page cross-fade (docs/UI_Design_System.md's restrained-motion
 * principle — `motionBase`, never anything flashier) — keyed on pathname so
 * `AnimatePresence` treats each route as a distinct element and plays an
 * exit/enter pair instead of the previous page's content just vanishing.
 * Only one page exists under this layout today, but every future Website
 * page (`/pricing`, `/login`, ...) gets this for free by routing through
 * `WebsiteLayout`. Skips the motion entirely under `prefers-reduced-motion`.
 */
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
 * The public Website's persistent chrome (docs/InformationArchitecture.md
 * §2, docs/FolderStructure.md §1's planned `layouts/`) — sticky Navbar above,
 * Footer below, every public page's content in between via `<Outlet />`.
 * Navbar and Footer are already "public site chrome," built and mounted
 * together since Phase 3 (docs/MASTER_ROADMAP.md) — this layout is what lets
 * a real page (`pages/website/`) wrap in that chrome instead of each page
 * re-importing both components itself.
 */
export function WebsiteLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <AnimatedOutlet />
      </main>
      <Footer />
    </div>
  )
}
