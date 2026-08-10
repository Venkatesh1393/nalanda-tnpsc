import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { EmptyState } from '@/components/empty-state'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { SETTINGS_SECTIONS, type SettingsSection } from '@/constants/settings'
import {
  AvatarUploader,
  LanguagePreferenceCard,
  NotificationPreferencesCard,
  PersonalDetailsCard,
  PrivacyCard,
  SecurityCard,
  StudyStatisticsCard,
  SubscriptionStatusCard,
  ThemePreferenceCard,
} from '@/features/settings'
import { useAuth } from '@/hooks/use-auth'

function isSettingsSection(value: string | undefined): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.id === value)
}

/**
 * Settings, with Profile as its default tab (`/app/settings/:section` —
 * docs/InformationArchitecture.md §7.5's "Settings is the umbrella, Profile
 * is a tab within it," docs/PROJECT_CONTEXT.md §13). Renders its own
 * minimal chrome-free header rather than a real sidebar/top-bar shell, the
 * same known, temporary simplification `pages/analytics/analytics-page.tsx`
 * and `pages/notifications/notifications-page.tsx` already use —
 * `layouts/dashboard-layout.tsx` still doesn't exist. Reached today via
 * Dashboard's `AchievementsCard`/`DailyStudyGoalCard` links (both already
 * pointed at `ROUTES.settings('profile')` before this page existed) and its
 * own new header link.
 */
export function SettingsPage() {
  const { t } = useTranslation(['common', 'settings'])
  const { section } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()

  function handleLogout() {
    logout()
    toast.success(t('settings:settingsPage.loggedOutToast'))
  }

  if (!isSettingsSection(section)) {
    return (
      <div className="mx-auto flex min-h-svh max-w-3xl items-center justify-center px-4">
        <EmptyState
          title={t('settings:settingsPage.unknownSectionTitle')}
          description={t('settings:settingsPage.unknownSectionDescription')}
          actionLabel={t('common:notFound.actionLabel')}
          onAction={() => navigate(ROUTES.dashboard)}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            {t('settings:settingsPage.logOut')}
          </Button>
        </div>
      </header>

      <motion.main
        variants={staggerChildren(0.08)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <motion.div variants={fadeInUp} className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('settings:settingsPage.heading')}</Heading>
          <Text variant="body-sm">{t('settings:settingsPage.subtitle')}</Text>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Tabs
            value={section}
            onValueChange={(value) => navigate(ROUTES.settings(value))}
          >
            <TabsList className="w-full overflow-x-auto sm:w-fit">
              {SETTINGS_SECTIONS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {t(`settings:sections.${tab.id}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="profile" className="flex flex-col gap-4">
              <div className="rounded-xl border p-4 sm:p-6">
                <AvatarUploader />
              </div>
              <PersonalDetailsCard />
              <StudyStatisticsCard />
              <SubscriptionStatusCard />
            </TabsContent>

            <TabsContent value="preferences" className="flex flex-col gap-4">
              <ThemePreferenceCard />
              <LanguagePreferenceCard />
            </TabsContent>

            <TabsContent value="notifications" className="flex flex-col gap-4">
              <NotificationPreferencesCard />
            </TabsContent>

            <TabsContent value="privacy" className="flex flex-col gap-4">
              <PrivacyCard />
            </TabsContent>

            <TabsContent value="security" className="flex flex-col gap-4">
              <SecurityCard />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.main>
    </div>
  )
}
