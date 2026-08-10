/**
 * Session-shape types (docs/Authentication.md §3-§4). `role`/`subscriptionTier`
 * now mirror the real backend's `toPublicUser` response shape
 * (`backend/src/controllers/auth.controller.ts`) — the OTP mock path
 * (`services/authService.ts`'s `verifyEmailOtp`) fills them with sensible
 * defaults since it doesn't talk to a real backend yet.
 */
export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'moderator' | 'content_editor' | 'admin' | 'support'
  subscriptionTier: 'free' | 'plus' | 'pro' | 'institutional'
  /** Step 44 — real, backend-sourced (`Profile.onboarding.completed`), read
   * by route/page logic to decide Onboarding vs. Dashboard instead of the
   * old `localStorage`-only `hasCompletedOnboarding()` check. */
  onboardingCompleted: boolean
}

export type AuthIntent = 'login' | 'register'

/** Result of establishing a real session (Google or Email/Password) — the
 * caller decides where to route next based on `isNewUser`, per
 * docs/Authentication.md §3's "existing user → Dashboard, new user →
 * Choose Exam / Onboarding" flow. */
export type EstablishedSession = {
  user: AuthUser
  accessToken: string
  isNewUser: boolean
}
