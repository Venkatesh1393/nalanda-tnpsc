import type { Request, Response } from 'express'

import * as learnService from '../services/learn.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'

export async function getLessonById(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { lessonId = '' } = req.params
  const lesson = await learnService.getLessonById(lessonId)
  sendSuccess(res, lesson)
}

export async function getStudyMaterialById(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { studyMaterialId = '' } = req.params
  const studyMaterial = await learnService.getStudyMaterialById(studyMaterialId)
  sendSuccess(res, studyMaterial)
}

export async function uploadStudyMaterialFile(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected field "file"')
  const { studyMaterialId = '' } = req.params
  const studyMaterial = await learnService.uploadStudyMaterialFile(
    studyMaterialId,
    req.file,
  )
  sendSuccess(res, studyMaterial)
}

export async function deleteStudyMaterialFile(
  req: Request,
  res: Response,
): Promise<void> {
  const { studyMaterialId = '' } = req.params
  const studyMaterial = await learnService.removeStudyMaterialFile(studyMaterialId)
  sendSuccess(res, studyMaterial)
}
