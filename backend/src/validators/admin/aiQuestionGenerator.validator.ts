import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import {
  MAX_CUSTOM_INSTRUCTIONS_LENGTH,
  MAX_QUESTIONS_PER_BATCH,
  MAX_REJECTION_REASON_LENGTH,
} from '../../constants/aiQuestionGenerator'
import { QUESTION_DIFFICULTIES, TNPSC_EXAM_STAGES } from '../../constants/practice'
import { AI_QUESTION_DRAFT_STATUSES } from '../../models/AiQuestionDraft.model'

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')

export const draftIdParamsSchema = z.object({
  id: objectIdSchema,
})
export type DraftIdParams = z.infer<typeof draftIdParamsSchema>

export const generateQuestionsBodySchema = z
  .object({
    examIds: z.array(objectIdSchema).min(1, 'At least one exam is required'),
    subjectId: objectIdSchema,
    topicId: objectIdSchema,
    subtopicId: objectIdSchema,
    difficulty: z.enum(QUESTION_DIFFICULTIES),
    count: z.coerce.number().int().min(1).max(MAX_QUESTIONS_PER_BATCH),
    isPreviousYear: z.boolean().default(false),
    pyqYear: z.coerce
      .number()
      .int()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    tnpscExamType: z.enum(TNPSC_EXAM_STAGES).optional(),
    language: z.enum(['en', 'ta']),
    customInstructions: z.string().trim().max(MAX_CUSTOM_INSTRUCTIONS_LENGTH).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isPreviousYear && data.pyqYear === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['pyqYear'],
        message: 'pyqYear is required when isPreviousYear is true.',
      })
    }
  })
export type GenerateQuestionsBody = z.infer<typeof generateQuestionsBodySchema>

export const listDraftsQuerySchema = z.object({
  status: z.enum(AI_QUESTION_DRAFT_STATUSES).optional(),
  subjectId: objectIdSchema.optional(),
  topicId: objectIdSchema.optional(),
  batchId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListDraftsQuery = z.infer<typeof listDraftsQuerySchema>

export const rejectDraftBodySchema = z.object({
  reason: z.string().trim().max(MAX_REJECTION_REASON_LENGTH).optional(),
})
export type RejectDraftBody = z.infer<typeof rejectDraftBodySchema>

const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().min(1, 'Tamil text is required'),
})
const optionalBilingualSchema = z
  .object({
    en: z.string().trim().optional(),
    ta: z.string().trim().optional(),
  })
  .optional()
const draftOptionInputSchema = z.object({
  optionId: z.string().trim().min(1),
  text: requiredBilingualSchema,
  isCorrect: z.boolean(),
})

/** Content-only — a draft's subject/topic/subtopic/exam chain is never
 * editable here, see `aiQuestionDraft.repository.ts#updateContent`'s header
 * comment. */
export const updateDraftBodySchema = z
  .object({
    questionText: requiredBilingualSchema.optional(),
    options: z.array(draftOptionInputSchema).min(2).max(6).optional(),
    explanation: optionalBilingualSchema,
    difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.options) {
      const correctCount = data.options.filter((option) => option.isCorrect).length
      if (correctCount !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Exactly one option must be marked correct.',
        })
      }
    }
  })
export type UpdateDraftBody = z.infer<typeof updateDraftBodySchema>
