import type { Request, Response } from 'express'

import * as aiTutorService from '../services/ai/aiTutor.service'
import { ApiError } from '../utils/ApiError'
import { HttpStatus } from '../constants/httpStatus'
import { sendSuccess } from '../utils/ApiResponse'
import type {
  ConversationIdParams,
  CreateConversationBody,
  ListConversationsQuery,
  SendMessageBody,
} from '../validators/aiTutor.validator'

export async function listConversations(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { search } = req.query as unknown as ListConversationsQuery
  const conversations = await aiTutorService.listConversations(req.user.sub, search)
  sendSuccess(res, conversations)
}

export async function getUsage(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const usage = await aiTutorService.getUsage(req.user.sub, req.user.subscriptionTier)
  sendSuccess(res, usage)
}

export async function createConversation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const body = req.body as CreateConversationBody
  const conversation = await aiTutorService.createConversation(
    req.user.sub,
    req.user.subscriptionTier,
    body,
  )
  sendSuccess(res, conversation, HttpStatus.CREATED)
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { conversationId } = req.params as unknown as ConversationIdParams
  const conversation = await aiTutorService.getConversation(req.user.sub, conversationId)
  sendSuccess(res, conversation)
}

export async function pinConversation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { conversationId } = req.params as unknown as ConversationIdParams
  const conversation = await aiTutorService.setPinned(req.user.sub, conversationId, true)
  sendSuccess(res, conversation)
}

export async function unpinConversation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { conversationId } = req.params as unknown as ConversationIdParams
  const conversation = await aiTutorService.setPinned(req.user.sub, conversationId, false)
  sendSuccess(res, conversation)
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { conversationId } = req.params as unknown as ConversationIdParams
  await aiTutorService.deleteConversation(req.user.sub, conversationId)
  sendSuccess(res, { deleted: true })
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { conversationId } = req.params as unknown as ConversationIdParams
  const { content } = req.body as SendMessageBody
  const result = await aiTutorService.sendMessage(
    req.user.sub,
    req.user.subscriptionTier,
    {
      conversationId,
      content,
    },
  )
  sendSuccess(res, result)
}
