import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import {
  QUESTION_DIFFICULTIES,
  QUESTION_SOURCES,
  QUESTION_TYPES,
  TNPSC_EXAM_STAGES,
} from '../constants/practice'

export const idParamsSchema = z.object({
  id: z.string().min(1),
})
export type IdParams = z.infer<typeof idParamsSchema>

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')

export const questionIdParamsSchema = z.object({
  id: objectIdSchema,
})
export type QuestionIdParams = z.infer<typeof questionIdParamsSchema>

const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().optional(),
})

const optionalBilingualSchema = z
  .object({
    en: z.string().trim().optional(),
    ta: z.string().trim().optional(),
  })
  .optional()

const questionOptionInputSchema = z.object({
  optionId: z.string().trim().min(1),
  text: requiredBilingualSchema,
  isCorrect: z.boolean().default(false),
})

/**
 * Mirrors `Question.model.ts`'s own "2-6 options; mcq_single needs exactly
 * one correct option, other types at least one" validator so a bad request
 * gets a specific, friendly 400 here rather than the generic Mongoose
 * `ValidationError` fallback (`errorHandler.middleware.ts` only surfaces
 * field *names* for that, not messages) — Mongoose still re-checks the same
 * rule on save as the real second line of defense, per that model's own
 * header comment.
 */
function refineQuestionInvariants<
  T extends {
    options?: { isCorrect: boolean }[]
    questionType?: string
    isPreviousYear?: boolean
    pyqYear?: number
  },
>(data: T, ctx: z.RefinementCtx): void {
  if (data.options) {
    if (data.options.length < 2 || data.options.length > 6) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Options must contain 2-6 entries.',
      })
    } else {
      const correctCount = data.options.filter((option) => option.isCorrect).length
      const questionType = data.questionType ?? 'mcq_single'
      if (questionType === 'mcq_single' && correctCount !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'mcq_single questions need exactly one correct option.',
        })
      } else if (questionType !== 'mcq_single' && correctCount < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'At least one option must be marked correct.',
        })
      }
    }
  }

  if (data.isPreviousYear && data.pyqYear === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['pyqYear'],
      message: 'pyqYear is required when isPreviousYear is true.',
    })
  }
}

const baseQuestionFields = {
  examIds: z.array(objectIdSchema).min(1, 'At least one exam is required'),
  subjectId: objectIdSchema,
  topicId: objectIdSchema,
  subtopicId: objectIdSchema,
  questionText: requiredBilingualSchema,
  questionImageUrl: z.string().trim().url().optional(),
  options: z.array(questionOptionInputSchema).min(2).max(6),
  difficulty: z.enum(QUESTION_DIFFICULTIES).default('medium'),
  questionType: z.enum(QUESTION_TYPES).default('mcq_single'),
  explanation: optionalBilingualSchema,
  source: z.enum(QUESTION_SOURCES).default('curated'),
  isPreviousYear: z.boolean().default(false),
  pyqYear: z.coerce
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1)
    .optional(),
  tnpscExamType: z.enum(TNPSC_EXAM_STAGES).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  aiExplanationEligible: z.boolean().default(true),
}

export const createQuestionBodySchema = z
  .object(baseQuestionFields)
  .superRefine(refineQuestionInvariants)
export type CreateQuestionBody = z.infer<typeof createQuestionBodySchema>

export const updateQuestionBodySchema = z
  .object(baseQuestionFields)
  .partial()
  .superRefine(refineQuestionInvariants)
export type UpdateQuestionBody = z.infer<typeof updateQuestionBodySchema>

export const updateQuestionStatusBodySchema = z.object({
  isActive: z.boolean(),
})
export type UpdateQuestionStatusBody = z.infer<typeof updateQuestionStatusBodySchema>

const booleanQueryParam = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional()

export const listQuestionsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  examId: objectIdSchema.optional(),
  subjectId: objectIdSchema.optional(),
  topicId: objectIdSchema.optional(),
  subtopicId: objectIdSchema.optional(),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
  language: z.enum(['en', 'ta']).optional(),
  isPreviousYear: booleanQueryParam,
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>

export const listMetaSubjectsQuerySchema = z.object({ examId: objectIdSchema.optional() })
export const listMetaTopicsQuerySchema = z.object({ subjectId: objectIdSchema })
export const listMetaSubtopicsQuerySchema = z.object({ topicId: objectIdSchema })

export const importTemplateQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'docx']).default('csv'),
})

export const importConfirmBodySchema = z.object({
  rowNumbers: z
    .string()
    .transform((value, ctx) => {
      try {
        const parsed = JSON.parse(value) as unknown
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'number')) {
          throw new Error('not a number array')
        }
        return parsed as number[]
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'rowNumbers must be a JSON array of numbers',
        })
        return z.NEVER
      }
    })
    .refine((rows) => rows.length > 0, 'At least one row must be selected'),
})
export type ImportConfirmBody = z.infer<typeof importConfirmBodySchema>

/** Re-exported for the import parser's reference-validation step — keeps the
 * "known exam codes" list in one place rather than re-declaring it. */
export const KNOWN_EXAM_CODES = EXAM_CATEGORY_CODES

// --- Content Workflow (Sprint 4 Step 71.5) --------------------------------

export const requestChangesBodySchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required.').max(1000),
})
export type RequestChangesBody = z.infer<typeof requestChangesBodySchema>

export const versionParamsSchema = z.object({
  id: objectIdSchema,
  versionNumber: z.coerce.number().int().min(1),
})
export type VersionParams = z.infer<typeof versionParamsSchema>

// --- Bulk Update / Bulk Delete (Sprint 4 Step 71.5) -----------------------

/** Deliberately narrower than `updateQuestionBodySchema` — bulk operations
 * only ever touch fields with no cross-document reference/invariant to
 * re-check (see `services/admin/questionBulkActions.service.ts`'s header
 * comment). Hierarchy references and content text stay single-question- or
 * file-import-only. */
const bulkUpdatePatchSchema = z
  .object({
    isActive: z.boolean(),
    isPremium: z.boolean(),
    difficulty: z.enum(QUESTION_DIFFICULTIES),
    tags: z.array(z.string().trim().min(1)),
    aiExplanationEligible: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'At least one field is required.')

export const bulkUpdateBodySchema = z.object({
  questionIds: z.array(objectIdSchema).min(1).max(10000),
  patch: bulkUpdatePatchSchema,
})
export type BulkUpdateBody = z.infer<typeof bulkUpdateBodySchema>

export const bulkUpdatePreviewBodySchema = z.object({
  questionIds: z.array(objectIdSchema).min(1).max(10000),
})
export type BulkUpdatePreviewBody = z.infer<typeof bulkUpdatePreviewBodySchema>

export const bulkDeleteBodySchema = z.object({
  questionIds: z.array(objectIdSchema).min(1).max(10000),
})
export type BulkDeleteBody = z.infer<typeof bulkDeleteBodySchema>
