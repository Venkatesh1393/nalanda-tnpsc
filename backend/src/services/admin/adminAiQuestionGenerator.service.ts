import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import {
  AI_MODEL,
  AI_PROVIDER,
  getAnthropicClient,
  isAnthropicConfigured,
} from '../../config/anthropic'
import { logger } from '../../config/logger'
import { DAILY_GENERATION_REQUEST_LIMIT } from '../../constants/aiQuestionGenerator'
import { HttpStatus } from '../../constants/httpStatus'
import type { QuestionDifficulty, TnpscExamStage } from '../../constants/practice'
import type { Role } from '../../constants/roles'
import type {
  AiQuestionDraftDocument,
  AiQuestionDraftStatus,
  IAiQuestionDraft,
} from '../../models/AiQuestionDraft.model'
import type { BilingualText } from '../../models/shared/bilingualText'
import * as aiHistoryRepository from '../../repositories/aiHistory.repository'
import * as aiQuestionDraftRepository from '../../repositories/aiQuestionDraft.repository'
import type { AdminDraftListFilter } from '../../repositories/aiQuestionDraft.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as subtopicRepository from '../../repositories/subtopic.repository'
import * as topicRepository from '../../repositories/topic.repository'
import * as userRepository from '../../repositories/user.repository'
import { estimateCostUsd } from '../../utils/aiCost'
import { ApiError } from '../../utils/ApiError'
import { validateQuestionReferences } from './adminQuestions.service'
import { pickText } from '../learn.service'
import * as auditLogService from '../auditLog.service'
import {
  buildUserMessage,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  type QuestionGeneratorParams,
} from '../../prompts/questionGenerator.v1'

/**
 * Sprint 4 Step 65 — Admin AI Question Generator orchestration. Same "AI
 * Orchestration Service" isolation as `questionExplanation.service.ts`/
 * `aiTutor.service.ts` — controllers never touch the Anthropic SDK, and
 * this file is the only place besides `config/anthropic.ts` that does.
 *
 * The whole point of this feature, restated in code terms: `generateQuestions`
 * only ever writes to `AiQuestionDraft` (`status: 'pending'`) — it never
 * creates a `Question` document. The **only** function in this entire
 * codebase that can create a `Question` from AI-generated content is
 * `approveDraft` below, and it only runs when an admin explicitly calls it
 * on a `status: 'pending'` draft. `rejectDraft` never touches `Question` at
 * all. This mirrors `adminLiveExams.service.ts#publishLiveExam`'s "one
 * explicit, narrow, audited transition function is the sole path to going
 * live" shape exactly.
 */

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
/** Same "high volume, lower long-term value" reasoning every other AI
 * feature's `AIHistory` audit row uses — this is the audit-row expiry,
 * never the `AiQuestionDraft` content itself (which has no TTL; it lives
 * until an admin approves or it's cleaned up separately). */
const AI_HISTORY_RETENTION_DAYS = 365

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

function historyExpiry(): Date {
  return new Date(Date.now() + AI_HISTORY_RETENTION_DAYS * 86_400_000)
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return message.slice(0, 500)
}

const generatedOptionSchema = z.object({
  optionId: z.enum(['A', 'B', 'C', 'D']),
  textEn: z.string().min(1),
  textTa: z.string().min(1),
  isCorrect: z.boolean(),
})

const generatedQuestionSchema = z.object({
  questionTextEn: z.string().min(1),
  questionTextTa: z.string().min(1),
  options: z.array(generatedOptionSchema).length(4),
  explanationEn: z.string().min(1),
  explanationTa: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1).max(5),
})

const generationOutputSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
})

interface GeneratedBatch {
  parsed: z.infer<typeof generationOutputSchema>
  tokenUsage: { inputTokens: number; outputTokens: number }
}

async function generateOnce(params: QuestionGeneratorParams): Promise<GeneratedBatch> {
  const client = getAnthropicClient()
  const response = await client.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(params) }],
      output_config: { format: zodOutputFormat(generationOutputSchema) },
    },
    { timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES },
  )

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(
      `Model did not return usable questions (stop_reason=${response.stop_reason})`,
    )
  }
  if (response.parsed_output.questions.length !== params.count) {
    throw new Error(
      `Model returned ${response.parsed_output.questions.length} questions, requested ${params.count}`,
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

/** Same app-level fallback layer as `questionExplanation.service.ts`/
 * `aiTutor.service.ts` — one extra full attempt for a refusal, a
 * schema-validation failure, or a wrong-count response, none of which the
 * SDK's own retry can see since they aren't transport-level errors. */
function isRetryableGenerationError(error: unknown): boolean {
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  ) {
    return true
  }
  return (
    error instanceof Error &&
    (error.message.startsWith('Model did not return') ||
      error.message.startsWith('Model returned'))
  )
}

async function generateWithFallback(
  params: QuestionGeneratorParams,
): Promise<GeneratedBatch> {
  try {
    return await generateOnce(params)
  } catch (error) {
    if (!isRetryableGenerationError(error)) throw error
    logger.warn('AI question generation failed — retrying once (fallback attempt)', {
      error: safeErrorMessage(error),
    })
    return await generateOnce(params)
  }
}

// --- DTOs -----------------------------------------------------------------

export interface AiQuestionDraftDTO {
  id: string
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  questionText: BilingualText
  options: IAiQuestionDraft['options']
  difficulty: QuestionDifficulty
  questionType: string
  explanation?: BilingualText
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  tags: string[]
  status: AiQuestionDraftStatus
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  publishedQuestionId: string | null
  generation: {
    batchId: string
    promptVersion: string
    provider: string
    model: string
    tokenUsage?: { inputTokens: number; outputTokens: number }
    estimatedCostUsd?: number | null
  }
  createdAt: string | null
  updatedAt: string | null
}

function toDTO(draft: AiQuestionDraftDocument): AiQuestionDraftDTO {
  return {
    id: draft.id,
    examIds: draft.examIds.map((id) => id.toString()),
    subjectId: draft.subjectId.toString(),
    topicId: draft.topicId.toString(),
    subtopicId: draft.subtopicId.toString(),
    questionText: draft.questionText,
    options: draft.options,
    difficulty: draft.difficulty,
    questionType: draft.questionType,
    explanation: draft.explanation,
    isPreviousYear: draft.isPreviousYear,
    pyqYear: draft.pyqYear,
    tnpscExamType: draft.tnpscExamType,
    tags: draft.tags,
    status: draft.status,
    reviewedBy: draft.reviewedBy?.toString() ?? null,
    reviewedAt: draft.reviewedAt?.toISOString() ?? null,
    rejectionReason: draft.rejectionReason ?? null,
    publishedQuestionId: draft.publishedQuestionId?.toString() ?? null,
    generation: {
      batchId: draft.generation.batchId,
      promptVersion: draft.generation.promptVersion,
      provider: draft.generation.provider,
      model: draft.generation.model,
      tokenUsage: draft.generation.tokenUsage,
      estimatedCostUsd: draft.generation.estimatedCostUsd,
    },
    createdAt: draft.createdAt?.toISOString() ?? null,
    updatedAt: draft.updatedAt?.toISOString() ?? null,
  }
}

// --- Generate ---------------------------------------------------------------

export interface GenerateQuestionsInput {
  examIds: string[]
  subjectId: string
  topicId: string
  subtopicId: string
  difficulty: QuestionDifficulty
  count: number
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: TnpscExamStage
  language: 'en' | 'ta'
  customInstructions?: string
}

export interface GeneratedBatchDTO {
  batchId: string
  drafts: AiQuestionDraftDTO[]
}

export async function generateQuestions(
  actor: ActingAdmin,
  input: GenerateQuestionsInput,
): Promise<GeneratedBatchDTO> {
  await validateQuestionReferences({
    examIds: input.examIds,
    subjectId: input.subjectId,
    topicId: input.topicId,
    subtopicId: input.subtopicId,
  })

  const generatedToday = await aiHistoryRepository.countGeneratedToday(
    actor.id,
    'question_generation',
  )
  if (generatedToday >= DAILY_GENERATION_REQUEST_LIMIT) {
    await aiHistoryRepository.create({
      userId: actor.id,
      feature: 'question_generation',
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'Daily AI question generation limit reached',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.TOO_MANY_REQUESTS,
      `You've reached today's limit of ${DAILY_GENERATION_REQUEST_LIMIT} AI generation requests. Try again tomorrow.`,
      'DAILY_AI_GENERATION_LIMIT_REACHED',
    )
  }

  if (!isAnthropicConfigured()) {
    await aiHistoryRepository.create({
      userId: actor.id,
      feature: 'question_generation',
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'AI provider not configured',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI Question Generator is temporarily unavailable. Please try again later.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }

  const [subject, topic, subtopic] = await Promise.all([
    subjectRepository.findById(input.subjectId),
    topicRepository.findById(input.topicId),
    subtopicRepository.findById(input.subtopicId),
  ])
  // Already confirmed to exist by `validateQuestionReferences` above.
  const params: QuestionGeneratorParams = {
    subjectName: pickText(subject!.name, 'en'),
    topicName: pickText(topic!.name, 'en'),
    subtopicName: pickText(subtopic!.name, 'en'),
    difficulty: input.difficulty,
    count: input.count,
    isPreviousYear: input.isPreviousYear,
    tnpscExamType: input.tnpscExamType,
    language: input.language,
    customInstructions: input.customInstructions,
  }

  try {
    const { parsed, tokenUsage } = await generateWithFallback(params)
    const estimatedCostUsd = estimateCostUsd(
      AI_MODEL,
      tokenUsage.inputTokens,
      tokenUsage.outputTokens,
    )
    const batchId = randomUUID()

    const created = await aiQuestionDraftRepository.createMany(
      parsed.questions.map((question) => ({
        examIds: input.examIds,
        subjectId: input.subjectId,
        topicId: input.topicId,
        subtopicId: input.subtopicId,
        questionText: { en: question.questionTextEn, ta: question.questionTextTa },
        options: question.options.map((option) => ({
          optionId: option.optionId,
          text: { en: option.textEn, ta: option.textTa },
          isCorrect: option.isCorrect,
        })),
        difficulty: input.difficulty,
        questionType: 'mcq_single',
        explanation: { en: question.explanationEn, ta: question.explanationTa },
        isPreviousYear: input.isPreviousYear,
        pyqYear: input.pyqYear,
        tnpscExamType: input.tnpscExamType,
        tags: question.tags,
        status: 'pending',
        generation: {
          requestedBy: actor.id,
          batchId,
          promptVersion: PROMPT_VERSION,
          provider: AI_PROVIDER,
          model: AI_MODEL,
          tokenUsage,
          estimatedCostUsd,
        },
      })) as unknown as Partial<IAiQuestionDraft>[],
    )

    await aiHistoryRepository.create({
      userId: actor.id,
      feature: 'question_generation',
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      source: 'generated',
      status: 'success',
      tokenUsage,
      estimatedCostUsd,
      outputSummary: `Generated ${created.length} draft question(s) awaiting review.`,
      expiresAt: historyExpiry(),
    })

    const auditActor = await resolveAuditActor(actor)
    await auditLogService.recordAction(
      auditActor,
      'question.aiGenerate',
      'AiQuestionDraft',
      batchId,
      { count: created.length, subjectId: input.subjectId, topicId: input.topicId },
    )

    return { batchId, drafts: created.map(toDTO) }
  } catch (error) {
    const errorMessage = safeErrorMessage(error)
    logger.warn('AI question generation failed', {
      adminId: actor.id,
      error: errorMessage,
    })
    await aiHistoryRepository.create({
      userId: actor.id,
      feature: 'question_generation',
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
      'AI Question Generator is temporarily unavailable right now. Please try again shortly.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }
}

// --- Review queue ------------------------------------------------------------

export async function listDrafts(
  filter: AdminDraftListFilter,
  page: number,
  limit: number,
): Promise<{ items: AiQuestionDraftDTO[]; total: number; page: number; limit: number }> {
  const { items, total } = await aiQuestionDraftRepository.listForAdmin(
    filter,
    page,
    limit,
  )
  return { items: items.map(toDTO), total, page, limit }
}

export async function getDraftById(id: string): Promise<AiQuestionDraftDTO> {
  const draft = await aiQuestionDraftRepository.findByIdForAdmin(id)
  if (!draft) throw ApiError.notFound('Draft not found')
  return toDTO(draft)
}

export async function updateDraft(
  actor: ActingAdmin,
  id: string,
  data: Partial<IAiQuestionDraft>,
): Promise<AiQuestionDraftDTO> {
  const draft = await aiQuestionDraftRepository.findByIdForAdmin(id)
  if (!draft) throw ApiError.notFound('Draft not found')
  if (draft.status !== 'pending') {
    throw ApiError.badRequest(
      `Only a pending draft can be edited (current status: ${draft.status}).`,
    )
  }

  const updated = await aiQuestionDraftRepository.updateContent(id, data)
  if (!updated) throw ApiError.notFound('Draft not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.aiDraftUpdate',
    'AiQuestionDraft',
    id,
    { fields: Object.keys(data) },
  )

  return toDTO(updated)
}

/**
 * The sole function in this codebase that can turn AI-generated content
 * into a real, live `Question` — see this file's header comment. Copies
 * only the content fields onto the new `Question`; none of `generation`'s
 * AI metadata (tokens, cost, prompt version, model) is ever copied over —
 * that stays on the `AiQuestionDraft` row permanently as the provenance
 * record, satisfying this step's "store AI metadata separately" requirement.
 */
export async function approveDraft(
  actor: ActingAdmin,
  id: string,
): Promise<AiQuestionDraftDTO> {
  const draft = await aiQuestionDraftRepository.findByIdForAdmin(id)
  if (!draft) throw ApiError.notFound('Draft not found')
  if (draft.status !== 'pending') {
    throw ApiError.badRequest(
      `Only a pending draft can be approved (current status: ${draft.status}).`,
    )
  }

  const question = await questionRepository.create({
    examIds: draft.examIds,
    subjectId: draft.subjectId,
    topicId: draft.topicId,
    subtopicId: draft.subtopicId,
    questionText: draft.questionText,
    options: draft.options,
    difficulty: draft.difficulty,
    questionType: draft.questionType,
    explanation: draft.explanation,
    source: 'ai_generated',
    isPreviousYear: draft.isPreviousYear,
    pyqYear: draft.pyqYear,
    tnpscExamType: draft.tnpscExamType,
    tags: draft.tags,
    isActive: true,
    isPremium: false,
    aiExplanationEligible: true,
  })

  const updated = await aiQuestionDraftRepository.markApproved(id, actor.id, question.id)
  if (!updated) throw ApiError.notFound('Draft not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.aiApprove',
    'Question',
    question.id,
    { draftId: id },
  )

  return toDTO(updated)
}

export async function rejectDraft(
  actor: ActingAdmin,
  id: string,
  reason?: string,
): Promise<AiQuestionDraftDTO> {
  const draft = await aiQuestionDraftRepository.findByIdForAdmin(id)
  if (!draft) throw ApiError.notFound('Draft not found')
  if (draft.status !== 'pending') {
    throw ApiError.badRequest(
      `Only a pending draft can be rejected (current status: ${draft.status}).`,
    )
  }

  const updated = await aiQuestionDraftRepository.markRejected(id, actor.id, reason)
  if (!updated) throw ApiError.notFound('Draft not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.aiReject',
    'AiQuestionDraft',
    id,
    {
      reason,
    },
  )

  return toDTO(updated)
}
