import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { AI_CONFIDENCE_LEVELS, type AiConfidenceLevel } from '../constants/ai'

/**
 * Sprint 4 Step 59 — one turn in an `AiConversation` thread. `role`
 * mirrors the Anthropic Messages API's own `user`/`assistant` roles
 * directly, since conversation replay (`services/ai/aiTutor.service.ts`)
 * maps these rows straight onto the `messages` array sent to the provider
 * — no translation layer needed. `confidenceFlag`/`onTopic` are only ever
 * set on `assistant` rows (the model's self-reported assessment of its own
 * reply, structured-output-validated, never inferred after the fact).
 */
export interface IAiMessage {
  conversationId: Types.ObjectId
  userId: Types.ObjectId
  role: 'user' | 'assistant'
  content: string
  confidenceFlag?: AiConfidenceLevel
  createdAt?: Date
}

export type AiMessageDocument = HydratedDocument<IAiMessage>

const aiMessageSchema = new Schema<IAiMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'AiConversation',
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    confidenceFlag: { type: String, enum: AI_CONFIDENCE_LEVELS },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

aiMessageSchema.index({ conversationId: 1, createdAt: 1 })

export const AiMessage = model<IAiMessage>('AiMessage', aiMessageSchema)
