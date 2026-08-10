import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '../constants/roles'
import {
  BILLING_CYCLES,
  SUBSCRIPTION_STATUSES,
  type BillingCycle,
  type SubscriptionStatus,
} from '../constants/commerce'

/** The only payment provider integrated so far — kept as its own union
 * (rather than a bare `string`) so a future second provider is a one-line
 * addition here, per Sprint 4 Step 55's "provider" tracking requirement.
 * Razorpay integration itself is explicitly out of scope for this step. */
export const SUBSCRIPTION_PROVIDERS = ['razorpay'] as const
export type SubscriptionProvider = (typeof SUBSCRIPTION_PROVIDERS)[number]

export interface ITierChange {
  tier: SubscriptionTier
  changedAt: Date
}

const tierChangeSchema = new Schema<ITierChange>(
  {
    tier: { type: String, enum: SUBSCRIPTION_TIERS, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

export interface ISubscription {
  userId: Types.ObjectId
  /** No `ref` enforced yet — see `Profile.institutionId`'s same note. */
  institutionId?: Types.ObjectId
  tier: SubscriptionTier
  status: SubscriptionStatus
  billingCycle?: BillingCycle
  provider?: SubscriptionProvider
  razorpaySubscriptionId?: string
  /** Razorpay's customer identifier — distinct from `razorpaySubscriptionId`
   * (docs/API.md §8's `POST /payments/orders`/`verify` flow creates the
   * subscription id; the customer id is reused across a user's subscriptions
   * over time, e.g. Plus → Pro). */
  providerCustomerId?: string
  startDate?: Date
  currentPeriodEnd?: Date
  autoRenew: boolean
  tierHistory: ITierChange[]
}

export type SubscriptionDocument = HydratedDocument<ISubscription>

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId },
    tier: { type: String, enum: SUBSCRIPTION_TIERS, required: true },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
      default: 'inactive',
    },
    billingCycle: { type: String, enum: BILLING_CYCLES },
    provider: { type: String, enum: SUBSCRIPTION_PROVIDERS },
    razorpaySubscriptionId: { type: String, trim: true },
    providerCustomerId: { type: String, trim: true },
    startDate: { type: Date },
    currentPeriodEnd: {
      type: Date,
      validate: {
        validator(this: ISubscription, value: Date | undefined) {
          return this.status !== 'active' || value !== undefined
        },
        message: 'currentPeriodEnd is required while status is "active".',
      },
    },
    autoRenew: { type: Boolean, default: false },
    tierHistory: { type: [tierChangeSchema], default: [] },
  },
  { timestamps: true },
)

subscriptionSchema.index({ userId: 1 })
subscriptionSchema.index({ razorpaySubscriptionId: 1 }, { unique: true, sparse: true })

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema)
