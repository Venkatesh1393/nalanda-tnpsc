import { motion } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { NotificationList } from '@/features/notifications'

/**
 * The Notification Center (`/app/notifications`, docs/InformationArchitecture.md
 * §7.7 — "a flat list module... surfaced identically via the bell icon on
 * web"). Renders its own minimal chrome-free header directly rather than a
 * real sidebar/top-bar shell, the same known, temporary simplification
 * `pages/analytics/analytics-page.tsx` and `pages/dashboard/dashboard-page.tsx`
 * already use — `layouts/dashboard-layout.tsx` (docs/InformationArchitecture.md
 * §4) is still docs/MASTER_ROADMAP.md Phase 7 and doesn't exist yet, so the
 * persistent top-bar bell this page's data will eventually back doesn't
 * exist either; this page is reached today via the Dashboard's own
 * `NotificationsCard` "View All" link instead.
 */
export function NotificationsPage() {
  const { t } = useTranslation('notifications')

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('page.dashboard')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <motion.main
        variants={staggerChildren(0.08)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <motion.div variants={fadeInUp} className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('page.heading')}</Heading>
          <Text variant="body-sm">{t('page.subtitle')}</Text>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <NotificationList />
        </motion.div>
      </motion.main>
    </div>
  )
}
