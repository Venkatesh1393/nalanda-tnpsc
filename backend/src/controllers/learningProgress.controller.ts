import type { Request, Response } from 'express'

import * as learningProgressService from '../services/learningProgress.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'
import type { UpdateLearningProgressBody } from '../validators/learningProgress.validator'

export async function getProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const subjectSlug =
    typeof req.query.subjectSlug === 'string' ? req.query.subjectSlug : undefined
  const progress = await learningProgressService.getProgress(
    req.user.sub,
    lang,
    subjectSlug,
  )
  sendSuccess(res, progress)
}

export async function getLastVisited(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lastVisited = await learningProgressService.getLastVisited(req.user.sub)
  sendSuccess(res, lastVisited)
}

export async function updateProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { subtopicSlug = '' } = req.params
  await learningProgressService.updateProgress(
    req.user.sub,
    subtopicSlug,
    req.body as UpdateLearningProgressBody,
  )
  sendSuccess(res, { updated: true })
}
