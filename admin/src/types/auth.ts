/** Session-shape types — mirrors the real backend's `toPublicUser` response
 * shape (`backend/src/controllers/auth.controller.ts`), same as
 * frontend/src/types/auth.ts, plus `super_admin` (Step 52). */
export type AdminRole =
  'user' | 'moderator' | 'content_editor' | 'admin' | 'support' | 'super_admin'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  subscriptionTier: 'free' | 'plus' | 'pro' | 'institutional'
}

/** Roles allowed into the Admin Panel shell at all — mirrors
 * `backend/src/constants/roles.ts`'s `ADMIN_ACCESS_ROLES`. A plain `user`
 * (student) is never in this list; the backend enforces the same boundary
 * independently (routes/admin/index.ts), so this frontend check is a UX
 * convenience, never the actual security boundary. */
export const ADMIN_ACCESS_ROLES: AdminRole[] = [
  'moderator',
  'content_editor',
  'admin',
  'support',
  'super_admin',
]

export type EstablishedSession = {
  user: AuthUser
  accessToken: string
  isNewUser: boolean
}
