import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import { LESSON_TYPES } from '../models/Lesson.model'
import { STUDY_MATERIAL_TYPES } from '../models/StudyMaterial.model'

const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid id')
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'slug must be lowercase letters, numbers, and hyphens only',
  )

const requiredBilingualSchema = z.object({
  en: z.string().trim().min(1, 'English text is required'),
  ta: z.string().trim().optional(),
})
const optionalBilingualSchema = z
  .object({ en: z.string().trim().optional(), ta: z.string().trim().optional() })
  .optional()

export const idParamsSchema = z.object({ id: objectIdSchema })
export type IdParams = z.infer<typeof idParamsSchema>

const statusEnum = z.enum(['active', 'inactive', 'archived'])
const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

// --- Exam (no soft-delete — status is active/inactive only) --------------

export const createExamBodySchema = z.object({
  code: z.enum(EXAM_CATEGORY_CODES),
  name: requiredBilingualSchema,
  description: optionalBilingualSchema,
  icon: z.string().trim().optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})
export type CreateExamBody = z.infer<typeof createExamBodySchema>

export const updateExamBodySchema = createExamBodySchema.partial()
export type UpdateExamBody = z.infer<typeof updateExamBodySchema>

export const listExamsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  ...paginationFields,
})
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>

// --- Subject ---------------------------------------------------------------

export const createSubjectBodySchema = z.object({
  slug: slugSchema,
  name: requiredBilingualSchema,
  examIds: z.array(objectIdSchema).min(1, 'At least one exam is required'),
  order: z.number().int().default(0),
  icon: z.string().trim().optional(),
  isActive: z.boolean().default(true),
})
export type CreateSubjectBody = z.infer<typeof createSubjectBodySchema>

export const updateSubjectBodySchema = createSubjectBodySchema.partial()
export type UpdateSubjectBody = z.infer<typeof updateSubjectBodySchema>

export const listSubjectsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  examId: objectIdSchema.optional(),
  status: statusEnum.optional(),
  ...paginationFields,
})
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>

// --- Topic --- `examIds` is never client-supplied — always denormalized
// server-side from the parent Subject, so it can never drift out of sync. --

export const createTopicBodySchema = z.object({
  slug: slugSchema,
  subjectId: objectIdSchema,
  name: requiredBilingualSchema,
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})
export type CreateTopicBody = z.infer<typeof createTopicBodySchema>

export const updateTopicBodySchema = createTopicBodySchema.partial()
export type UpdateTopicBody = z.infer<typeof updateTopicBodySchema>

export const listTopicsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  subjectId: objectIdSchema.optional(),
  status: statusEnum.optional(),
  ...paginationFields,
})
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>

// --- Subtopic --- `subjectId`/`examIds` denormalized server-side from the
// parent Topic, same reasoning as Topic's `examIds` above. -----------------

export const createSubtopicBodySchema = z.object({
  slug: slugSchema,
  topicId: objectIdSchema,
  name: requiredBilingualSchema,
  order: z.number().int().default(0),
  estimatedMinutes: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
})
export type CreateSubtopicBody = z.infer<typeof createSubtopicBodySchema>

export const updateSubtopicBodySchema = createSubtopicBodySchema.partial()
export type UpdateSubtopicBody = z.infer<typeof updateSubtopicBodySchema>

export const listSubtopicsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  topicId: objectIdSchema.optional(),
  status: statusEnum.optional(),
  ...paginationFields,
})
export type ListSubtopicsQuery = z.infer<typeof listSubtopicsQuerySchema>

// --- Lesson ------------------------------------------------------------

export const createLessonBodySchema = z.object({
  subtopicId: objectIdSchema,
  title: requiredBilingualSchema,
  type: z.enum(LESSON_TYPES).default('video'),
  order: z.number().int().default(0),
  video: z
    .object({
      cloudinaryAssetId: z.string().trim().optional(),
      durationSeconds: z.number().int().min(0).optional(),
      thumbnailUrl: z.string().trim().url().optional(),
    })
    .optional(),
  transcript: optionalBilingualSchema,
  isPremium: z.boolean().default(false),
  isActive: z.boolean().default(true),
})
export type CreateLessonBody = z.infer<typeof createLessonBodySchema>

export const updateLessonBodySchema = createLessonBodySchema.partial()
export type UpdateLessonBody = z.infer<typeof updateLessonBodySchema>

export const listLessonsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  subtopicId: objectIdSchema.optional(),
  status: statusEnum.optional(),
  ...paginationFields,
})
export type ListLessonsQuery = z.infer<typeof listLessonsQuerySchema>

// --- StudyMaterial --- File attach/replace/remove stays on the existing
// Step 50 routes (`/study-materials/:id/file`) — these schemas cover only
// the plain metadata record, which had no create/update path before Step 54. --

export const createStudyMaterialBodySchema = z.object({
  subtopicId: objectIdSchema,
  title: requiredBilingualSchema,
  body: z
    .object({ en: z.array(z.string()).default([]), ta: z.array(z.string()).default([]) })
    .default({ en: [], ta: [] }),
  type: z.enum(STUDY_MATERIAL_TYPES).default('notes'),
  isPremium: z.boolean().default(false),
  isActive: z.boolean().default(true),
})
export type CreateStudyMaterialBody = z.infer<typeof createStudyMaterialBodySchema>

export const updateStudyMaterialBodySchema = createStudyMaterialBodySchema.partial()
export type UpdateStudyMaterialBody = z.infer<typeof updateStudyMaterialBodySchema>

export const listStudyMaterialsQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  subtopicId: objectIdSchema.optional(),
  status: statusEnum.optional(),
  ...paginationFields,
})
export type ListStudyMaterialsQuery = z.infer<typeof listStudyMaterialsQuerySchema>

// --- Shared -----------------------------------------------------------

export const updateActiveStatusBodySchema = z.object({ isActive: z.boolean() })
export type UpdateActiveStatusBody = z.infer<typeof updateActiveStatusBodySchema>
