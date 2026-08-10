import type { Role, SubscriptionTier } from '../constants/roles'
import type { LanguagePreference, UserStatus } from '../constants/user'
import { User, type IUser, type UserDocument } from '../models/User.model'

export function findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
  return User.findOne({ firebaseUid })
}

export function findByEmail(email: string): Promise<UserDocument | null> {
  return User.findOne({ email: email.toLowerCase() })
}

export function findById(userId: string): Promise<UserDocument | null> {
  return User.findById(userId)
}

export function create(
  data: Pick<IUser, 'firebaseUid' | 'email' | 'authProvider'> &
    Partial<Pick<IUser, 'role'>>,
): Promise<UserDocument> {
  return User.create(data)
}

export function touchLastLogin(userId: string): Promise<void> {
  return User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } }).then(
    () => undefined,
  )
}

export function updateLanguagePreference(
  userId: string,
  languagePreference: LanguagePreference,
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(userId, { $set: { languagePreference } }, { new: true })
}

export type AdminUserListFilter = {
  /** Matches against `email` (case-insensitive substring) — the only field
   * on this deliberately-minimal identity document worth searching by;
   * name lives on the separate `Profile` collection (see
   * `services/admin/adminUsers.service.ts` for how the two are joined). */
  search?: string
  role?: Role
  status?: UserStatus
  /** `'premium'` matches every non-`free` tier in one filter — the Admin
   * Panel's "Premium students" concept is tier-based, never a literal role
   * (see `constants/roles.ts`'s header comment). */
  subscriptionTier?: SubscriptionTier | 'premium'
}

function buildAdminUserQuery(filter: AdminUserListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.search) {
    query.email = { $regex: filter.search.trim(), $options: 'i' }
  }
  if (filter.role) query.role = filter.role
  if (filter.status) query.status = filter.status
  if (filter.subscriptionTier === 'premium') {
    query.subscriptionTier = { $ne: 'free' }
  } else if (filter.subscriptionTier) {
    query.subscriptionTier = filter.subscriptionTier
  }
  return query
}

export async function listForAdmin(
  filter: AdminUserListFilter,
  page: number,
  limit: number,
): Promise<{ items: UserDocument[]; total: number }> {
  const query = buildAdminUserQuery(filter)
  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ])
  return { items, total }
}

export function countByFilter(filter: AdminUserListFilter): Promise<number> {
  return User.countDocuments(buildAdminUserQuery(filter))
}

/** Most recently created students — Admin Dashboard's "Recent Registrations"
 * widget (Step 52). Deliberately excludes admin-staff roles (a fresh
 * `content_editor`/`admin` account isn't a "registration" in the product
 * sense this widget communicates). */
export function findRecentStudentRegistrations(limit: number): Promise<UserDocument[]> {
  return User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(limit)
}

export function updateStatus(
  userId: string,
  status: UserStatus,
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(userId, { $set: { status } }, { new: true })
}

export function updateRole(userId: string, role: Role): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
}

/** Denormalized JWT-claim field, kept in sync from `Subscription` activation/
 * expiry (docs/Database.md §4.6's "kept in sync from Subscriptions" note) —
 * see `services/payment.service.ts#activateSubscriptionForPayment` and
 * `services/subscription.service.ts`'s lazy-expiry check (Sprint 4 Step 56).
 * The JWT itself only reflects this on next token refresh — an accepted
 * staleness window, documented in docs/Authentication.md. */
export function updateSubscriptionTier(
  userId: string,
  subscriptionTier: SubscriptionTier,
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(userId, { $set: { subscriptionTier } }, { new: true })
}
