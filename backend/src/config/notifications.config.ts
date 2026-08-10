/**
 * Sprint 4 Step 62 — Notification Engine. Tunable thresholds for the batch
 * reminder triggers (`services/notificationTriggers.service.ts`), mirroring
 * every other step's "one file business rules trace back to" config
 * pattern (`plans.config.ts`, `adaptivePractice.config.ts`,
 * `gamification.config.ts`).
 */
export const NOTIFICATION_TRIGGER_CONFIG = {
  practiceReminder: {
    /** A user who has practiced before but gone quiet for this many days
     * gets a real "come back" nudge — brand-new users who have never
     * practiced are the Adaptive Practice Engine's concern, not this
     * reminder's (never a guilt-trip for someone who hasn't started yet). */
    inactivityDays: 3,
    /** Never re-notify the same user inside this window, so the trigger is
     * safe to call repeatedly (e.g. by a future cron running more often
     * than the reminder should actually fire). */
    dedupeWithinHours: 24,
  },
  liveExamReminder: {
    /** Only exams starting within this many hours qualify — a reminder for
     * something a week away isn't yet actionable. */
    hoursAhead: 24,
    dedupeWithinHours: 24,
  },
  subscriptionExpiryReminder: {
    /** Warn this many days before `currentPeriodEnd` — distinct from the
     * already-real *after-the-fact* lazy-downgrade notice
     * (`subscription.service.ts#applyLazyExpiry`). */
    daysAhead: 3,
    dedupeWithinHours: 24,
  },
} as const
