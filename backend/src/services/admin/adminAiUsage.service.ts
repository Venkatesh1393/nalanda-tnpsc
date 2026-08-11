import * as aiHistoryRepository from '../../repositories/aiHistory.repository'
import * as profileRepository from '../../repositories/profile.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as userRepository from '../../repositories/user.repository'
import { pickText } from '../learn.service'

/**
 * Sprint 4 Step 58 — Admin AI Usage dashboard. Read-only, same shape as
 * `adminPayments.service.ts`/`adminDashboard.service.ts`: aggregate counts
 * from `repositories/aiHistory.repository.ts`, batch-joined with display
 * names. Deliberately reads only `AIHistory` (counts/tokens/cost) — never
 * `AIExplanation` (the actual generated explanation text) or any prompt —
 * so this endpoint can never leak generated content or provider secrets,
 * only usage metadata, per this step's "never expose private
 * prompts/secrets" requirement.
 */

export interface AiUsageSummaryDTO {
  total: number
  successful: number
  failed: number
  cached: number
  generated: number
  estimatedCostUsd: number
  /** Sprint 4 Step 74 — average provider call latency (ms) across rows that
   * attempted one; `null` when none did in this window. */
  avgLatencyMs: number | null
}

export interface AiUsageByUserDTO extends AiUsageSummaryDTO {
  userId: string
  email: string
  name: string
}

export interface AiUsageByQuestionDTO extends AiUsageSummaryDTO {
  questionId: string
  questionText: string
}

export interface AiUsageDashboardDTO {
  /** Start of the reporting window (UTC), inclusive. */
  since: string
  today: AiUsageSummaryDTO
  byUser: AiUsageByUserDTO[]
  byQuestion: AiUsageByQuestionDTO[]
}

const DEFAULT_TOP_N = 10

function startOfDayUtc(daysAgo: number): Date {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (daysAgo - 1))
  return start
}

export async function getUsageDashboard(
  days = 1,
  limit = DEFAULT_TOP_N,
): Promise<AiUsageDashboardDTO> {
  const since = startOfDayUtc(days)

  const [today, byUserRows, byQuestionRows] = await Promise.all([
    aiHistoryRepository.getUsageSummary(since, 'question_explanation'),
    aiHistoryRepository.getUsageByUser(since, limit, 'question_explanation'),
    aiHistoryRepository.getUsageByQuestion(since, limit),
  ])

  const userIds = byUserRows.map((row) => row.userId)
  const [users, profiles] = await Promise.all([
    Promise.all(userIds.map((id) => userRepository.findById(id))),
    profileRepository.findByUserIds(userIds),
  ])
  const emailByUserId = new Map(
    users.filter((user) => user !== null).map((user) => [user.id, user.email]),
  )
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  const questionIds = byQuestionRows.map((row) => row.questionId)
  const questions = await questionRepository.findByIds(questionIds)
  const textByQuestionId = new Map(
    questions.map((question) => [
      question.id,
      pickText(question.questionText, 'en').slice(0, 200),
    ]),
  )

  return {
    since: since.toISOString(),
    today,
    byUser: byUserRows.map((row) => {
      const email = emailByUserId.get(row.userId) ?? 'unknown'
      return {
        ...row,
        email,
        name: nameByUserId.get(row.userId) ?? email,
      }
    }),
    byQuestion: byQuestionRows.map((row) => ({
      ...row,
      questionText: textByQuestionId.get(row.questionId) ?? 'Unknown question',
    })),
  }
}
