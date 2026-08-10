import { PRACTICE_MODE_LABELS } from '../constants/practice'
import * as analyticsRepository from '../repositories/analytics.repository'
import type {
  SubjectAttemptRow,
  SubmittedSessionRow,
  TopicAttemptRow,
} from '../repositories/analytics.repository'
import * as examRepository from '../repositories/exam.repository'
import * as learningProgressRepository from '../repositories/learningProgress.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as subtopicRepository from '../repositories/subtopic.repository'
import * as topicRepository from '../repositories/topic.repository'
import { pickText, type DisplayLanguage } from './learn.service'

/**
 * Individual Student Analytics (Sprint 3 Step 47) — every number here is
 * computed live, via MongoDB aggregation, from real `QuestionAttempt`/
 * `PracticeSession`/`LearningProgress` documents (this step's explicit
 * source list). No `StudentAnalytics` materialized-view job exists yet
 * (that collection, modeled since Step 42, stays dormant) — see
 * `repositories/analytics.repository.ts`'s header for why a live aggregate
 * is an acceptable stand-in at this data volume, and the natural spot to
 * revisit once a background-job scheduler exists.
 *
 * ---- Classification thresholds (transparent, rule-based — not AI) ----
 * A subject/topic needs at least `MIN_ATTEMPTS_FOR_CLASSIFICATION` answered
 * questions before it gets a label at all; below that it's honestly
 * `not_enough_data` rather than a misleadingly precise verdict on a tiny
 * sample (docs/Analytics.md's recurring "never show a number from too small
 * a sample without a disclaimer" rule). Above that threshold:
 *   accuracy >= 80%            → strong
 *   accuracy >= 65%            → good
 *   accuracy >= 50%            → needs_improvement
 *   accuracy <  50%            → weak
 */

// Exported (not just module-local) so `adaptivePractice.service.ts` (Sprint 4
// Step 60) reuses the exact same classification/trend/priority rules instead
// of re-implementing them — one source of truth for "what counts as weak".
export const MIN_ATTEMPTS_FOR_CLASSIFICATION = 5
const MIN_ATTEMPTS_FOR_TREND = 6
const RECENT_SESSION_WINDOW = 3
const SMALL_COHORT_THRESHOLD = 20
const WEAK_AREAS_RECENT_DAYS_HIGH_BOOST = 7
const WEAK_AREAS_RECENT_DAYS_LOW_BOOST = 30
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export type PerformanceClassification =
  'strong' | 'good' | 'needs_improvement' | 'weak' | 'not_enough_data'

export type TrendDirection = 'improving' | 'declining' | 'steady' | 'not_enough_data'

// ---- small numeric helpers ----

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function accuracyOf(correct: number, attempted: number): number {
  return attempted > 0 ? round1((correct / attempted) * 100) : 0
}

export function classify(
  attempted: number,
  accuracyPercent: number,
): PerformanceClassification {
  if (attempted < MIN_ATTEMPTS_FOR_CLASSIFICATION) return 'not_enough_data'
  if (accuracyPercent >= 80) return 'strong'
  if (accuracyPercent >= 65) return 'good'
  if (accuracyPercent >= 50) return 'needs_improvement'
  return 'weak'
}

export function computeTrend(correctSequence: boolean[]): TrendDirection {
  if (correctSequence.length < MIN_ATTEMPTS_FOR_TREND) return 'not_enough_data'
  const mid = Math.floor(correctSequence.length / 2)
  const earlier = correctSequence.slice(0, mid)
  const recent = correctSequence.slice(mid)
  const earlierAccuracy = accuracyOf(earlier.filter(Boolean).length, earlier.length)
  const recentAccuracy = accuracyOf(recent.filter(Boolean).length, recent.length)
  const delta = recentAccuracy - earlierAccuracy
  if (delta >= 5) return 'improving'
  if (delta <= -5) return 'declining'
  return 'steady'
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Walks a sorted list of distinct `YYYY-MM-DD` (UTC) activity dates into a
 * current + longest streak. "Current" only counts if the most recent active
 * day is today or yesterday — a streak silently broken by inactivity reads
 * as 0, never a stale number. */
function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 }
  const dayNums = dates.map((d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY_MS))

  let longest = 1
  let run = 1
  for (let i = 1; i < dayNums.length; i++) {
    const day = dayNums[i]!
    const prevDay = dayNums[i - 1]!
    run = day === prevDay + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const todayNum = Math.floor(Date.now() / DAY_MS)
  const lastDay = dayNums[dayNums.length - 1]!
  let current = 0
  if (lastDay === todayNum || lastDay === todayNum - 1) {
    current = 1
    for (let i = dayNums.length - 1; i > 0; i--) {
      const day = dayNums[i]!
      const prevDay = dayNums[i - 1]!
      if (day - prevDay === 1) current += 1
      else break
    }
  }
  return { current, longest }
}

function computeRecentPerformance(sessions: SubmittedSessionRow[]): {
  trend: TrendDirection
  recentAverageAccuracy: number | null
  previousAverageAccuracy: number | null
} {
  // `sessions` is sorted newest-first (repository) — the window closest to
  // index 0 is "recent", the next window back is "previous".
  if (sessions.length < RECENT_SESSION_WINDOW * 2) {
    return {
      trend: 'not_enough_data',
      recentAverageAccuracy: null,
      previousAverageAccuracy: null,
    }
  }
  const recent = sessions.slice(0, RECENT_SESSION_WINDOW)
  const previous = sessions.slice(RECENT_SESSION_WINDOW, RECENT_SESSION_WINDOW * 2)
  const avg = (rows: SubmittedSessionRow[]) =>
    round1(rows.reduce((sum, row) => sum + row.result.accuracyPercent, 0) / rows.length)
  const recentAverageAccuracy = avg(recent)
  const previousAverageAccuracy = avg(previous)
  const delta = recentAverageAccuracy - previousAverageAccuracy
  const trend: TrendDirection =
    delta >= 5 ? 'improving' : delta <= -5 ? 'declining' : 'steady'
  return { trend, recentAverageAccuracy, previousAverageAccuracy }
}

function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

// ---- cross-user cohort helpers (real, from every user's QuestionAttempts) ----

interface RankInfo {
  percentile: number
  rankEstimate: number
  cohortSize: number
  isSmallCohort: boolean
}

async function getRankInfo(userId: string): Promise<RankInfo> {
  const rows = await analyticsRepository.getCohortAccuracy()
  const cohortSize = rows.length
  if (cohortSize === 0) {
    return { percentile: 0, rankEstimate: 0, cohortSize: 0, isSmallCohort: true }
  }
  const sorted = [...rows].sort((a, b) => a.accuracyPercent - b.accuracyPercent)
  const myIndex = sorted.findIndex((row) => row.userId.toString() === userId)
  const isSmallCohort = cohortSize < SMALL_COHORT_THRESHOLD
  if (myIndex === -1) {
    return { percentile: 0, rankEstimate: cohortSize, cohortSize, isSmallCohort }
  }
  const percentile =
    cohortSize <= 1 ? 100 : Math.round((myIndex / (cohortSize - 1)) * 100)
  const rankEstimate = cohortSize - myIndex
  return { percentile, rankEstimate, cohortSize, isSmallCohort }
}

/** A smooth, generated standard-normal-shaped reference curve — not
 * per-user content, matching docs/Analytics.md §11's own description of
 * this exact backdrop, mirrored server-side so it doesn't have to be
 * regenerated on every frontend redeploy. */
function buildBellCurve(): { percentile: number; density: number }[] {
  const mean = 50
  const stdDev = 16
  const points: { percentile: number; density: number }[] = []
  for (let x = 0; x <= 100; x += 5) {
    const exponent = -((x - mean) ** 2) / (2 * stdDev ** 2)
    points.push({ percentile: x, density: Math.round(Math.exp(exponent) * 1000) / 1000 })
  }
  return points
}

// ---- name resolution (batched, avoids N+1 repeated lookups) ----

async function resolveSubjectNames(
  subjectIds: string[],
  lang: DisplayLanguage,
): Promise<Map<string, { name: string; slug: string }>> {
  const docs = await Promise.all(subjectIds.map((id) => subjectRepository.findById(id)))
  const map = new Map<string, { name: string; slug: string }>()
  docs.forEach((doc, index) => {
    const id = subjectIds[index]
    if (doc && id) map.set(id, { name: pickText(doc.name, lang), slug: doc.slug })
  })
  return map
}

async function resolveTopicNames(
  topicIds: string[],
  lang: DisplayLanguage,
): Promise<Map<string, { name: string; slug: string }>> {
  const docs = await Promise.all(topicIds.map((id) => topicRepository.findById(id)))
  const map = new Map<string, { name: string; slug: string }>()
  docs.forEach((doc, index) => {
    const id = topicIds[index]
    if (doc && id) map.set(id, { name: pickText(doc.name, lang), slug: doc.slug })
  })
  return map
}

// ---- DTOs ----

export interface OverviewDTO {
  hasActivity: boolean
  totalQuestionsAttempted: number
  correctCount: number
  incorrectCount: number
  accuracyPercent: number
  totalSessions: number
  averageScorePercent: number
  averageResponseTimeSeconds: number
  totalPracticeTimeMinutes: number
  currentStreakDays: number
  longestStreakDays: number
  recentPerformance: {
    trend: TrendDirection
    recentAverageAccuracy: number | null
    previousAverageAccuracy: number | null
  }
  percentile: number
  rankEstimate: number
  cohortSize: number
  isSmallCohort: boolean
  lastUpdatedAt: string
}

export async function getOverview(userId: string): Promise<OverviewDTO> {
  const [totals, sessions, activeDates, rank] = await Promise.all([
    analyticsRepository.getUserAttemptTotals(userId),
    analyticsRepository.getSubmittedSessions(userId),
    analyticsRepository.getDistinctActiveDates(userId),
    getRankInfo(userId),
  ])

  const { current, longest } = computeStreaks(activeDates)
  const totalPracticeTimeMinutes = Math.round(
    sessions.reduce((sum, session) => sum + session.result.timeTakenSeconds, 0) / 60,
  )
  const averageScorePercent =
    sessions.length > 0
      ? round1(
          sessions.reduce((sum, session) => sum + session.result.accuracyPercent, 0) /
            sessions.length,
        )
      : 0

  return {
    hasActivity: totals.attempted > 0,
    totalQuestionsAttempted: totals.attempted,
    correctCount: totals.correct,
    incorrectCount: totals.attempted - totals.correct,
    accuracyPercent: accuracyOf(totals.correct, totals.attempted),
    totalSessions: sessions.length,
    averageScorePercent,
    averageResponseTimeSeconds:
      totals.attempted > 0
        ? round1(totals.totalResponseTimeSeconds / totals.attempted)
        : 0,
    totalPracticeTimeMinutes,
    currentStreakDays: current,
    longestStreakDays: longest,
    recentPerformance: computeRecentPerformance(sessions),
    percentile: rank.percentile,
    rankEstimate: rank.rankEstimate,
    cohortSize: rank.cohortSize,
    isSmallCohort: rank.isSmallCohort,
    lastUpdatedAt: new Date().toISOString(),
  }
}

export interface SubjectAnalyticsDTO {
  subjectId: string
  subjectName: string
  attempted: number
  correct: number
  incorrect: number
  accuracyPercent: number
  averageScorePercent: number
  averageResponseTimeSeconds: number
  sessionsCompleted: number
  lastPracticedAt: string | null
  classification: PerformanceClassification
  trend: TrendDirection
}

function sessionsBySubject(
  sessions: SubmittedSessionRow[],
): Map<string, SubmittedSessionRow[]> {
  const map = new Map<string, SubmittedSessionRow[]>()
  for (const session of sessions) {
    if (!session.subjectId) continue
    const key = session.subjectId.toString()
    const list = map.get(key) ?? []
    list.push(session)
    map.set(key, list)
  }
  return map
}

function sessionsByTopic(
  sessions: SubmittedSessionRow[],
): Map<string, SubmittedSessionRow[]> {
  const map = new Map<string, SubmittedSessionRow[]>()
  for (const session of sessions) {
    if (!session.topicId) continue
    const key = session.topicId.toString()
    const list = map.get(key) ?? []
    list.push(session)
    map.set(key, list)
  }
  return map
}

function averageAccuracy(sessions: SubmittedSessionRow[]): number {
  if (sessions.length === 0) return 0
  return round1(
    sessions.reduce((sum, session) => sum + session.result.accuracyPercent, 0) /
      sessions.length,
  )
}

export async function getSubjectAnalytics(
  userId: string,
  lang: DisplayLanguage,
): Promise<SubjectAnalyticsDTO[]> {
  const [attemptRows, sessions] = await Promise.all([
    analyticsRepository.getAttemptsBySubject(userId),
    analyticsRepository.getSubmittedSessions(userId),
  ])
  if (attemptRows.length === 0) return []

  const sessionMap = sessionsBySubject(sessions)
  const nameMap = await resolveSubjectNames(
    attemptRows.map((row) => row.subjectId.toString()),
    lang,
  )

  return attemptRows
    .map((row): SubjectAnalyticsDTO | null => {
      const key = row.subjectId.toString()
      const names = nameMap.get(key)
      if (!names) return null
      const subjectSessions = sessionMap.get(key) ?? []
      const accuracyPercent = accuracyOf(row.correct, row.attempted)
      return {
        subjectId: names.slug,
        subjectName: names.name,
        attempted: row.attempted,
        correct: row.correct,
        incorrect: row.attempted - row.correct,
        accuracyPercent,
        averageScorePercent: averageAccuracy(subjectSessions),
        averageResponseTimeSeconds: round1(row.totalResponseTimeSeconds / row.attempted),
        sessionsCompleted: subjectSessions.length,
        lastPracticedAt: row.lastPracticedAt.toISOString(),
        classification: classify(row.attempted, accuracyPercent),
        trend: computeTrend(row.correctSequence),
      }
    })
    .filter((row): row is SubjectAnalyticsDTO => row !== null)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
}

export interface TopicAnalyticsDTO {
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  attempted: number
  correct: number
  incorrect: number
  accuracyPercent: number
  averageResponseTimeSeconds: number
  sessionsCompleted: number
  lastPracticedAt: string | null
  classification: PerformanceClassification
  trend: TrendDirection
}

async function getTopicAnalyticsInternal(
  userId: string,
  subjectSlug: string | undefined,
  lang: DisplayLanguage,
): Promise<TopicAnalyticsDTO[]> {
  let subjectFilterId: string | undefined
  if (subjectSlug) {
    const subject = await subjectRepository.findBySlug(subjectSlug)
    if (!subject) return []
    subjectFilterId = subject._id.toString()
  }

  const [attemptRows, sessions] = await Promise.all([
    analyticsRepository.getAttemptsByTopic(userId, subjectFilterId),
    analyticsRepository.getSubmittedSessions(userId),
  ])
  if (attemptRows.length === 0) return []

  const sessionMap = sessionsByTopic(sessions)
  const [topicNameMap, subjectNameMap] = await Promise.all([
    resolveTopicNames(
      attemptRows.map((row) => row.topicId.toString()),
      lang,
    ),
    resolveSubjectNames(
      [...new Set(attemptRows.map((row) => row.subjectId.toString()))],
      lang,
    ),
  ])

  return attemptRows
    .map((row): TopicAnalyticsDTO | null => {
      const topicKey = row.topicId.toString()
      const subjectKey = row.subjectId.toString()
      const topicNames = topicNameMap.get(topicKey)
      const subjectNames = subjectNameMap.get(subjectKey)
      if (!topicNames || !subjectNames) return null
      const topicSessions = sessionMap.get(topicKey) ?? []
      const accuracyPercent = accuracyOf(row.correct, row.attempted)
      return {
        topicId: topicNames.slug,
        topicName: topicNames.name,
        subjectId: subjectNames.slug,
        subjectName: subjectNames.name,
        attempted: row.attempted,
        correct: row.correct,
        incorrect: row.attempted - row.correct,
        accuracyPercent,
        averageResponseTimeSeconds: round1(row.totalResponseTimeSeconds / row.attempted),
        sessionsCompleted: topicSessions.length,
        lastPracticedAt: row.lastPracticedAt.toISOString(),
        classification: classify(row.attempted, accuracyPercent),
        trend: computeTrend(row.correctSequence),
      }
    })
    .filter((row): row is TopicAnalyticsDTO => row !== null)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
}

export function getTopicAnalytics(
  userId: string,
  subjectSlug: string | undefined,
  lang: DisplayLanguage,
): Promise<TopicAnalyticsDTO[]> {
  return getTopicAnalyticsInternal(userId, subjectSlug, lang)
}

// ---- Weak / Strong areas — recommended improvement targets ----
//
// Priority score (transparent, rule-based, never AI): a topic must already
// be classified `weak`/`needs_improvement` (so a low score from a handful
// of attempts never surfaces here — the "sufficient attempts" requirement).
// Starting from `100 - accuracy`, two documented, capped boosts nudge the
// ranking: +15 if last practiced within the last 7 days, +7 if within the
// last 30 (recent poor performance matters more than a mistake from months
// ago), and +10 if the topic's average response time is at least 20% above
// the student's own overall average (slow *and* inaccurate is the clearest
// signal something needs attention).

export function daysSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY
  return (Date.now() - new Date(iso).getTime()) / DAY_MS
}

function priorityScore(
  topic: TopicAnalyticsDTO,
  overallAvgResponseTimeSeconds: number,
): number {
  let score = 100 - topic.accuracyPercent
  const recency = daysSince(topic.lastPracticedAt)
  if (recency <= WEAK_AREAS_RECENT_DAYS_HIGH_BOOST) score += 15
  else if (recency <= WEAK_AREAS_RECENT_DAYS_LOW_BOOST) score += 7
  if (
    overallAvgResponseTimeSeconds > 0 &&
    topic.averageResponseTimeSeconds > overallAvgResponseTimeSeconds * 1.2
  ) {
    score += 10
  }
  return score
}

export interface TopicAccuracyPointDTO {
  topic: string
  subject: string
  accuracy: number
}

export async function getWeakAreas(
  userId: string,
  limit: number,
  lang: DisplayLanguage,
): Promise<TopicAccuracyPointDTO[]> {
  const [topics, totals] = await Promise.all([
    getTopicAnalyticsInternal(userId, undefined, lang),
    analyticsRepository.getUserAttemptTotals(userId),
  ])
  const overallAvgResponseTimeSeconds =
    totals.attempted > 0 ? totals.totalResponseTimeSeconds / totals.attempted : 0

  const eligible = topics.filter(
    (topic) =>
      topic.classification === 'weak' || topic.classification === 'needs_improvement',
  )
  const sorted = eligible
    .map((topic) => ({
      topic,
      score: priorityScore(topic, overallAvgResponseTimeSeconds),
    }))
    .sort(
      (a, b) => b.score - a.score || a.topic.accuracyPercent - b.topic.accuracyPercent,
    )

  return sorted.slice(0, limit).map(({ topic }) => ({
    topic: topic.topicName,
    subject: topic.subjectName,
    accuracy: Math.round(topic.accuracyPercent),
  }))
}

export async function getStrongAreas(
  userId: string,
  limit: number,
  lang: DisplayLanguage,
): Promise<TopicAccuracyPointDTO[]> {
  const topics = await getTopicAnalyticsInternal(userId, undefined, lang)
  const eligible = topics
    .filter(
      (topic) => topic.classification === 'strong' || topic.classification === 'good',
    )
    .sort((a, b) => b.accuracyPercent - a.accuracyPercent)

  return eligible.slice(0, limit).map((topic) => ({
    topic: topic.topicName,
    subject: topic.subjectName,
    accuracy: Math.round(topic.accuracyPercent),
  }))
}

// ---- Chart-shaped read models (existing frontend contract, unchanged) ----

export interface SubjectAccuracyPointDTO {
  subject: string
  accuracy: number
}

/** Subjects below the classification minimum are excluded outright rather
 * than shown as a misleadingly precise bar (docs/Analytics.md §2's "not
 * enough data yet" rule) — the existing chart type has no grayed-out
 * treatment, and omitting the bar is the honest choice available without
 * redesigning it. */
export async function getSubjectAccuracy(
  userId: string,
  lang: DisplayLanguage,
): Promise<SubjectAccuracyPointDTO[]> {
  const subjects = await getSubjectAnalytics(userId, lang)
  return subjects
    .filter((subject) => subject.classification !== 'not_enough_data')
    .map((subject) => ({
      subject: subject.subjectName,
      accuracy: Math.round(subject.accuracyPercent),
    }))
}

export interface WeeklyStudyTimePointDTO {
  label: string
  minutes: number
}

export async function getWeeklyStudyTime(
  userId: string,
): Promise<WeeklyStudyTimePointDTO[]> {
  const sessions = await analyticsRepository.getSubmittedSessions(userId)
  const now = new Date()
  const buckets = new Map<string, number>()
  const order: { key: string; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS)
    const key = dateKeyUtc(d)
    buckets.set(key, 0)
    order.push({ key, label: WEEKDAY_LABELS[d.getUTCDay()]! })
  }
  for (const session of sessions) {
    const key = dateKeyUtc(session.submittedAt)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + session.result.timeTakenSeconds / 60)
    }
  }
  return order.map(({ key, label }) => ({
    label,
    minutes: Math.round(buckets.get(key) ?? 0),
  }))
}

export interface MonthlyProgressPointDTO {
  label: string
  percent: number
}

export async function getMonthlyProgress(
  userId: string,
): Promise<MonthlyProgressPointDTO[]> {
  const sessions = await analyticsRepository.getSubmittedSessions(userId)
  const now = new Date()
  const buckets = new Map<string, { sum: number; count: number }>()
  const order: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    buckets.set(key, { sum: 0, count: 0 })
    order.push({ key, label: MONTH_LABELS[d.getUTCMonth()]! })
  }
  for (const session of sessions) {
    const d = session.submittedAt
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.sum += session.result.accuracyPercent
      bucket.count += 1
    }
  }
  return order.map(({ key, label }) => {
    const bucket = buckets.get(key)!
    return {
      label,
      percent: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
    }
  })
}

export interface PracticeHistoryPointDTO {
  label: string
  mode: string
  scorePercent: number
}

export async function getPracticeHistory(
  userId: string,
  limit: number,
): Promise<PracticeHistoryPointDTO[]> {
  const sessions = await analyticsRepository.getSubmittedSessions(userId)
  // `sessions` is newest-first — reverse the most-recent slice back to
  // chronological order so the bar chart reads left-to-right, oldest first.
  return sessions
    .slice(0, limit)
    .reverse()
    .map((session) => ({
      label: formatShortDate(session.submittedAt),
      mode: PRACTICE_MODE_LABELS[session.mode],
      scorePercent: Math.round(session.result.accuracyPercent),
    }))
}

export interface SpeedAnalysisPointDTO {
  subject: string
  yourSeconds: number
  benchmarkSeconds: number
}

/** `benchmarkSeconds` is a real platform-wide average (every user's
 * `QuestionAttempt`s for that subject), not a fabricated "typical" figure —
 * the honest, available substitute for docs/Analytics.md §6's "wider
 * cohort" benchmark at this stage's user volume. */
export async function getSpeedAnalysis(
  userId: string,
  lang: DisplayLanguage,
): Promise<SpeedAnalysisPointDTO[]> {
  const [subjectRows, cohortRows] = await Promise.all([
    analyticsRepository.getAttemptsBySubject(userId),
    analyticsRepository.getCohortAverageResponseTimeBySubject(),
  ])
  const eligible = subjectRows.filter(
    (row) => row.attempted >= MIN_ATTEMPTS_FOR_CLASSIFICATION,
  )
  if (eligible.length === 0) return []

  const cohortMap = new Map(
    cohortRows.map((row) => [row.subjectId.toString(), row.avgResponseTimeSeconds]),
  )
  const nameMap = await resolveSubjectNames(
    eligible.map((row) => row.subjectId.toString()),
    lang,
  )

  return eligible
    .map((row): SpeedAnalysisPointDTO | null => {
      const names = nameMap.get(row.subjectId.toString())
      if (!names) return null
      const yourSeconds = Math.round(row.totalResponseTimeSeconds / row.attempted)
      return {
        subject: names.name,
        yourSeconds,
        benchmarkSeconds: Math.round(
          cohortMap.get(row.subjectId.toString()) ?? yourSeconds,
        ),
      }
    })
    .filter((row): row is SpeedAnalysisPointDTO => row !== null)
}

export interface RankPredictionDataDTO {
  curve: { percentile: number; density: number }[]
  percentile: number
  rankEstimate: number
  cohortSize: number
  isSmallCohort: boolean
}

export async function getRankPrediction(userId: string): Promise<RankPredictionDataDTO> {
  const rank = await getRankInfo(userId)
  return {
    curve: buildBellCurve(),
    percentile: rank.percentile,
    rankEstimate: rank.rankEstimate,
    cohortSize: rank.cohortSize,
    isSmallCohort: rank.isSmallCohort,
  }
}

export interface GoalCompletionDataDTO {
  percentComplete: number
  examLabel: string
  targetDate: string
  daysRemaining: number
}

/** Percent-complete is computed live from `LearningProgress` (completed
 * subtopics ÷ total subtopics for the student's primary exam goal) — the
 * exact same "never a stored duplicate" rule `learn.service.ts`'s
 * `completionPercent` already established, applied at the whole-syllabus
 * level instead of one subject/topic at a time. */
export async function getGoalCompletion(
  userId: string,
  lang: DisplayLanguage,
): Promise<GoalCompletionDataDTO> {
  const profile = await profileRepository.findByUserId(userId)
  const primaryGoal =
    profile?.examGoals.find((goal) => goal.isPrimary) ?? profile?.examGoals[0] ?? null

  if (!primaryGoal) {
    return {
      percentComplete: 0,
      examLabel: 'No exam goal set yet',
      targetDate: new Date().toISOString(),
      daysRemaining: 0,
    }
  }

  const [exam, subjects] = await Promise.all([
    examRepository.findById(primaryGoal.examId),
    subjectRepository.findByExam(primaryGoal.examId),
  ])
  const subtopicLists = await Promise.all(
    subjects.map((subject) => subtopicRepository.findBySubject(subject._id)),
  )
  const allSubtopicIds = subtopicLists.flat().map((subtopic) => subtopic._id)
  const totalSubtopics = allSubtopicIds.length

  const progressDocs =
    totalSubtopics > 0
      ? await learningProgressRepository.findByUserAndSubtopics(userId, allSubtopicIds)
      : []
  const completedCount = progressDocs.filter((doc) => doc.status === 'completed').length
  const percentComplete =
    totalSubtopics > 0 ? Math.round((completedCount / totalSubtopics) * 100) : 0

  const targetDate = primaryGoal.targetDate ?? null
  const daysRemaining = targetDate
    ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / DAY_MS))
    : 0

  return {
    percentComplete,
    examLabel: exam ? pickText(exam.name, lang) : 'Your exam goal',
    targetDate: (targetDate ?? new Date()).toISOString(),
    daysRemaining,
  }
}

export interface DifficultyAnalyticsDTO {
  difficulty: string
  attempted: number
  correct: number
  accuracyPercent: number
}

export async function getDifficultyAnalytics(
  userId: string,
): Promise<DifficultyAnalyticsDTO[]> {
  const rows = await analyticsRepository.getAttemptsByDifficulty(userId)
  return rows
    .filter((row) => row.attempted >= MIN_ATTEMPTS_FOR_CLASSIFICATION)
    .map((row) => ({
      difficulty: row.difficulty,
      attempted: row.attempted,
      correct: row.correct,
      accuracyPercent: accuracyOf(row.correct, row.attempted),
    }))
}

// Re-exported so callers only need one module for both DTOs and row shapes
// when composing higher-level responses.
export type { SubjectAttemptRow, TopicAttemptRow }
