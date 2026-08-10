import type { Types } from 'mongoose'

import {
  LiveExamAttempt,
  type LiveExamAttemptDocument,
} from '../models/LiveExamAttempt.model'

export function findOne(
  userId: Types.ObjectId | string,
  liveExamId: Types.ObjectId | string,
): Promise<LiveExamAttemptDocument | null> {
  return LiveExamAttempt.findOne({ userId, liveExamId })
}

export function findByIdForUser(
  attemptId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
): Promise<LiveExamAttemptDocument | null> {
  return LiveExamAttempt.findOne({ _id: attemptId, userId })
}

export interface CreateAttemptInput {
  userId: Types.ObjectId | string
  liveExamId: Types.ObjectId | string
  startedAt: Date
}

export function create(input: CreateAttemptInput): Promise<LiveExamAttemptDocument> {
  return LiveExamAttempt.create(input)
}

/** Upserts one answer within the attempt's embedded `answers[]` — same
 * atomic single-`findOneAndUpdate` shape as
 * `practiceSession.repository.ts`'s `upsertAnswer`. Scoped to
 * `status: 'in-progress'` so a submitted (or auto-submitted) attempt can
 * never be mutated this way. Unlike Practice, `selectedOptionId` is
 * optional here — a student can "Mark for Review" a question they haven't
 * answered yet, or clear a previous answer (`selectedOptionId: null`)
 * without touching its review flag, matching real exam-taking UX
 * (Next/Previous/Mark for Review/Clear Response). */
export async function upsertAnswer(
  attemptId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  questionId: Types.ObjectId | string,
  patch: { selectedOptionId?: string | null; markedForReview?: boolean },
): Promise<LiveExamAttemptDocument | null> {
  const setFields: Record<string, unknown> = {}
  if (patch.selectedOptionId !== undefined) {
    setFields['answers.$.selectedOptionId'] = patch.selectedOptionId
  }
  if (patch.markedForReview !== undefined) {
    setFields['answers.$.markedForReview'] = patch.markedForReview
  }

  const updatedExisting = await LiveExamAttempt.findOneAndUpdate(
    { _id: attemptId, userId, status: 'in-progress', 'answers.questionId': questionId },
    { $set: setFields },
    { new: true },
  )
  if (updatedExisting) return updatedExisting

  return LiveExamAttempt.findOneAndUpdate(
    { _id: attemptId, userId, status: 'in-progress' },
    {
      $push: {
        answers: {
          questionId,
          selectedOptionId: patch.selectedOptionId ?? null,
          markedForReview: patch.markedForReview ?? false,
        },
      },
    },
    { new: true },
  )
}

export interface SubmitAttemptInput {
  submissionType: 'manual' | 'auto'
  score: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
}

export function submit(
  attemptId: Types.ObjectId | string,
  input: SubmitAttemptInput,
): Promise<LiveExamAttemptDocument | null> {
  return LiveExamAttempt.findOneAndUpdate(
    { _id: attemptId, status: 'in-progress' },
    {
      $set: {
        status: 'submitted',
        submittedAt: new Date(),
        submissionType: input.submissionType,
        score: input.score,
        correctCount: input.correctCount,
        incorrectCount: input.incorrectCount,
        unansweredCount: input.unansweredCount,
      },
    },
    { new: true },
  )
}

export function findByUser(
  userId: Types.ObjectId | string,
): Promise<LiveExamAttemptDocument[]> {
  return LiveExamAttempt.find({ userId }).sort({ startedAt: -1 })
}

/** Batched lookup for a list screen (Upcoming/Live/Completed) — one query
 * for every exam's "have I joined this?" state instead of N+1. */
export function findByUserAndExamIds(
  userId: Types.ObjectId | string,
  liveExamIds: (Types.ObjectId | string)[],
): Promise<LiveExamAttemptDocument[]> {
  return LiveExamAttempt.find({ userId, liveExamId: { $in: liveExamIds } })
}

/** A small participation stat for the admin Live Exam list/detail view
 * (Step 54) — not a full grading/monitoring screen (not in this step's
 * requested scope), just "how many students have attempted this exam." */
export function countByLiveExam(liveExamId: Types.ObjectId | string): Promise<number> {
  return LiveExamAttempt.countDocuments({ liveExamId })
}

/** Who to *exclude* from the Weekly Live Exam reminder (Sprint 4 Step 62) —
 * a user who already joined (any attempt status) doesn't need a nudge. */
export function findAttemptedUserIds(
  liveExamId: Types.ObjectId | string,
): Promise<Types.ObjectId[]> {
  return LiveExamAttempt.find({ liveExamId })
    .select('userId')
    .then((docs) => docs.map((doc) => doc.userId))
}
