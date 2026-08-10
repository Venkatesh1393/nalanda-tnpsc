import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

export interface ISectionalScore {
  subjectId: Types.ObjectId
  averageScore: number
}

export interface ITopicRank {
  topicId: Types.ObjectId
  score: number
  rank: number
}

export interface ITrendPoint {
  date: Date
  score: number
}

const sectionalScoreSchema = new Schema<ISectionalScore>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    averageScore: Number,
  },
  { _id: false },
)
const topicRankSchema = new Schema<ITopicRank>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    score: Number,
    rank: Number,
  },
  { _id: false },
)
const trendPointSchema = new Schema<ITrendPoint>(
  { date: Date, score: Number },
  { _id: false },
)

/**
 * Named `StudentAnalytics` (not `docs/Database.md`'s plain `Analytics`) to
 * avoid colliding with the generic word elsewhere in the codebase — same
 * document shape/intent otherwise. A materialized view, computed by a
 * background job from `QuestionAttempt`, never live-aggregated on request
 * (docs/Database.md §8.1). `sectionalScores`/`weakTopics` are arrays rather
 * than the doc's literal `Map`, matching `Profile.syllabusProgress`'s same
 * Mongoose-idiomatic substitution. `strongTopics` is this schema's own
 * addition — `docs/Analytics.md`'s actual UI spec (equal-weight Weak *and*
 * Strong areas) needs it even though `Database.md`'s original table didn't
 * list it.
 */
export interface IStudentAnalytics {
  userId: Types.ObjectId
  examId: Types.ObjectId
  computedAt: Date
  sectionalScores: ISectionalScore[]
  weakTopics: ITopicRank[]
  strongTopics: ITopicRank[]
  percentile?: number
  rankEstimate?: number
  /** Bounded to a rolling window (e.g. last 90 days) by whichever job writes
   * this document — not enforced by the schema itself. */
  trend: ITrendPoint[]
}

export type StudentAnalyticsDocument = HydratedDocument<IStudentAnalytics>

const studentAnalyticsSchema = new Schema<IStudentAnalytics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    computedAt: { type: Date, default: Date.now },
    sectionalScores: { type: [sectionalScoreSchema], default: [] },
    weakTopics: { type: [topicRankSchema], default: [] },
    strongTopics: { type: [topicRankSchema], default: [] },
    percentile: { type: Number, min: 0, max: 100 },
    rankEstimate: { type: Number, min: 1 },
    trend: { type: [trendPointSchema], default: [] },
  },
  { timestamps: true },
)

studentAnalyticsSchema.index({ userId: 1, examId: 1 }, { unique: true })

export const StudentAnalytics = model<IStudentAnalytics>(
  'StudentAnalytics',
  studentAnalyticsSchema,
)
