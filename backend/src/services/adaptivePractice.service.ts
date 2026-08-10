import { ADAPTIVE_PRACTICE_CONFIG } from '../config/adaptivePractice.config'
import type { QuestionDifficulty } from '../constants/practice'
import type { SubjectDocument } from '../models/Subject.model'
import type { TopicDocument } from '../models/Topic.model'
import * as adaptivePracticeStateRepository from '../repositories/adaptivePracticeState.repository'
import * as analyticsRepository from '../repositories/analytics.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as topicRepository from '../repositories/topic.repository'
import {
  accuracyOf,
  daysSince,
  getDifficultyAnalytics,
  getTopicAnalytics,
  MIN_ATTEMPTS_FOR_CLASSIFICATION,
  type PerformanceClassification,
  type TopicAnalyticsDTO,
} from './analytics.service'
import { pickText, resolveDefaultExamId, type DisplayLanguage } from './learn.service'

/**
 * Sprint 4 Step 60 — Adaptive Practice Engine. Deterministic, rule-based
 * recommendation logic — no AI model is called anywhere in this file. Every
 * number driving a recommendation comes from real `QuestionAttempt` data via
 * `analytics.repository.ts`/`analytics.service.ts` (topic accuracy, attempt
 * count, recent trend, response time, per-difficulty performance, last
 * practiced date); nothing here is fabricated or randomly generated.
 *
 * A topic with zero or few attempts is never scored as "weak" — it gets its
 * own neutral, exploration-framed bucket (`newTopicBaseScore`/
 * `partialDataBaseScore`) below a genuinely struggling topic's score but
 * above a comfortably strong one, per this step's explicit "never punish
 * new users for insufficient data" instruction.
 */

export type CandidateClassification = PerformanceClassification | 'new'

export interface RecommendationCandidateDTO {
  subjectId: string
  subjectName: string
  topicId: string
  topicName: string
  attempted: number
  accuracyPercent: number | null
  lastPracticedAt: string | null
  classification: CandidateClassification
  suggestedDifficulty: QuestionDifficulty
  suggestedQuestionCount: number
  reason: string
  priorityScore: number
}

export interface AdaptivePracticeRecommendationsDTO {
  /** True once at least one topic has enough attempts to be classified —
   * callers can use this to decide whether to frame recommendations around
   * "your weak areas" or fall back to purely diagnostic/exploratory copy. */
  hasEnoughData: boolean
  /** The single best "what to practice next" pick, after anti-repetition
   * rotation — never null when the student's exam has any topics at all. */
  practiceNext: RecommendationCandidateDTO | null
  /** The single most urgent weak/needs-improvement topic, always the honest
   * top-ranked one (never rotated) — the "which weak topic to revisit"
   * answer. Null when no topic yet has enough data to call it weak. */
  weakTopicToRevisit: RecommendationCandidateDTO | null
  /** Top-ranked candidates (includes `practiceNext` and `weakTopicToRevisit`
   * when they qualify) — feeds Dashboard's Recommended Topics grid. */
  alternatives: RecommendationCandidateDTO[]
  generatedAt: string
}

interface Candidate extends RecommendationCandidateDTO {
  /** Real Mongo ObjectId string — kept off the public DTO (which uses slugs,
   * matching every other student-facing id in this codebase), used only to
   * key the per-topic difficulty map and the anti-repetition state. */
  topicObjectId: string
  score: number
}

type DifficultyRow = { attempted: number; correct: number }

function suggestDifficulty(
  topicObjectId: string,
  difficultyByTopic: Map<string, Map<string, DifficultyRow>>,
  globalDifficultyMap: Map<string, number>,
  topicAccuracyPercent: number | null,
  attempted: number,
): QuestionDifficulty {
  if (attempted === 0) return 'easy'
  const cfg = ADAPTIVE_PRACTICE_CONFIG

  const topicDifficulty = difficultyByTopic.get(topicObjectId)
  const hardRow = topicDifficulty?.get('hard')
  if (hardRow && hardRow.attempted >= cfg.minAttemptsForDifficultyConfidence) {
    if (accuracyOf(hardRow.correct, hardRow.attempted) >= 70) return 'hard'
  }
  const mediumRow = topicDifficulty?.get('medium')
  if (mediumRow && mediumRow.attempted >= cfg.minAttemptsForDifficultyConfidence) {
    return accuracyOf(mediumRow.correct, mediumRow.attempted) >= 65 ? 'medium' : 'easy'
  }

  const globalHard = globalDifficultyMap.get('hard')
  const globalMedium = globalDifficultyMap.get('medium')
  if (globalHard !== undefined && globalHard >= 70) return 'hard'
  if (globalMedium !== undefined && globalMedium >= 65) return 'medium'

  if (topicAccuracyPercent !== null) {
    if (topicAccuracyPercent >= 75) return 'hard'
    if (topicAccuracyPercent >= 50) return 'medium'
  }
  return 'easy'
}

function suggestQuestionCount(
  attempted: number,
  classification: CandidateClassification,
): number {
  const c = ADAPTIVE_PRACTICE_CONFIG.questionCount
  if (attempted === 0) return c.diagnostic
  if (attempted < MIN_ATTEMPTS_FOR_CLASSIFICATION) return c.partialData
  if (classification === 'weak' || classification === 'needs_improvement') {
    return c.focusedRemediation
  }
  return c.maintenance
}

function buildCandidate(
  subject: SubjectDocument,
  topic: TopicDocument,
  analytics: TopicAnalyticsDTO | undefined,
  difficultyByTopic: Map<string, Map<string, DifficultyRow>>,
  globalDifficultyMap: Map<string, number>,
  overallAvgResponseTimeSeconds: number,
  lang: DisplayLanguage,
): Candidate {
  const cfg = ADAPTIVE_PRACTICE_CONFIG
  const subjectName = pickText(subject.name, lang)
  const topicName = pickText(topic.name, lang)
  const topicObjectId = topic._id.toString()

  const attempted = analytics?.attempted ?? 0
  const accuracyPercent = attempted > 0 ? (analytics?.accuracyPercent ?? 0) : null
  const lastPracticedAt = analytics?.lastPracticedAt ?? null
  const averageResponseTimeSeconds = analytics?.averageResponseTimeSeconds ?? 0

  let classification: CandidateClassification
  let score: number
  let reason: string

  if (attempted === 0) {
    classification = 'new'
    score = cfg.newTopicBaseScore
    reason = `You haven't tried ${topicName} yet — start here to build your baseline.`
  } else if (attempted < MIN_ATTEMPTS_FOR_CLASSIFICATION) {
    classification = 'not_enough_data'
    score = cfg.partialDataBaseScore
    reason = `You've only attempted ${topicName} ${attempted} time${attempted === 1 ? '' : 's'} so far — a few more questions will help us gauge your level accurately.`
  } else {
    const stats = analytics!
    classification = stats.classification
    score = 100 - stats.accuracyPercent

    const reasonParts: string[] = [
      classification === 'good' || classification === 'strong'
        ? `Your ${subjectName} accuracy is ${Math.round(stats.accuracyPercent)}% across ${attempted} attempts — keep it sharp with occasional practice.`
        : `Recommended because your ${subjectName} accuracy is ${Math.round(stats.accuracyPercent)}% across ${attempted} attempts.`,
    ]

    const recencyDays = daysSince(lastPracticedAt)
    if (recencyDays <= cfg.recentMistakeHighBoostDays) {
      score += cfg.recentMistakeHighBoost
    } else if (recencyDays <= cfg.recentMistakeLowBoostDays) {
      score += cfg.recentMistakeLowBoost
    } else if (recencyDays > cfg.lapsedDays) {
      score += cfg.lapsedRefresherBoost
      reasonParts.push(
        `It's been ${Math.round(recencyDays)} days since you last practiced this — a refresher will help retention.`,
      )
    }

    if (
      overallAvgResponseTimeSeconds > 0 &&
      averageResponseTimeSeconds > overallAvgResponseTimeSeconds * cfg.slowResponseMultiplier
    ) {
      score += cfg.slowResponseBoost
      reasonParts.push(
        `You're also answering these questions slower than your overall average.`,
      )
    }

    if (stats.trend === 'declining') {
      score += cfg.decliningTrendBoost
      reasonParts.push(`Your recent attempts here have been trending down.`)
    }

    reason = reasonParts.join(' ')
  }

  const suggestedDifficulty = suggestDifficulty(
    topicObjectId,
    difficultyByTopic,
    globalDifficultyMap,
    accuracyPercent,
    attempted,
  )
  const suggestedQuestionCount = suggestQuestionCount(attempted, classification)

  return {
    subjectId: subject.slug,
    subjectName,
    topicId: topic.slug,
    topicName,
    topicObjectId,
    attempted,
    accuracyPercent,
    lastPracticedAt,
    classification,
    suggestedDifficulty,
    suggestedQuestionCount,
    reason,
    priorityScore: Math.round(score * 10) / 10,
    score,
  }
}

function toPublic(candidate: Candidate): RecommendationCandidateDTO {
  const {
    subjectId,
    subjectName,
    topicId,
    topicName,
    attempted,
    accuracyPercent,
    lastPracticedAt,
    classification,
    suggestedDifficulty,
    suggestedQuestionCount,
    reason,
    priorityScore,
  } = candidate
  return {
    subjectId,
    subjectName,
    topicId,
    topicName,
    attempted,
    accuracyPercent,
    lastPracticedAt,
    classification,
    suggestedDifficulty,
    suggestedQuestionCount,
    reason,
    priorityScore,
  }
}

export async function getRecommendations(
  userId: string,
  lang: DisplayLanguage,
): Promise<AdaptivePracticeRecommendationsDTO> {
  const [totals, topicAnalytics, difficultyRows, globalDifficulty, examId] =
    await Promise.all([
      analyticsRepository.getUserAttemptTotals(userId),
      getTopicAnalytics(userId, undefined, lang),
      analyticsRepository.getAttemptsByTopicAndDifficulty(userId),
      getDifficultyAnalytics(userId),
      resolveDefaultExamId(userId),
    ])

  const subjects = examId
    ? await subjectRepository.findByExam(examId)
    : await subjectRepository.findAll()
  const topicLists = await Promise.all(
    subjects.map((subject) => topicRepository.findBySubject(subject._id)),
  )

  const analyticsBySlug = new Map(topicAnalytics.map((row) => [row.topicId, row]))
  const difficultyByTopic = new Map<string, Map<string, DifficultyRow>>()
  for (const row of difficultyRows) {
    const key = row.topicId.toString()
    const inner = difficultyByTopic.get(key) ?? new Map<string, DifficultyRow>()
    inner.set(row.difficulty, { attempted: row.attempted, correct: row.correct })
    difficultyByTopic.set(key, inner)
  }
  const globalDifficultyMap = new Map(
    globalDifficulty.map((row) => [row.difficulty, row.accuracyPercent]),
  )
  const overallAvgResponseTimeSeconds =
    totals.attempted > 0 ? totals.totalResponseTimeSeconds / totals.attempted : 0

  const candidates: Candidate[] = []
  subjects.forEach((subject, index) => {
    const topics = topicLists[index] ?? []
    for (const topic of topics) {
      candidates.push(
        buildCandidate(
          subject,
          topic,
          analyticsBySlug.get(topic.slug),
          difficultyByTopic,
          globalDifficultyMap,
          overallAvgResponseTimeSeconds,
          lang,
        ),
      )
    }
  })

  if (candidates.length === 0) {
    return {
      hasEnoughData: false,
      practiceNext: null,
      weakTopicToRevisit: null,
      alternatives: [],
      generatedAt: new Date().toISOString(),
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.attempted - b.attempted ||
      a.topicName.localeCompare(b.topicName),
  )

  const hasEnoughData = candidates.some(
    (c) => c.classification !== 'new' && c.classification !== 'not_enough_data',
  )
  const weakCandidate =
    candidates.find(
      (c) => c.classification === 'weak' || c.classification === 'needs_improvement',
    ) ?? null

  // ---- anti-repetition: the primary "practice next" pick skips over
  // whatever was already shown as primary within the last `antiRepeatWindow`
  // calls made in the last `antiRepeatDays` — unless every candidate has
  // recently been shown, in which case the honest top pick wins anyway
  // (never hide a real weak area just to look varied). ----
  const cfg = ADAPTIVE_PRACTICE_CONFIG
  const state = await adaptivePracticeStateRepository.findByUser(userId)
  const recentlyShown = new Set(
    (state?.recentPrimaryPicks ?? [])
      .slice(0, cfg.antiRepeatWindow)
      .filter((pick) => daysSince(pick.recommendedAt.toISOString()) <= cfg.antiRepeatDays)
      .map((pick) => pick.topicId.toString()),
  )
  const practiceNextCandidate =
    candidates.find((c) => !recentlyShown.has(c.topicObjectId)) ?? candidates[0]!

  await adaptivePracticeStateRepository.recordPrimaryPick(
    userId,
    practiceNextCandidate.topicObjectId,
    Math.max(cfg.antiRepeatWindow, 5),
  )

  return {
    hasEnoughData,
    practiceNext: toPublic(practiceNextCandidate),
    weakTopicToRevisit: weakCandidate ? toPublic(weakCandidate) : null,
    alternatives: candidates.slice(0, cfg.maxRecommendations).map(toPublic),
    generatedAt: new Date().toISOString(),
  }
}
