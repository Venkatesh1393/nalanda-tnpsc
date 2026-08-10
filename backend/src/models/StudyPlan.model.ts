import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export const STUDY_TASK_STATUSES = ['pending', 'done', 'skipped'] as const
export type StudyTaskStatus = (typeof STUDY_TASK_STATUSES)[number]

export interface IStudyTask {
  date: Date
  taskType: string
  refId?: Types.ObjectId
  status: StudyTaskStatus
}

const studyTaskSchema = new Schema<IStudyTask>(
  {
    date: { type: Date, required: true },
    taskType: { type: String, required: true, trim: true },
    refId: { type: Schema.Types.ObjectId },
    status: { type: String, enum: STUDY_TASK_STATUSES, default: 'pending' },
  },
  { _id: false },
)

/**
 * `dailyTasks` is a rolling window (docs/Database.md §8.3), not the plan's
 * entire lifetime history — pruning old entries is a future service-layer
 * concern (e.g. a scheduled job trimming completed tasks older than N
 * days), not enforced by the schema itself.
 */
export interface IStudyPlan {
  userId: Types.ObjectId
  examId: Types.ObjectId
  targetDate?: Date
  dailyHoursBand?: string
  dailyTasks: IStudyTask[]
  planVersion: number
  aiPromptVersion?: string
}

export type StudyPlanDocument = HydratedDocument<IStudyPlan>

const studyPlanSchema = new Schema<IStudyPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    targetDate: { type: Date },
    dailyHoursBand: { type: String, trim: true },
    dailyTasks: { type: [studyTaskSchema], default: [] },
    planVersion: { type: Number, default: 1, min: 1 },
    aiPromptVersion: { type: String, trim: true },
  },
  { timestamps: true },
)

// One active plan per user per exam (docs/Database.md §6).
studyPlanSchema.index({ userId: 1, examId: 1 }, { unique: true })

export const StudyPlan = model<IStudyPlan>('StudyPlan', studyPlanSchema)
