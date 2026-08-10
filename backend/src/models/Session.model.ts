import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export const SESSION_REVOKE_REASONS = [
  'logout',
  'logout_all',
  'reuse_detected',
  'admin',
  'rotated',
] as const
export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[number]

/**
 * One document per active refresh token / device (docs/Authentication.md
 * §5/§8) — not in `docs/Database.md`'s original 23-collection list, added
 * because that doc's `Users.refreshTokenHash` (a single field) can't
 * represent "one session per device" or support rotation/reuse-detection,
 * both of which `Authentication.md` §5 explicitly requires. Never stores
 * the raw refresh token, only a SHA-256 hash of it — see `utils/session.ts`.
 */
export interface ISession {
  userId: Types.ObjectId
  refreshTokenHash: string
  /** Constant across a token's rotation lineage — reuse detection revokes
   * every session sharing a `familyId`, not just the one reused token. */
  familyId: string
  deviceInfo?: string
  /** Carried across rotation so `POST /auth/refresh` can re-apply the same
   * cookie persistence policy without the client re-sending it every call
   * (docs/Authentication.md §9). */
  rememberMe: boolean
  lastUsedAt: Date
  revoked: boolean
  revokedAt?: Date
  revokedReason?: SessionRevokeReason
}

export type SessionDocument = HydratedDocument<ISession>

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true },
    deviceInfo: { type: String, trim: true },
    rememberMe: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokedReason: { type: String, enum: SESSION_REVOKE_REASONS },
  },
  { timestamps: true },
)

sessionSchema.index({ userId: 1, revoked: 1 })
sessionSchema.index({ familyId: 1 })

export const Session = model<ISession>('Session', sessionSchema)
