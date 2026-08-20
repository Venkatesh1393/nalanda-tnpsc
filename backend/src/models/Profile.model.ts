import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

import { EXAM_CATEGORY_CODES, type ExamCategoryCode } from '../constants/exam'
import { LEARNING_STYLES, type LearningStyle } from '../constants/onboarding'
import { STUDY_HOURS_BANDS, type StudyHoursBand } from '../constants/user'

export interface IExamGoal {
  examId: Types.ObjectId
  targetDate?: Date
  dailyStudyHoursBand?: StudyHoursBand
  isPrimary: boolean
}

const examGoalSchema = new Schema<IExamGoal>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    targetDate: { type: Date },
    dailyStudyHoursBand: { type: String, enum: STUDY_HOURS_BANDS },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
)

export interface ISyllabusProgress {
  examId: Types.ObjectId
  percentComplete: number
}

/** Array of `{examId, percentComplete}` rather than `docs/Database.md`
 * §4.1's literal `Map: examCategory → percentComplete` — Mongoose Maps
 * keyed by a stringified ObjectId are awkward to query/validate; a small
 * bounded array (max ~8 exam goals per user) is equally cheap to read and
 * far more idiomatic here. Still a denormalized summary, same as the doc
 * intends — granular source of truth remains `LearningProgress`. */
const syllabusProgressSchema = new Schema<ISyllabusProgress>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    percentComplete: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
)

/**
 * The Onboarding wizard's own draft/completion state (docs/Onboarding.md,
 * Step 44) — kept as a dedicated sub-document rather than force-fitted into
 * `examGoals` above, since the wizard's shape (multi-select exam category
 * codes, a raw `targetMonth` string/sentinel, a single study-hours band for
 * the whole wizard) doesn't map 1:1 onto `examGoals`' per-exam-goal
 * structure. On `POST /onboarding/complete`, the service layer additionally
 * derives real `examGoals` entries from this data (see
 * `services/onboarding.service.ts`) so Study Plans/Dashboard have a proper
 * `Exam` reference to read later — this sub-document remains the source of
 * truth for "what did the user answer in the wizard," `examGoals` is the
 * derived, exam-referencing projection of it.
 */
export interface IOnboardingState {
  completed: boolean
  completedAt?: Date
  examCategories: ExamCategoryCode[]
  targetMonth?: string
  studyHoursBand?: StudyHoursBand
  weakSubjects: string[]
  learningStyle?: LearningStyle
}

const onboardingStateSchema = new Schema<IOnboardingState>(
  {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    examCategories: { type: [String], enum: EXAM_CATEGORY_CODES, default: [] },
    targetMonth: { type: String, trim: true },
    studyHoursBand: { type: String, enum: STUDY_HOURS_BANDS },
    weakSubjects: { type: [String], default: [] },
    learningStyle: { type: String, enum: LEARNING_STYLES },
  },
  { _id: false },
)

export interface IProfile {
  userId: Types.ObjectId
  name: string
  photoUrl?: string
  /** Cloudinary public ID for `photoUrl` — only set when the avatar was
   * uploaded through `POST /users/me/avatar` (services/user.service.ts).
   * Undefined for the initial Google-provided photo synced at signup
   * (services/auth/userSync.service.ts), since that's an external CDN URL
   * this app never uploaded and therefore cannot delete from Cloudinary. */
  photoPublicId?: string
  examGoals: IExamGoal[]
  /** No `ref` enforced yet — `Institution` isn't a real collection until the
   * Institutional tier is built (docs/Database.md §9.5's deferred design). */
  institutionId?: Types.ObjectId
  streak: { current: number; longest: number; lastActiveDate?: Date }
  /** Sprint 4 Step 61 (Gamification System) — `xp` only ever increases (a
   * permanent effort ledger, `docs/Smart_Practice.md` §13); `coins` is a
   * spendable balance that can rise and fall (§14). Both are the current
   * running total only — `XpTransaction` is the append-only audit log of
   * every award that produced this total, never the other way around. */
  xp: number
  coins: number
  syllabusProgress: ISyllabusProgress[]
  notificationPreferences: {
    examReminder: boolean
    studyReminder: boolean
    premiumUpdate: boolean
    currentAffairsAlert: boolean
  }
  district?: string
  onboarding: IOnboardingState
  /** UI theme preference (Step 44 §C) — distinct from `User.languagePreference`,
   * which is identity/claims data read on every authenticated request. */
  theme: 'light' | 'dark' | 'system'
  /** Set once by the ₹29 one-time Previous Year Question Papers unlock
   * purchase (`payment.service.ts#activatePaperUnlockForPayment`) — never
   * reverts. Lives here rather than on `User` for the same reason `streak`/
   * `xp` do: it's not read on every authenticated request the way
   * `User.subscriptionTier` is, only when a paper is downloaded
   * (`services/questionPaper.service.ts`). */
  previousYearPapersUnlocked: boolean
}

export type ProfileDocument = HydratedDocument<IProfile>

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    photoUrl: { type: String, trim: true },
    photoPublicId: { type: String, trim: true },
    examGoals: {
      type: [examGoalSchema],
      default: [],
      validate: {
        validator: (goals: IExamGoal[]) => goals.filter((g) => g.isPrimary).length <= 1,
        message: 'Only one exam goal may be marked primary.',
      },
    },
    institutionId: { type: Schema.Types.ObjectId },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActiveDate: { type: Date },
    },
    xp: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
    syllabusProgress: { type: [syllabusProgressSchema], default: [] },
    notificationPreferences: {
      examReminder: { type: Boolean, default: true },
      studyReminder: { type: Boolean, default: true },
      premiumUpdate: { type: Boolean, default: true },
      currentAffairsAlert: { type: Boolean, default: true },
    },
    district: { type: String, trim: true },
    onboarding: { type: onboardingStateSchema, default: () => ({}) },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    previousYearPapersUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const Profile = model<IProfile>('Profile', profileSchema)
