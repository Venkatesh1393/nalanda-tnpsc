import { motion } from 'framer-motion'
import { Outlet } from 'react-router-dom'

import { fadeInUp } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * The minimal, chrome-free shell for Login/Register/Verify Email
 * (layouts/README.md's planned `auth-layout.tsx`, docs/Registration_Flow.md,
 * docs/OTP_Flow.md) — no Navbar/Footer, since the doc's whole point for
 * these screens is to remove every distraction from the one task at hand.
 * Just the logo (linking home) and a theme toggle, a centered card slot via
 * `<Outlet />`.
 */
export function AuthLayout() {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-sm"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
