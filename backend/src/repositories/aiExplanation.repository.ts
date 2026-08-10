import type { Types } from 'mongoose'

import {
  AIExplanation,
  type AIExplanationDocument,
  type IAIExplanation,
} from '../models/AIExplanation.model'

/** The literal cache-key sentinel for a skipped question — see
 * `AIExplanation.model.ts`'s header comment for why this is a real string,
 * never null/undefined. */
export const UNANSWERED_SENTINEL = 'unanswered'

export function findCached(
  questionId: Types.ObjectId | string,
  selectedOptionId: string,
  language: 'en' | 'ta',
  promptVersion: string,
): Promise<AIExplanationDocument | null> {
  return AIExplanation.findOne({ questionId, selectedOptionId, language, promptVersion })
}

export function create(
  data: Omit<IAIExplanation, 'createdAt'>,
): Promise<AIExplanationDocument> {
  return AIExplanation.create(data)
}
