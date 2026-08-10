/**
 * The badge catalog, as a code-level constant rather than its own MongoDB
 * collection — deliberate: catalog metadata (title/description/unlock
 * criteria) lives in `config/gamification.config.ts`'s `ACHIEVEMENT_CATALOG`
 * (admin-editable-catalog use case not needed until the Admin Panel supports
 * it). `Achievement.badgeCode` references this enum directly. See
 * `docs/Database.md` §4.7's `Badges` collection for the design this
 * intentionally simplifies — revisit if/when badges need admin-authored
 * icons/descriptions independent of a code deploy.
 *
 * Sprint 4 Step 61 (Gamification System) replaced the original 5-entry
 * Practice-only placeholder set (`first-100-questions`/`seven-day-streak`/
 * `first-mock-completed`/`pyq-completionist`/`comeback` — never wired to any
 * real award logic) with this step's explicit 8-achievement list, spanning
 * every gamified action (Practice, Lessons, Streaks). The frontend's
 * still-mocked Sectional/Mock/PYQ/100-Questions modes keep their own
 * separate, unrelated `PracticeAchievementId` mock catalog
 * (`frontend/src/types/practice.ts`) — out of this step's backend scope.
 */
export const BADGE_CODES = [
  'first-practice',
  'hundred-questions',
  'five-hundred-questions',
  'thousand-questions',
  'seven-day-streak',
  'thirty-day-streak',
  'perfect-score',
  'fast-learner',
] as const

export type BadgeCode = (typeof BADGE_CODES)[number]
