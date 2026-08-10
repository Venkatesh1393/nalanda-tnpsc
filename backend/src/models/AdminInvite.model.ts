import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { ADMIN_ACCESS_ROLES, type Role } from '../constants/roles'

/**
 * A `super_admin`-issued invitation for a specific email to receive an
 * admin-staff role — the "register account for new admins" flow. No
 * separate admin credential store or self-service "become an admin" form
 * exists anywhere (that would be a real privilege-escalation hole); this is
 * the *only* mechanism by which an account other than the ones a
 * `super_admin` already manages can end up with an elevated role.
 *
 * Two ways an invite resolves, both handled in `services/admin/adminInvites.service.ts`:
 * - The invited email **already has a `User`** → the role is applied
 *   immediately, no `AdminInvite` document is even created.
 * - The invited email **has no `User` yet** → a `pending` document is
 *   created here; the moment that email first signs in via Firebase
 *   (Google or Email/Password, on either `frontend/` or `admin/` — one
 *   shared identity provider), `services/auth/userSync.service.ts` looks
 *   for a matching pending invite and creates the new `User` with the
 *   invited role instead of the default `user`, then marks this `consumed`.
 */
export interface IAdminInvite {
  email: string
  role: Role
  invitedById: Types.ObjectId
  invitedByEmail: string
  status: 'pending' | 'consumed' | 'revoked'
  consumedAt?: Date
  revokedAt?: Date
  createdAt?: Date
}

export type AdminInviteDocument = HydratedDocument<IAdminInvite>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const adminInviteSchema = new Schema<IAdminInvite>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: EMAIL_PATTERN,
    },
    // Deliberately excludes 'user' — inviting someone as a plain student
    // has no meaning here; ADMIN_ACCESS_ROLES is the same "is this
    // admin-staff at all" set the /admin/* route gate itself uses.
    role: { type: String, enum: ADMIN_ACCESS_ROLES, required: true },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedByEmail: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'consumed', 'revoked'],
      default: 'pending',
    },
    consumedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Not a hard unique index — a prior consumed/revoked invite for an email
// must never block a brand-new invite for that same email later. Lookups
// always filter by status alongside email (see the repository).
adminInviteSchema.index({ email: 1, status: 1 })
adminInviteSchema.index({ createdAt: -1 })

// Re-exported so callers (and any future admin UI) never need to import
// `constants/roles.ts` separately just to enumerate invitable roles.
export const INVITABLE_ROLES = ADMIN_ACCESS_ROLES

export const AdminInvite = model<IAdminInvite>('AdminInvite', adminInviteSchema)
