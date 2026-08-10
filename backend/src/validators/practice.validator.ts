import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { EXAM_CATEGORY_CODES } from '../constants/exam'
import { PRACTICE_DIFFICULTY_FILTERS } from '../constants/practice'

const objectIdString = z.string().refine(isValidObjectId, 'Invalid id')

export const createSessionSchema = z.object({
  examCategory: z.enum(EXAM_CATEGORY_CODES).optional(),
  subjectId: z.string().min(1, 'subjectId is required'),
  topicId: z.string().min(1, 'topicId is required'),
  questionCount: z.coerce.number().int().min(1).max(150),
  difficulty: z.enum(PRACTICE_DIFFICULTY_FILTERS).default('all'),
})
export type CreateSessionBody = z.infer<typeof createSessionSchema>

export const sessionIdParamsSchema = z.object({
  sessionId: objectIdString,
})

export const submitAnswerSchema = z.object({
  questionId: objectIdString,
  selectedOptionId: z.string().min(1, 'selectedOptionId is required'),
  responseTime: z.coerce.number().min(0).default(0),
})
export type SubmitAnswerBody = z.infer<typeof submitAnswerSchema>

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
})
export type HistoryQuery = z.infer<typeof historyQuerySchema>
