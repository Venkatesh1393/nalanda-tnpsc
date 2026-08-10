/**
 * The Settings feature's public surface — pages import from here, never by
 * reaching into `features/settings/components/*` directly (per
 * `features/README.md`, the same convention every other feature's
 * `index.ts` already follows).
 */
export { AvatarUploader } from '@/features/settings/components/avatar-uploader'
export { LanguagePreferenceCard } from '@/features/settings/components/language-preference-card'
export { NotificationPreferencesCard } from '@/features/settings/components/notification-preferences-card'
export { PersonalDetailsCard } from '@/features/settings/components/personal-details-card'
export { PrivacyCard } from '@/features/settings/components/privacy-card'
export { SecurityCard } from '@/features/settings/components/security-card'
export { StudyStatisticsCard } from '@/features/settings/components/study-statistics-card'
export { SubscriptionStatusCard } from '@/features/settings/components/subscription-status-card'
export { ThemePreferenceCard } from '@/features/settings/components/theme-preference-card'
