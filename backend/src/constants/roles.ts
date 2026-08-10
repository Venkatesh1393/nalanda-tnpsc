/**
 * Per docs/Authentication.md §6: roles and subscription tiers are strictly
 * independent JWT claims with independent middleware checks — never collapse
 * them into a single enum, and never gate a route on tier where a role check
 * (or vice versa) is what's actually meant. "Premium student" is therefore
 * never a role — it's `role: 'user'` combined with `subscriptionTier !==
 * 'free'`, exactly like every other tier-gated feature in this app.
 *
 * `super_admin` added for Sprint 4 Step 52 (Admin Portal Foundation) — the
 * one role allowed to perform the highest-privilege action (changing another
 * user's role). Every other role is unchanged from Sprint 1's original set,
 * a deliberate "minimal extension" decision (confirmed with the user) over
 * renaming `user`→`student` or inventing a literal `premium_student` role,
 * to avoid an unrequested, backward-incompatible migration of the JWT shape,
 * `User` model, and every existing RBAC check.
 */
export const ROLES = [
  'user',
  'moderator',
  'content_editor',
  'admin',
  'support',
  'super_admin',
] as const
export type Role = (typeof ROLES)[number]

/**
 * Every role allowed into the Admin Panel shell at all (Step 52's "Students
 * must NEVER access admin routes" requirement) — the coarse, first-line
 * gate applied to every `/admin/*` backend route and every `/admin/*`
 * frontend route. Individual endpoints/pages layer a narrower role check on
 * top of this where the permission matrix (docs/Authentication.md §7)
 * requires it (e.g. only `admin`/`super_admin` may view audit logs; only
 * `super_admin` may change a role) — this constant only answers "is this
 * role admin-staff at all," never "can this role do this specific thing."
 */
export const ADMIN_ACCESS_ROLES = [
  'moderator',
  'content_editor',
  'admin',
  'support',
  'super_admin',
] as const satisfies readonly Role[]

export const SUBSCRIPTION_TIERS = ['free', 'plus', 'pro', 'institutional'] as const
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]
