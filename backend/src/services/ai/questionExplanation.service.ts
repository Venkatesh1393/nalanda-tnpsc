import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

import {
  AI_MODEL,
  AI_PROVIDER,
  getAnthropicClient,
  isAnthropicConfigured,
} from '../../config/anthropic'
import { logger } from '../../config/logger'
import { HttpStatus } from '../../constants/httpStatus'
import * as aiExplanationRepository from '../../repositories/aiExplanation.repository'
import { UNANSWERED_SENTINEL } from '../../repositories/aiExplanation.repository'
import * as aiHistoryRepository from '../../repositories/aiHistory.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as topicRepository from '../../repositories/topic.repository'
import { estimateCostUsd } from '../../utils/aiCost'
import { ApiError } from '../../utils/ApiError'
import { pickText, type DisplayLanguage } from '../learn.service'
import { requireOwnedSession } from '../practice.service'
import {
  buildUserMessage,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  type QuestionExplanationContext,
} from '../../prompts/questionExplanation.v1'

/**
 * Sprint 4 Step 57 — Premium AI Explanation orchestration. This is
 * `backend/src/services/ai`, the "AI Orchestration Service" docs/
 * Architecture.md §5 describes — controllers never call the Anthropic SDK
 * directly.
 *
 * Cost control, in order, per request:
 * 1. In-flight de-duplication (Sprint 4 Step 58) — a second identical
 *    request (double-click, retry-on-timeout) while the first is still
 *    running joins the same in-progress promise instead of spending a
 *    second cache-lookup/quota-slot/provider-call.
 * 2. Cache lookup (`AIExplanation`, keyed by question+selected-answer+
 *    language+prompt version) — a hit costs nothing and doesn't touch quota.
 *    This exact-key match, not embedding/semantic similarity, is the
 *    deliberate "context-safe reuse" strategy: two different wrong answers
 *    to the same question need genuinely different explanations, so
 *    approximate reuse would risk serving a pedagogically wrong explanation
 *    to save a cache miss — a correctness risk this app doesn't take for
 *    exam-prep content. See `AIExplanation.model.ts`'s header comment.
 * 3. Per-user daily quota (`DAILY_GENERATION_QUOTA`) — only real generations
 *    count.
 * 4. A single provider call, timeout-bounded, with the SDK's built-in
 *    retry-with-backoff on 429/5xx (`MAX_RETRIES`), plus one app-level
 *    fallback attempt (Sprint 4 Step 58, `generateExplanationWithFallback`)
 *    for failure classes the SDK's own retry doesn't cover (a refusal or a
 *    response that didn't validate against the output schema — not a
 *    network/rate-limit error, but not necessarily reproducible either,
 *    since model sampling is non-deterministic).
 *
 * Failure handling: every failure path (not configured, quota exceeded,
 * provider error, malformed output) throws a normal `ApiError` that the
 * controller returns as JSON — it never throws an unhandled error that
 * could break the page. Standard Explanation is a completely separate,
 * already-rendered code path in `practice.service.ts#getReview`; nothing
 * here can affect it.
 *
 * Abuse protection is layered, not single-point: `routes/ai.routes.ts`'s
 * per-IP + per-user rate limiters bound request *frequency* before this
 * function is even called; the in-flight dedup above bounds duplicate
 * *concurrent* requests; `DAILY_GENERATION_QUOTA` bounds *total daily spend*
 * per user, and counts every `source: 'generated'` row regardless of
 * success/failure (`aiHistoryRepository.countGeneratedToday`), so retrying a
 * failed generation still spends quota rather than granting free retries.
 */

const DAILY_GENERATION_QUOTA = 50
const REQUEST_TIMEOUT_MS = 20_000
const MAX_RETRIES = 2
/** Same "high volume, lower long-term value" reasoning `docs/Database.md`
 * §9 already applies to `doubt_chatbot` — this is the `AIHistory` audit
 * row's retention, not the `AIExplanation` cache entry itself (which never
 * expires; regenerating it is the expensive part this cache exists to avoid). */
const AI_HISTORY_RETENTION_DAYS = 365

const explanationOutputSchema = z.object({
  whyCorrectIsCorrect: z.string().min(1),
  whyYourAnswerIsWrong: z.string().min(1).nullable(),
  keyConcept: z.string().min(1),
  memoryTrick: z.string().min(1).nullable(),
  examRelevance: z.string().min(1).nullable(),
})

export interface QuestionExplanationResultDTO {
  whyCorrectIsCorrect: string
  whyYourAnswerIsWrong: string | null
  keyConcept: string
  memoryTrick: string | null
  examRelevance: string | null
  source: 'generated' | 'cached'
  promptVersion: string
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return message.slice(0, 500)
}

function historyExpiry(): Date {
  return new Date(Date.now() + AI_HISTORY_RETENTION_DAYS * 86_400_000)
}

interface GeneratedExplanation {
  parsed: z.infer<typeof explanationOutputSchema>
  tokenUsage: { inputTokens: number; outputTokens: number }
}

async function generateExplanationOnce(
  context: QuestionExplanationContext,
): Promise<GeneratedExplanation> {
  const client = getAnthropicClient()
  const response = await client.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(context) }],
      output_config: { format: zodOutputFormat(explanationOutputSchema) },
    },
    { timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES },
  )

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(
      `Model did not return a usable explanation (stop_reason=${response.stop_reason})`,
    )
  }

  return {
    parsed: response.parsed_output,
    tokenUsage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

/**
 * Sprint 4 Step 58 — the app-level fallback layer, distinct from and on top
 * of `MAX_RETRIES` (the SDK's own retry-with-backoff, scoped to one
 * `client.messages.parse()` call and limited to 429/5xx/network errors).
 * This catches failure classes the SDK can't retry for you: a `refusal`
 * stop reason or an output that didn't validate against
 * `explanationOutputSchema` isn't a transport-level error, so the SDK never
 * sees it as retryable — but it also isn't guaranteed to recur, since model
 * sampling is non-deterministic. One extra full attempt recovers most of
 * these without spending a second daily-quota slot (the caller only
 * advances the quota counter once, after this whole function settles).
 */
function isRetryableGenerationError(error: unknown): boolean {
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  ) {
    return true
  }
  // The schema-validation guard in generateExplanationOnce throws a plain
  // Error (not an SDK exception) for a refusal or unparseable output.
  if (error instanceof Error && error.message.startsWith('Model did not return')) {
    return true
  }
  return false
}

async function generateExplanationWithFallback(
  context: QuestionExplanationContext,
): Promise<GeneratedExplanation> {
  try {
    return await generateExplanationOnce(context)
  } catch (error) {
    if (!isRetryableGenerationError(error)) throw error
    logger.warn('AI explanation generation failed — retrying once (fallback attempt)', {
      error: safeErrorMessage(error),
    })
    return await generateExplanationOnce(context)
  }
}

/**
 * Sprint 4 Step 58 — duplicate-request prevention. Keyed by the same tuple
 * that determines the outcome (user + session + question + language), so a
 * double-click, a client-side retry-on-timeout, or two browser tabs firing
 * the same request all collapse into one cache-lookup/quota-check/provider-
 * call instead of paying for each independently. Process-local by design —
 * same single-instance assumption `middleware/rateLimiter.middleware.ts`'s
 * in-memory store already makes for this app.
 */
const inFlightExplanationRequests = new Map<
  string,
  Promise<QuestionExplanationResultDTO>
>()

function inFlightKey(
  userId: string,
  sessionId: string,
  questionId: string,
  language: DisplayLanguage,
): string {
  return `${userId}:${sessionId}:${questionId}:${language}`
}

export function explainQuestion(
  userId: string,
  sessionId: string,
  questionId: string,
  language: DisplayLanguage,
): Promise<QuestionExplanationResultDTO> {
  const key = inFlightKey(userId, sessionId, questionId, language)
  const existing = inFlightExplanationRequests.get(key)
  if (existing) return existing

  const request = explainQuestionUncached(
    userId,
    sessionId,
    questionId,
    language,
  ).finally(() => {
    inFlightExplanationRequests.delete(key)
  })
  inFlightExplanationRequests.set(key, request)
  return request
}

async function explainQuestionUncached(
  userId: string,
  sessionId: string,
  questionId: string,
  language: DisplayLanguage,
): Promise<QuestionExplanationResultDTO> {
  const session = await requireOwnedSession(userId, sessionId)
  if (session.status !== 'submitted') {
    throw ApiError.badRequest(
      'Finish this practice session before requesting an AI explanation.',
    )
  }
  const belongsToSession = session.questionIds.some((id) => id.toString() === questionId)
  if (!belongsToSession) {
    throw ApiError.badRequest('This question is not part of the requested session.')
  }

  const question = await questionRepository.findById(questionId)
  if (!question) throw ApiError.notFound('Question not found')
  if (!question.aiExplanationEligible) {
    throw ApiError.badRequest('AI Explanation is not available for this question.')
  }

  const correctOption = question.options.find((option) => option.isCorrect)
  if (!correctOption)
    throw ApiError.internal('This question has no correct option configured.')

  // Never trust a client-supplied answer — read what the student actually
  // submitted for this session, the same ownership-checked source
  // `getReview` uses.
  const answer = session.answers.find((a) => a.questionId.toString() === questionId)
  const selectedOptionId = answer?.selectedOptionId ?? null
  const cacheKey = selectedOptionId ?? UNANSWERED_SENTINEL

  const cached = await aiExplanationRepository.findCached(
    question._id,
    cacheKey,
    language,
    PROMPT_VERSION,
  )
  if (cached) {
    await aiHistoryRepository.create({
      userId,
      feature: 'question_explanation',
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      provider: cached.provider,
      model: cached.model,
      source: 'cached',
      status: 'success',
      // A cache hit never calls the provider — marginal cost is always
      // exactly $0, recorded explicitly (not left undefined) so "cost
      // tracked as $0" is distinguishable from "cost not computed" in the
      // admin usage aggregation. See constants/aiPricing.ts.
      estimatedCostUsd: 0,
      expiresAt: historyExpiry(),
    })
    return {
      whyCorrectIsCorrect: cached.whyCorrectIsCorrect,
      whyYourAnswerIsWrong: cached.whyYourAnswerIsWrong,
      keyConcept: cached.keyConcept,
      memoryTrick: cached.memoryTrick,
      examRelevance: cached.examRelevance,
      source: 'cached',
      promptVersion: PROMPT_VERSION,
    }
  }

  const generatedToday = await aiHistoryRepository.countGeneratedToday(
    userId,
    'question_explanation',
  )
  if (generatedToday >= DAILY_GENERATION_QUOTA) {
    await aiHistoryRepository.create({
      userId,
      feature: 'question_explanation',
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'Daily AI explanation limit reached',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.TOO_MANY_REQUESTS,
      "You've reached today's AI Explanation limit. Standard Explanation is still available — try again tomorrow.",
      'DAILY_AI_LIMIT_REACHED',
    )
  }

  if (!isAnthropicConfigured()) {
    await aiHistoryRepository.create({
      userId,
      feature: 'question_explanation',
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'AI provider not configured',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI Explanation is temporarily unavailable. Standard Explanation is still available.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }

  const [subject, topic] = await Promise.all([
    subjectRepository.findById(question.subjectId),
    topicRepository.findById(question.topicId),
  ])
  const selectedOption = selectedOptionId
    ? question.options.find((option) => option.optionId === selectedOptionId)
    : undefined

  const context: QuestionExplanationContext = {
    language,
    questionText: pickText(question.questionText, language),
    options: question.options.map((option) => ({
      label: option.optionId,
      text: pickText(option.text, language),
    })),
    correctOptionLabel: correctOption.optionId,
    correctOptionText: pickText(correctOption.text, language),
    selectedOptionLabel: selectedOptionId,
    selectedOptionText: selectedOption ? pickText(selectedOption.text, language) : null,
    wasCorrect: selectedOptionId === correctOption.optionId,
    standardExplanation: question.explanation
      ? pickText(question.explanation, language)
      : '',
    subjectName: subject ? pickText(subject.name, language) : '',
    topicName: topic ? pickText(topic.name, language) : '',
    difficulty: question.difficulty,
    previousYearInfo: question.isPreviousYear
      ? `Appeared as a previous-year TNPSC question${
          question.pyqYear ? ` (${question.pyqYear})` : ''
        }.`
      : null,
  }

  try {
    const { parsed, tokenUsage } = await generateExplanationWithFallback(context)
    const estimatedCostUsd = estimateCostUsd(
      AI_MODEL,
      tokenUsage.inputTokens,
      tokenUsage.outputTokens,
    )

    await aiExplanationRepository.create({
      questionId: question._id,
      selectedOptionId: cacheKey,
      language,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      whyCorrectIsCorrect: parsed.whyCorrectIsCorrect,
      whyYourAnswerIsWrong: parsed.whyYourAnswerIsWrong,
      keyConcept: parsed.keyConcept,
      memoryTrick: parsed.memoryTrick,
      examRelevance: parsed.examRelevance,
      tokenUsage,
    })

    await aiHistoryRepository.create({
      userId,
      feature: 'question_explanation',
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      source: 'generated',
      status: 'success',
      tokenUsage,
      estimatedCostUsd,
      expiresAt: historyExpiry(),
    })

    return {
      whyCorrectIsCorrect: parsed.whyCorrectIsCorrect,
      whyYourAnswerIsWrong: parsed.whyYourAnswerIsWrong,
      keyConcept: parsed.keyConcept,
      memoryTrick: parsed.memoryTrick,
      examRelevance: parsed.examRelevance,
      source: 'generated',
      promptVersion: PROMPT_VERSION,
    }
  } catch (error) {
    const errorMessage = safeErrorMessage(error)
    logger.warn('AI explanation generation failed', {
      userId,
      questionId,
      error: errorMessage,
    })
    await aiHistoryRepository.create({
      userId,
      feature: 'question_explanation',
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      source: 'generated',
      status: 'failure',
      errorMessage,
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI Explanation is temporarily unavailable right now. Standard Explanation is still available.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }
}
