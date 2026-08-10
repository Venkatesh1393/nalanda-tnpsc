/**
 * `docs/Database.md` §4.1's `Users`/`Profiles` enums. `email` was split into
 * `email_otp` (the passwordless custom-OTP path docs/Authentication.md §2
 * specifies — still frontend-mocked, no real backend OTP delivery yet) and
 * `email_password` (Firebase's native provider, added alongside per this
 * session's explicit "add it, don't replace OTP" decision) so a `User`
 * document always records which concrete mechanism was used, not just
 * "some email-based method."
 */
export const AUTH_PROVIDERS = ['google', 'email_otp', 'email_password'] as const
export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const LANGUAGE_PREFERENCES = ['ta', 'en', 'bilingual'] as const
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number]

/** Matches `frontend/src/constants/onboarding.ts`'s `STUDY_HOURS_BANDS` ids. */
export const STUDY_HOURS_BANDS = ['under-1', '1-2', '2-4', '4-plus'] as const
export type StudyHoursBand = (typeof STUDY_HOURS_BANDS)[number]
