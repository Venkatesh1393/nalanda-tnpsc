import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export const PROGRESS_STATUSES = ['not_started', 'in_progress', 'completed'] as const
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]

export interface ILessonProgress {
  lessonId: Types.ObjectId
  status: ProgressStatus
  progressPercent: number
  completedAt?: Date
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    status: { type: String, enum: PROGRESS_STATUSES, default: 'not_started' },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date },
  },
  { _id: false },
)

/**
 * Not in `docs/Database.md` — a new collection backing the already-built
 * `frontend/src/services/learnProgressService.ts` (currently a localStorage
 * mock). One document per (user, subtopic); `lessons` embeds per-lesson
 * progress since a subtopic's lesson list is small and bounded (the same
 * embedding rule `Question.options` and `PracticeSession.answers` use) —
 * this is the granular record `Profile.syllabusProgress`'s per-exam summary
 * ultimately rolls up from, the same relationship
 * `QuestionAttempt`→`StudentAnalytics` already has.
 */
export interface ILearningProgress {
  userId: Types.ObjectId
  subjectId: Types.ObjectId
  topicId: Types.ObjectId
  subtopicId: Types.ObjectId
  lessons: ILessonProgress[]
  notesRead: boolean
  status: ProgressStatus
  lastAccessedAt: Date
  completedAt?: Date
}

export type LearningProgressDocument = HydratedDocument<ILearningProgress>

const learningProgressSchema = new Schema<ILearningProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    subtopicId: { type: Schema.Types.ObjectId, ref: 'Subtopic', required: true },
    lessons: { type: [lessonProgressSchema], default: [] },
    notesRead: { type: Boolean, default: false },
    status: { type: String, enum: PROGRESS_STATUSES, default: 'not_started' },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

learningProgressSchema.index({ userId: 1, subtopicId: 1 }, { unique: true })
learningProgressSchema.index({ userId: 1, subjectId: 1 })
learningProgressSchema.index({ userId: 1, topicId: 1 })

export const LearningProgress = model<ILearningProgress>(
  'LearningProgress',
  learningProgressSchema,
)
