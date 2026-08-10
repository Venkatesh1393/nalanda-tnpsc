import { type HydratedDocument, model, Schema } from 'mongoose'

import {
  AUTH_PROVIDERS,
  LANGUAGE_PREFERENCES,
  USER_STATUSES,
  type AuthProvider,
  type LanguagePreference,
  type UserStatus,
} from '../constants/user'
import {
  ROLES,
  SUBSCRIPTION_TIERS,
  type Role,
  type SubscriptionTier,
} from '../constants/roles'

/**
 * The hot-path identity document — every authenticated request reads this
 * for role/tier claims, so it stays deliberately minimal (docs/Database.md
 * §4.1); richer personalization lives in `Profile`, a separate 1:1
 * collection, not embedded here.
 *
 * Deliberately excludes any refresh-token/session storage — this step is
 * models only ("do not implement authentication yet"). Authentication.md
 * implies multi-device sessions (one refresh token per device, revocable
 * individually), which doesn't fit a single field on this document anyway;
 * that's real design work for whichever step builds the Auth module.
 */
export interface IUser {
  firebaseUid: string
  email: string
  authProvider: AuthProvider
  role: Role
  subscriptionTier: SubscriptionTier
  status: UserStatus
  languagePreference: LanguagePreference
  lastLoginAt?: Date
  /** Populated by Mongoose's `timestamps: true` — declared here only so
   * TypeScript knows it exists on a hydrated document (Step 44's `GET
   * /users/me` needs a "created date"); the schema option below is what
   * actually sets it, not this declaration. */
  createdAt?: Date
}

export type UserDocument = HydratedDocument<IUser>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const userSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: EMAIL_PATTERN,
    },
    authProvider: { type: String, enum: AUTH_PROVIDERS, required: true },
    role: { type: String, enum: ROLES, default: 'user' },
    subscriptionTier: { type: String, enum: SUBSCRIPTION_TIERS, default: 'free' },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    languagePreference: {
      type: String,
      enum: LANGUAGE_PREFERENCES,
      default: 'bilingual',
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
)

userSchema.index({ role: 1 })
userSchema.index({ status: 1 })

export const User = model<IUser>('User', userSchema)
