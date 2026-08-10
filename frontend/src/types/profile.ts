/**
 * Profile/Settings module DTOs (docs/InformationArchitecture.md §7.5 —
 * "Settings is the umbrella; Profile is a tab within it", docs/PROJECT_CONTEXT.md
 * §13). Deliberately separate from `types/auth.ts`'s `AuthUser` — the mock
 * session identity (`AuthUser`) and this editable profile record are kept
 * as two independent mock stores here (see `services/profileService.ts`'s
 * header comment for why), the same kind of deliberate cross-module mock
 * disconnect `services/practiceSessionService.ts`'s XP/Coins ledger already
 * has with Dashboard's separate mock numbers.
 */

export type UserProfile = {
  name: string
  email: string
  /** A `data:` URL from a local file read, or null — no Cloudinary upload
   * exists yet (docs/MASTER_ROADMAP.md Phase 5), so this never leaves the
   * browser today. */
  avatarUrl: string | null
  examGoalLabel: string
  memberSince: string
}

export type SecuritySession = {
  id: string
  deviceLabel: string
  location: string
  lastActiveAt: string
  isCurrent: boolean
}
