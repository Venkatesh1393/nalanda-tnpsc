import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import {
  LEARNING_STYLES,
  NOT_SURE_TARGET_MONTH,
  TARGET_MONTH_PATTERN,
} from '../constants/onboarding'
import { LANGUAGE_PREFERENCES, STUDY_HOURS_BANDS } from '../constants/user'

const targetMonthSchema = z
  .string()
  .refine(
    (value) => value === NOT_SURE_TARGET_MONTH || TARGET_MONTH_PATTERN.test(value),
    {
      message: 'targetMonth must be "not-sure" or a "YYYY-MM" string',
    },
  )

/** Body shape for `PATCH /onboarding` (Step 44 §B) — a partial save of
 * whatever step the wizard is currently on, so a mid-wizard refresh never
 * loses progress. Every field optional; at least one required per call. */
export const onboardingDraftSchema = z
  .object({
    language: z.enum(LANGUAGE_PREFERENCES).optional(),
    examCategories: z.array(z.enum(EXAM_CATEGORY_CODES)).optional(),
    targetMonth: targetMonthSchema.nullable().optional(),
    studyHoursBand: z.enum(STUDY_HOURS_BANDS).nullable().optional(),
    weakSubjects: z.array(z.string().trim().min(1)).optional(),
    learningStyle: z.enum(LEARNING_STYLES).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  })

export type OnboardingDraftBody = z.infer<typeof onboardingDraftSchema>

/** Body shape for `POST /onboarding/complete` — the wizard's final
 * submission. `weakSubjects`/`learningStyle` stay optional (docs/Onboarding.md
 * Screen 5: zero weak subjects is a valid, unpenalized outcome). */
export const onboardingCompleteSchema = z.object({
  language: z.enum(LANGUAGE_PREFERENCES),
  examCategories: z.array(z.enum(EXAM_CATEGORY_CODES)).min(1, 'Select at least one exam'),
  targetMonth: targetMonthSchema.nullable().optional(),
  studyHoursBand: z.enum(STUDY_HOURS_BANDS),
  weakSubjects: z.array(z.string().trim().min(1)).optional().default([]),
  learningStyle: z.enum(LEARNING_STYLES).nullable().optional(),
})

export type OnboardingCompleteBody = z.infer<typeof onboardingCompleteSchema>
