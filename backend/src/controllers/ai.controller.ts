import type { Request, Response } from 'express'

import * as questionExplanationService from '../services/ai/questionExplanation.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type { ExplainQuestionBody } from '../validators/ai.validator'

export async function explainQuestion(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { sessionId, questionId, language } = req.body as ExplainQuestionBody
  const result = await questionExplanationService.explainQuestion(
    req.user.sub,
    sessionId,
    questionId,
    language,
  )
  sendSuccess(res, result)
}
