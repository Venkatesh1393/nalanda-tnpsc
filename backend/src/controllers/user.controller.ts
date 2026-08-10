import type { Request, Response } from 'express'

import * as userService from '../services/user.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import type { UpdateMeBody, UpdatePreferencesBody } from '../validators/user.validator'

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const me = await userService.getMe(req.user.sub)
  sendSuccess(res, me)
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const me = await userService.updateMe(req.user.sub, req.body as UpdateMeBody)
  sendSuccess(res, me)
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const me = await userService.updatePreferences(
    req.user.sub,
    req.body as UpdatePreferencesBody,
  )
  sendSuccess(res, me)
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected field "avatar"')
  const me = await userService.uploadAvatar(req.user.sub, req.file)
  sendSuccess(res, me)
}

export async function deleteAvatar(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const me = await userService.removeAvatar(req.user.sub)
  sendSuccess(res, me)
}
