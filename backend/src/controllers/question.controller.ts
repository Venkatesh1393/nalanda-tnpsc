import type { Request, Response } from 'express'

import * as questionService from '../services/question.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type { IdParams } from '../validators/question.validator'

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected field "image"')
  const { id = '' } = req.params as IdParams
  const question = await questionService.attachImage(id, req.file)
  sendSuccess(res, question)
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  const { id = '' } = req.params as IdParams
  const question = await questionService.removeImage(id)
  sendSuccess(res, question)
}
