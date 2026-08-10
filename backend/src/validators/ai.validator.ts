import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

const objectIdString = z.string().refine(isValidObjectId, 'Invalid id')

/**
 * Sprint 4 Step 57 — `sessionId` + `questionId` (not a bare `questionId`
 * alone, matching `docs/API.md` §16's illustrative shape) so the service can
 * look up the student's *actual recorded answer* for that session instead
 * of trusting a client-supplied `selectedOptionId` — see
 * `services/ai/questionExplanation.service.ts`'s header comment.
 */
export const explainQuestionBodySchema = z.object({
  sessionId: objectIdString,
  questionId: objectIdString,
  language: z.enum(['en', 'ta']),
})
export type ExplainQuestionBody = z.infer<typeof explainQuestionBodySchema>
