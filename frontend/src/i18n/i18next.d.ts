import 'i18next'

import type common from './locales/en/common.json'
import type auth from './locales/en/auth.json'
import type onboarding from './locales/en/onboarding.json'
import type dashboard from './locales/en/dashboard.json'
import type learn from './locales/en/learn.json'
import type practice from './locales/en/practice.json'
import type liveExams from './locales/en/liveExams.json'
import type currentAffairs from './locales/en/currentAffairs.json'
import type analytics from './locales/en/analytics.json'
import type settings from './locales/en/settings.json'
import type notifications from './locales/en/notifications.json'
import type landing from './locales/en/landing.json'
import type payments from './locales/en/payments.json'
import type search from './locales/en/search.json'
import type aiTutor from './locales/en/aiTutor.json'

/**
 * Types every `t('namespace:some.key')` call against the real `en/` key
 * tree, so a typo'd key is a compile error instead of a silent runtime
 * fallback. The `ta/` tree isn't used here — it only needs to be a
 * structural match (same keys, same `{{placeholder}}` names), verified
 * manually per `docs/MASTER_ROADMAP.md` Phase 14's key-parity check, not
 * by the type system.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      onboarding: typeof onboarding
      dashboard: typeof dashboard
      learn: typeof learn
      practice: typeof practice
      liveExams: typeof liveExams
      currentAffairs: typeof currentAffairs
      analytics: typeof analytics
      settings: typeof settings
      notifications: typeof notifications
      landing: typeof landing
      payments: typeof payments
      search: typeof search
      aiTutor: typeof aiTutor
    }
  }
}
