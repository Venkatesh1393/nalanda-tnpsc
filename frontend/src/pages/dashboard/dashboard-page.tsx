import { motion } from 'framer-motion'
import { LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { staggerChildren } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import {
  AchievementsCard,
  AiMentorCard,
  ContinueLearningCard,
  CurrentAffairsCard,
  DailyStudyGoalCard,
  NotificationsCard,
  PremiumBanner,
  QuickPracticeCard,
  RecentActivityCard,
  RecommendedTopicsCard,
  StatsRow,
  TodayTasksCard,
  UpcomingExamsCard,
  WeakSubjectsCard,
  WeeklyProgressCard,
  WelcomeBanner,
} from '@/features/dashboard'
import { useAuth } from '@/hooks/use-auth'

/**
 * The Student Dashboard (docs/Dashboard.md) — the authenticated home screen,
 * composed widget-by-widget exactly per that document's Page Flow (§0) and
 * Data Grouping (§21). Every widget owns its own mocked query, loading
 * skeleton, and error state (docs/Dashboard.md §20's "skeleton discipline")
 * — this file is intentionally just composition and layout, readable
 * top-to-bottom as "what does this page show."
 *
 * Renders its own minimal header (logo, settings, theme toggle, logout)
 * rather than a real sidebar/top-bar shell — `layouts/dashboard-layout.tsx`
 * (docs/InformationArchitecture.md §4) is docs/MASTER_ROADMAP.md Phase 7
 * and doesn't exist yet, a known, temporary simplification per
 * docs/Dashboard.md §20 (the same reason `pages/onboarding/onboarding-page.tsx`
 * does the same thing). The header's Settings gear (added 2026-07-31,
 * alongside `pages/settings/settings-page.tsx` itself) is this page's only
 * entry point into Settings today, since `AchievementsCard`/
 * `DailyStudyGoalCard`'s pre-existing `ROUTES.settings('profile')` links
 * were already there but had nothing to resolve to until now.
 */
export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    toast.success(t('page.loggedOutToast'))
  }

  // Step 44 §B's "if onboarding is incomplete → redirect to onboarding" —
  // real, backend-sourced (`user.onboardingCompleted`), so a user who
  // abandoned the wizard mid-way (or navigates straight to /app/dashboard
  // via a stale link) always lands back in Onboarding instead of a
  // Dashboard built on an incomplete Profile.
  if (user && !user.onboardingCompleted) {
    return <Navigate to={ROUTES.onboarding} replace />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={t('page.settingsAriaLabel')} asChild>
            <Link to={ROUTES.settings('profile')}>
              <Settings className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            {t('page.logOut')}
          </Button>
        </div>
      </header>

      <motion.main
        variants={staggerChildren(0.08)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <WelcomeBanner />

        <div className="grid gap-4 lg:grid-cols-2">
          <DailyStudyGoalCard />
          <TodayTasksCard />
        </div>

        <StatsRow />

        <WeeklyProgressCard />

        <ContinueLearningCard />

        <div className="grid gap-4 lg:grid-cols-2">
          <RecommendedTopicsCard />
          <WeakSubjectsCard />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CurrentAffairsCard />
          <UpcomingExamsCard />
        </div>

        <QuickPracticeCard />

        <AiMentorCard />

        <div className="grid gap-4 lg:grid-cols-2">
          <NotificationsCard />
          <RecentActivityCard />
        </div>

        <AchievementsCard />

        <PremiumBanner />
      </motion.main>
    </div>
  )
}
