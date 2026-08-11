import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Types } from 'mongoose'
import { z } from 'zod'

import {
  AI_MODEL,
  AI_PROVIDER,
  getAnthropicClient,
  isAnthropicConfigured,
} from '../../config/anthropic'
import { logger } from '../../config/logger'
import type { AiConfidenceLevel } from '../../constants/ai'
import { HttpStatus } from '../../constants/httpStatus'
import {
  getAiTutorLimits,
  MAX_CONTEXT_CHARS,
  MAX_CONVERSATION_TITLE_LENGTH,
} from '../../constants/aiTutor'
import type { SubscriptionTier } from '../../constants/roles'
import type { AiTutorContextType } from '../../models/AiConversation.model'
import type { AiMessageDocument } from '../../models/AiMessage.model'
import * as aiConversationRepository from '../../repositories/aiConversation.repository'
import * as aiHistoryRepository from '../../repositories/aiHistory.repository'
import * as aiMessageRepository from '../../repositories/aiMessage.repository'
import * as examRepository from '../../repositories/exam.repository'
import * as lessonRepository from '../../repositories/lesson.repository'
import * as profileRepository from '../../repositories/profile.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as topicRepository from '../../repositories/topic.repository'
import { estimateCostUsd } from '../../utils/aiCost'
import { ApiError } from '../../utils/ApiError'
import { pickText, type DisplayLanguage } from '../learn.service'
import {
  buildSystemPrompt,
  PROMPT_VERSION,
  type AiTutorContext,
  type AiTutorSyllabusSummary,
} from '../../prompts/aiTutor.v2'

/**
 * Sprint 4 Step 59 — Nalanda AI Tutor orchestration. Same "AI Orchestration
 * Service" isolation as `questionExplanation.service.ts`
 * (docs/Architecture.md §5) — controllers never touch the Anthropic SDK.
 *
 * **No tool use, no function calling, no MCP, no database write path
 * reachable from the model.** This is a deliberate architectural boundary,
 * not an oversight — the model is a stateless text-in/structured-text-out
 * call on every turn (`client.messages.parse`). It never receives a `tools`
 * array, so there is nothing for it to "call" even if a jailbroken response
 * tried to. Every database read this feature performs (resolving a lesson/
 * question/topic, loading conversation history) happens in *this* file,
 * server-side, before the provider is ever invoked — the model's output is
 * validated against `aiTutorReplySchema` and then only ever *stored*
 * (`AiMessage.create`), never interpreted as a command. This satisfies the
 * task's "do not give the model unrestricted access to backend/database
 * operations" requirement structurally, not by policy.
 *
 * Cost/abuse control mirrors Step 57/58: per-tier daily message quota
 * (`getAiTutorLimits`, counted the same way as `question_explanation`'s
 * `DAILY_GENERATION_QUOTA` — `source: 'generated'` `AIHistory` rows for
 * `feature: 'doubt_chatbot'` today), a per-tier cap on concurrent open
 * conversations, in-flight per-conversation de-duplication, and one
 * app-level fallback attempt beyond the SDK's own retry.
 */

const REQUEST_TIMEOUT_MS = 20_000
const MAX_RETRIES = 2
const MAX_REPLY_TOKENS = 1024
/** Chat history replayed to the provider on every turn — bounded so a very
 * long-running conversation doesn't grow the request (and cost) unbounded.
 * Older turns simply age out of what the model sees; they remain visible in
 * full in the stored conversation/message-history UI regardless. */
const MAX_HISTORY_MESSAGES = 20
/** `doubt_chatbot` is Architecture.md §5's explicit "high volume, lower
 * long-term value" `AIHistory` retention tier (12 months) — same reasoning
 * `questionExplanation.service.ts` applies, this is the audit-row expiry,
 * never the conversation/message content itself (which has no TTL; it lives
 * until the student deletes it). */
const AI_HISTORY_RETENTION_DAYS = 365
const SUMMARY_PREVIEW_CHARS = 200

const aiTutorReplySchema = z.object({
  reply: z.string().min(1),
  onTopic: z.boolean(),
  confidence: z.enum(['high', 'low']),
})

export interface AiTutorConversationSummaryDTO {
  id: string
  title: string
  language: DisplayLanguage
  contextType: AiTutorContextType | null
  isPinned: boolean
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
}

export interface AiTutorMessageDTO {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidenceFlag: AiConfidenceLevel | null
  createdAt: string
}

export interface AiTutorConversationDetailDTO extends AiTutorConversationSummaryDTO {
  messages: AiTutorMessageDTO[]
}

export interface AiTutorUsageDTO {
  activeConversations: number
  maxActiveConversations: number
  messagesToday: number
  dailyMessageLimit: number
}

export interface SendMessageInput {
  conversationId: string
  content: string
}

export interface CreateConversationInput {
  language: DisplayLanguage
  contextType?: AiTutorContextType
  contextRefId?: string
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return message.slice(0, 500)
}

function historyExpiry(): Date {
  return new Date(Date.now() + AI_HISTORY_RETENTION_DAYS * 86_400_000)
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// --- Context resolution — the only place this feature reads Nalanda -----
// content into the prompt. Returns `null` (never throws) when the
// referenced content is missing/inactive at message-send time — a
// conversation started against a lesson that later gets archived should
// degrade gracefully, not break the chat.

async function resolveContext(
  contextType: AiTutorContextType | undefined,
  contextRefId: Types.ObjectId | string | undefined,
  language: DisplayLanguage,
): Promise<AiTutorContext | null> {
  if (!contextType || !contextRefId) return null

  if (contextType === 'lesson') {
    const lesson = await lessonRepository.findById(contextRefId)
    if (!lesson) return null
    return {
      type: 'lesson',
      label: pickText(lesson.title, language),
      body: truncate(
        lesson.transcript
          ? pickText(lesson.transcript, language)
          : '(no transcript available)',
        MAX_CONTEXT_CHARS,
      ),
    }
  }

  if (contextType === 'question') {
    const question = await questionRepository.findById(contextRefId)
    if (!question) return null
    const subject = await subjectRepository.findById(question.subjectId)
    const optionsBlock = question.options
      .map((option) => `${option.optionId}) ${pickText(option.text, language)}`)
      .join('\n')
    // Deliberately never includes which option is correct — see this
    // file's header comment; AI Tutor grounds concepts, it never confirms
    // an answer the way `questionExplanation.service.ts` (a post-submission
    // review feature) intentionally does.
    return {
      type: 'question',
      label: truncate(pickText(question.questionText, language), 200),
      body: truncate(
        `${pickText(question.questionText, language)}\n${optionsBlock}`,
        MAX_CONTEXT_CHARS,
      ),
      subjectName: subject ? pickText(subject.name, language) : undefined,
    }
  }

  const topic = await topicRepository.findById(contextRefId)
  if (!topic) return null
  const subject = await subjectRepository.findById(topic.subjectId)
  return {
    type: 'topic',
    label: pickText(topic.name, language),
    body: pickText(topic.name, language),
    subjectName: subject ? pickText(subject.name, language) : undefined,
  }
}

async function resolveSyllabus(
  userId: string,
  language: DisplayLanguage,
): Promise<AiTutorSyllabusSummary | null> {
  const profile = await profileRepository.findByUserId(userId)
  const primaryGoal =
    profile?.examGoals.find((goal) => goal.isPrimary) ?? profile?.examGoals[0]
  if (!primaryGoal) return null
  const exam = await examRepository.findById(primaryGoal.examId)
  if (!exam) return null
  const subjects = await subjectRepository.findByExam(exam._id)
  return {
    examName: pickText(exam.name, language),
    subjectNames: subjects.map((subject) => pickText(subject.name, language)),
  }
}

// --- Provider call, with the same app-level fallback layer Step 58 -------
// established (`questionExplanation.service.ts#generateExplanationWithFallback`)
// — one extra attempt for a refusal/schema-validation failure the SDK's own
// retry can't classify as transient.

interface GeneratedReply {
  parsed: z.infer<typeof aiTutorReplySchema>
  tokenUsage: { inputTokens: number; outputTokens: number }
}

async function generateReplyOnce(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<GeneratedReply> {
  const client = getAnthropicClient()
  const response = await client.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system: systemPrompt,
      messages,
      output_config: { format: zodOutputFormat(aiTutorReplySchema) },
    },
    { timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES },
  )

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(
      `Model did not return a usable reply (stop_reason=${response.stop_reason})`,
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

function isRetryableGenerationError(error: unknown): boolean {
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  ) {
    return true
  }
  return error instanceof Error && error.message.startsWith('Model did not return')
}

async function generateReplyWithFallback(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<GeneratedReply> {
  try {
    return await generateReplyOnce(systemPrompt, messages)
  } catch (error) {
    if (!isRetryableGenerationError(error)) throw error
    logger.warn('AI Tutor reply generation failed — retrying once (fallback attempt)', {
      error: safeErrorMessage(error),
    })
    return await generateReplyOnce(systemPrompt, messages)
  }
}

// --- DTO mapping ------------------------------------------------------

function toConversationSummaryDTO(
  conversation: Awaited<ReturnType<typeof aiConversationRepository.findByIdForUser>>,
): AiTutorConversationSummaryDTO {
  if (!conversation) throw ApiError.notFound('Conversation not found')
  return {
    id: conversation.id,
    title: conversation.title,
    language: conversation.language,
    contextType: conversation.contextType ?? null,
    isPinned: conversation.isPinned,
    messageCount: conversation.messageCount,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

function toMessageDTO(message: AiMessageDocument): AiTutorMessageDTO {
  return {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    confidenceFlag: message.confidenceFlag ?? null,
    createdAt: message.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

// --- Public API ---------------------------------------------------------

export async function listConversations(
  userId: string,
  search?: string,
): Promise<AiTutorConversationSummaryDTO[]> {
  const conversations = await aiConversationRepository.findByUser(userId, search)
  return conversations.map(toConversationSummaryDTO)
}

/** Sprint 4 Step 64 — "Pinned Chat." */
export async function setPinned(
  userId: string,
  conversationId: string,
  isPinned: boolean,
): Promise<AiTutorConversationSummaryDTO> {
  const updated = await aiConversationRepository.setPinned(
    conversationId,
    userId,
    isPinned,
  )
  if (!updated) throw ApiError.notFound('Conversation not found')
  return toConversationSummaryDTO(updated)
}

export async function getUsage(
  userId: string,
  tier: SubscriptionTier,
): Promise<AiTutorUsageDTO> {
  const limits = getAiTutorLimits(tier)
  const [activeConversations, messagesToday] = await Promise.all([
    aiConversationRepository.countByUser(userId),
    aiHistoryRepository.countGeneratedToday(userId, 'doubt_chatbot'),
  ])
  return {
    activeConversations,
    maxActiveConversations: limits.maxActiveConversations,
    messagesToday,
    dailyMessageLimit: limits.dailyMessageLimit,
  }
}

export async function createConversation(
  userId: string,
  tier: SubscriptionTier,
  input: CreateConversationInput,
): Promise<AiTutorConversationSummaryDTO> {
  const limits = getAiTutorLimits(tier)
  const activeCount = await aiConversationRepository.countByUser(userId)
  if (activeCount >= limits.maxActiveConversations) {
    throw new ApiError(
      HttpStatus.TOO_MANY_REQUESTS,
      `You've reached your limit of ${limits.maxActiveConversations} open conversations. Delete an old one to start a new one.`,
      'AI_TUTOR_CONVERSATION_LIMIT_REACHED',
    )
  }

  let context: AiTutorContext | null = null
  if (input.contextType && input.contextRefId) {
    context = await resolveContext(input.contextType, input.contextRefId, input.language)
    if (!context) {
      throw ApiError.badRequest(`The referenced ${input.contextType} could not be found.`)
    }
  }

  const conversation = await aiConversationRepository.create({
    userId,
    title: context
      ? truncate(`Doubt: ${context.label}`, MAX_CONVERSATION_TITLE_LENGTH)
      : 'New conversation',
    language: input.language,
    contextType: input.contextType,
    contextRefId: input.contextRefId,
  })

  return toConversationSummaryDTO(conversation)
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<AiTutorConversationDetailDTO> {
  const conversation = await aiConversationRepository.findByIdForUser(
    conversationId,
    userId,
  )
  if (!conversation) throw ApiError.notFound('Conversation not found')
  const messages = await aiMessageRepository.findByConversation(conversationId, 500)
  return {
    ...toConversationSummaryDTO(conversation),
    messages: messages.map(toMessageDTO),
  }
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await aiConversationRepository.findByIdForUser(
    conversationId,
    userId,
  )
  if (!conversation) throw ApiError.notFound('Conversation not found')
  await aiMessageRepository.deleteByConversation(conversationId)
  await aiConversationRepository.deleteById(conversationId)
}

// Sprint 4 Step 58's in-flight duplicate-request-prevention pattern,
// reapplied here — two concurrent sends to the same conversation are an
// invalid ordering regardless (a chat has one active turn at a time), so
// they collapse into a single execution rather than racing.
const inFlightSends = new Map<
  string,
  Promise<{ conversation: AiTutorConversationSummaryDTO; message: AiTutorMessageDTO }>
>()

export function sendMessage(
  userId: string,
  tier: SubscriptionTier,
  input: SendMessageInput,
): Promise<{ conversation: AiTutorConversationSummaryDTO; message: AiTutorMessageDTO }> {
  const key = `${userId}:${input.conversationId}`
  const existing = inFlightSends.get(key)
  if (existing) return existing

  const request = sendMessageUncached(userId, tier, input).finally(() => {
    inFlightSends.delete(key)
  })
  inFlightSends.set(key, request)
  return request
}

async function sendMessageUncached(
  userId: string,
  tier: SubscriptionTier,
  input: SendMessageInput,
): Promise<{ conversation: AiTutorConversationSummaryDTO; message: AiTutorMessageDTO }> {
  const conversation = await aiConversationRepository.findByIdForUser(
    input.conversationId,
    userId,
  )
  if (!conversation) throw ApiError.notFound('Conversation not found')

  const limits = getAiTutorLimits(tier)
  const messagesToday = await aiHistoryRepository.countGeneratedToday(
    userId,
    'doubt_chatbot',
  )
  if (messagesToday >= limits.dailyMessageLimit) {
    await aiHistoryRepository.create({
      userId,
      feature: 'doubt_chatbot',
      conversationId: conversation._id,
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'Daily AI Tutor message limit reached',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.TOO_MANY_REQUESTS,
      `You've reached today's AI Tutor limit of ${limits.dailyMessageLimit} messages. Try again tomorrow.`,
      'DAILY_AI_TUTOR_LIMIT_REACHED',
    )
  }

  if (!isAnthropicConfigured()) {
    await aiHistoryRepository.create({
      userId,
      feature: 'doubt_chatbot',
      conversationId: conversation._id,
      promptVersion: PROMPT_VERSION,
      source: 'generated',
      status: 'failure',
      errorMessage: 'AI provider not configured',
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI Tutor is temporarily unavailable. Please try again later.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }

  const [context, syllabus, history] = await Promise.all([
    resolveContext(
      conversation.contextType,
      conversation.contextRefId,
      conversation.language,
    ),
    resolveSyllabus(userId, conversation.language),
    aiMessageRepository.findByConversation(input.conversationId, MAX_HISTORY_MESSAGES),
  ])

  const systemPrompt = buildSystemPrompt(conversation.language, context, syllabus)
  const providerMessages = [
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user' as const, content: input.content },
  ]

  // Persist the student's turn before calling the provider — a failed
  // *generation* (network/refusal/schema error, handled below) shouldn't
  // silently drop what the student typed. Quota-exceeded/not-configured
  // above intentionally return earlier without persisting anything, same
  // as `questionExplanation.service.ts`'s equivalent gates — a request that
  // never attempts generation shouldn't count as a stored turn.
  await aiMessageRepository.create({
    conversationId: conversation._id,
    userId: conversation.userId,
    role: 'user',
    content: input.content,
  })
  const wasFirstMessage = conversation.messageCount === 0
  await aiConversationRepository.recordMessage(input.conversationId)

  const generationStartedAt = Date.now()
  try {
    const { parsed, tokenUsage } = await generateReplyWithFallback(
      systemPrompt,
      providerMessages,
    )
    const latencyMs = Date.now() - generationStartedAt
    const confidenceFlag: AiConfidenceLevel = !parsed.onTopic
      ? 'escalated'
      : parsed.confidence

    const assistantMessage = await aiMessageRepository.create({
      conversationId: conversation._id,
      userId: conversation.userId,
      role: 'assistant',
      content: parsed.reply,
      confidenceFlag,
    })
    const updatedConversation = await aiConversationRepository.recordMessage(
      input.conversationId,
    )

    if (wasFirstMessage && conversation.title === 'New conversation') {
      await aiConversationRepository.updateTitle(
        input.conversationId,
        truncate(input.content, MAX_CONVERSATION_TITLE_LENGTH),
      )
    }

    const estimatedCostUsd = estimateCostUsd(
      AI_MODEL,
      tokenUsage.inputTokens,
      tokenUsage.outputTokens,
    )
    await aiHistoryRepository.create({
      userId,
      feature: 'doubt_chatbot',
      conversationId: conversation._id,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      source: 'generated',
      status: 'success',
      tokenUsage,
      estimatedCostUsd,
      latencyMs,
      confidenceFlag,
      // Short, safe previews only — never the full message or system
      // prompt. See this file's header comment and AIHistory.model.ts.
      inputSummary: truncate(input.content, SUMMARY_PREVIEW_CHARS),
      outputSummary: truncate(parsed.reply, SUMMARY_PREVIEW_CHARS),
      expiresAt: historyExpiry(),
    })

    const conversationDto = updatedConversation
      ? toConversationSummaryDTO(updatedConversation)
      : toConversationSummaryDTO(conversation)

    return { conversation: conversationDto, message: toMessageDTO(assistantMessage) }
  } catch (error) {
    const errorMessage = safeErrorMessage(error)
    logger.warn('AI Tutor reply generation failed', {
      userId,
      conversationId: input.conversationId,
      error: errorMessage,
    })
    await aiHistoryRepository.create({
      userId,
      feature: 'doubt_chatbot',
      conversationId: conversation._id,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: AI_MODEL,
      source: 'generated',
      status: 'failure',
      errorMessage,
      latencyMs: Date.now() - generationStartedAt,
      inputSummary: truncate(input.content, SUMMARY_PREVIEW_CHARS),
      expiresAt: historyExpiry(),
    })
    throw new ApiError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI Tutor is temporarily unavailable right now. Please try again shortly.',
      'AI_SERVICE_UNAVAILABLE',
    )
  }
}
