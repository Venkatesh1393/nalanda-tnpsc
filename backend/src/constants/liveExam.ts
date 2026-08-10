/**
 * Live Exam enums (Step 48). `status` is the content-management state
 * (draft/cancelled are explicit human overrides); a separate, always-
 * computed "effective status" (`services/liveExam.service.ts`'s
 * `computeEffectiveStatus`) derives Upcoming/Live/Completed purely from
 * server time vs. `scheduledStartAt`/`scheduledEndAt` — the stored `status`
 * is never trusted alone for join/eligibility timing, per this step's
 * "server time is authoritative" rule.
 */
export const LIVE_EXAM_STATUSES = [
  'draft',
  'scheduled',
  'live',
  'completed',
  'cancelled',
] as const
export type LiveExamStatus = (typeof LIVE_EXAM_STATUSES)[number]

/** The three time-derived, student-facing buckets (`docs/InformationArchitecture.md`
 * §7.10) — distinct from `LiveExamStatus` above (which also has `draft`/`cancelled`,
 * neither of which a student ever browses by). */
export const LIVE_EXAM_TABS = ['upcoming', 'live', 'completed'] as const
export type LiveExamTab = (typeof LIVE_EXAM_TABS)[number]

export const LIVE_EXAM_ATTEMPT_STATUSES = ['in-progress', 'submitted'] as const
export type LiveExamAttemptStatus = (typeof LIVE_EXAM_ATTEMPT_STATUSES)[number]

export const LIVE_EXAM_SUBMISSION_TYPES = ['manual', 'auto'] as const
export type LiveExamSubmissionType = (typeof LIVE_EXAM_SUBMISSION_TYPES)[number]

/** `immediate` — results become visible to every attempt the moment
 * `scheduledEndAt` passes (no one still mid-exam could have seen them).
 * `scheduled` — visible only once `now >= publishAt`, for a deliberate
 * cohort-wide "results day" moment. */
export const RESULT_PUBLICATION_MODES = ['immediate', 'scheduled'] as const
export type ResultPublicationMode = (typeof RESULT_PUBLICATION_MODES)[number]
