import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

/**
 * Sprint 4 Step 59 — Nalanda AI Tutor. A conversation thread, distinct from
 * both `AIExplanation` (a shared, reusable content cache — nothing here is
 * shareable, a tutor chat is inherently one student's private thread) and
 * `AIHistory` (the per-turn audit log — `AIHistory` gained an optional
 * `conversationId` in this step to link a turn back to its thread, but never
 * stores the message content itself; that lives here and on `AiMessage`).
 *
 * `contextType`/`contextRefId` are the optional grounding source picked
 * when the student opens the tutor from a specific screen (a lesson, a
 * practice question, a topic) — see `prompts/aiTutor.v1.ts` for how this is
 * resolved into prompt context on every turn. Deliberately just an id
 * reference, re-resolved live from the source collection each turn, rather
 * than a content snapshot copied in at creation time — keeps this document
 * small and the grounding always up to date with the real Nalanda content.
 *
 * No soft-delete plugin — "Delete Conversation" (this step's explicit
 * requirement) is a real, permanent delete of the thread and its messages,
 * matching `docs/Architecture.md` §10's "self-serve data export/delete
 * flows" expectation; usage/cost visibility survives independently in
 * `AIHistory`, which this deletion never touches.
 */
export const AI_TUTOR_CONTEXT_TYPES = ['lesson', 'question', 'topic'] as const
export type AiTutorContextType = (typeof AI_TUTOR_CONTEXT_TYPES)[number]

export interface IAiConversation {
  userId: Types.ObjectId
  title: string
  language: 'en' | 'ta'
  contextType?: AiTutorContextType
  contextRefId?: Types.ObjectId
  /** Sprint 4 Step 64 — "Pinned Chat." A pinned conversation sorts before
   * every unpinned one regardless of recency (`aiConversation.repository.ts`'s
   * `findByUser`) — the same "explicit override beats recency" idea
   * `Bookmark`/`Notification.isArchived` already use elsewhere, just for
   * ordering rather than visibility. */
  isPinned: boolean
  messageCount: number
  lastMessageAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export type AiConversationDocument = HydratedDocument<IAiConversation>

const aiConversationSchema = new Schema<IAiConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    language: { type: String, enum: ['en', 'ta'], required: true },
    contextType: { type: String, enum: AI_TUTOR_CONTEXT_TYPES },
    contextRefId: { type: Schema.Types.ObjectId },
    isPinned: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
)

aiConversationSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 })
// Sprint 4 Step 64 — "Search Chat" (conversation title search).
aiConversationSchema.index({ userId: 1, title: 1 })

export const AiConversation = model<IAiConversation>(
  'AiConversation',
  aiConversationSchema,
)
