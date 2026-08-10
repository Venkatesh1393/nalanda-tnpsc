/**
 * The 8 TNPSC exam categories — kept identical to
 * `frontend/src/constants/exam.ts`'s `EXAM_CATEGORIES` ids so an `Exam.code`
 * value round-trips through the API without a translation layer.
 */
export const EXAM_CATEGORY_CODES = [
  'group-1',
  'group-2',
  'group-2a',
  'group-4',
  'vao',
  'police',
  'forest',
  'trb',
] as const

export type ExamCategoryCode = (typeof EXAM_CATEGORY_CODES)[number]
