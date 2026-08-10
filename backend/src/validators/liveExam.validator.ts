import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import {
  LIVE_EXAM_STATUSES,
  LIVE_EXAM_TABS,
  RESULT_PUBLICATION_MODES,
} from '../constants/liveExam'

const objectIdString = z.string().refine(isValidObjectId, 'Invalid id')

export const listQuerySchema = z.object({
  tab: z.enum(LIVE_EXAM_TABS),
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export const liveExamIdParamsSchema = z.object({
  liveExamId: objectIdString,
})

export const submitAnswerSchema = z
  .object({
    questionId: objectIdString,
    selectedOptionId: z
      .string()
      .min(1, 'selectedOptionId cannot be empty')
      .nullable()
      .optional(),
    markedForReview: z.boolean().optional(),
  })
  .refine(
    (body) => body.selectedOptionId !== undefined || body.markedForReview !== undefined,
    { message: 'Provide at least one of selectedOptionId or markedForReview' },
  )
export type SubmitAnswerBody = z.infer<typeof submitAnswerSchema>

// --- Admin CRUD (Sprint 4 Step 54) -----------------------------------------

const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().optional(),
})

const negativeMarkingSchema = z
  .object({
    enabled: z.boolean().default(false),
    marksPerWrongAnswer: z.number().min(0).default(0),
  })
  .default({ enabled: false, marksPerWrongAnswer: 0 })

const instructionsSchema = z
  .object({ en: z.array(z.string()).default([]), ta: z.array(z.string()).default([]) })
  .default({ en: [], ta: [] })

const resultPublicationSchema = z
  .object({
    mode: z.enum(RESULT_PUBLICATION_MODES).default('immediate'),
    publishAt: z.coerce.date().optional(),
  })
  .default({ mode: 'immediate' })

/** `totalQuestions`/`totalMarks` are deliberately not accepted here — the
 * admin service always derives them from `questionIds.length` and
 * `marksPerQuestion` server-side, so the two can never be entered
 * inconsistently with each other. */
const baseLiveExamFields = {
  title: requiredBilingualSchema,
  description: requiredBilingualSchema,
  examId: objectIdString,
  subjectIds: z.array(objectIdString).min(1, 'At least one subject is required'),
  questionIds: z.array(objectIdString).min(1, 'At least one question is required'),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.coerce.date(),
  durationMinutes: z.number().int().min(1),
  marksPerQuestion: z.number().min(0),
  negativeMarking: negativeMarkingSchema,
  instructions: instructionsSchema,
  resultPublication: resultPublicationSchema,
}

function refineLiveExamInvariants<
  T extends {
    scheduledStartAt?: Date
    scheduledEndAt?: Date
    resultPublication?: { mode: string; publishAt?: Date }
  },
>(data: T, ctx: z.RefinementCtx): void {
  if (
    data.scheduledStartAt &&
    data.scheduledEndAt &&
    data.scheduledEndAt <= data.scheduledStartAt
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduledEndAt'],
      message: 'scheduledEndAt must be after scheduledStartAt.',
    })
  }
  if (
    data.resultPublication?.mode === 'scheduled' &&
    data.resultPublication.publishAt === undefined
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['resultPublication', 'publishAt'],
      message: 'resultPublication.publishAt is required when mode is "scheduled".',
    })
  }
}

export const createLiveExamBodySchema = z
  .object(baseLiveExamFields)
  .superRefine(refineLiveExamInvariants)
export type CreateLiveExamBody = z.infer<typeof createLiveExamBodySchema>

export const updateLiveExamBodySchema = z
  .object(baseLiveExamFields)
  .partial()
  .superRefine(refineLiveExamInvariants)
export type UpdateLiveExamBody = z.infer<typeof updateLiveExamBodySchema>

export const listLiveExamsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  examId: objectIdString.optional(),
  status: z.enum(LIVE_EXAM_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListLiveExamsQuery = z.infer<typeof listLiveExamsQuerySchema>
