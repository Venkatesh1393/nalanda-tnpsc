import type { Request, Response } from 'express'

import * as adminCurrentAffairsService from '../../services/admin/adminCurrentAffairs.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  AdminIdParams,
  CreateCurrentAffairBody,
  ListAdminCurrentAffairsQuery,
  UpdateCurrentAffairBody,
  UpdateCurrentAffairStatusBody,
} from '../../validators/currentAffairs.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function listCurrentAffairs(req: Request, res: Response): Promise<void> {
  const { search, period, category, status, page, limit } =
    req.query as unknown as ListAdminCurrentAffairsQuery
  const result = await adminCurrentAffairsService.listCurrentAffairs(
    { search, period, category, status },
    page,
    limit,
  )
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / result.limit) || 1,
  })
}

export async function getCurrentAffair(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminCurrentAffairsService.getCurrentAffairById(id))
}

export async function createCurrentAffair(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const article = await adminCurrentAffairsService.createCurrentAffair(
    actor,
    req.body as CreateCurrentAffairBody,
  )
  sendSuccess(res, article, 201)
}

export async function updateCurrentAffair(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  const article = await adminCurrentAffairsService.updateCurrentAffair(
    actor,
    id,
    req.body as UpdateCurrentAffairBody,
  )
  sendSuccess(res, article)
}

/** `isActive: true` = publish (or schedule, if `publishAt` is in the
 * future); `isActive: false` = unpublish. */
export async function updateCurrentAffairStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  const { isActive } = req.body as UpdateCurrentAffairStatusBody
  sendSuccess(
    res,
    await adminCurrentAffairsService.updateCurrentAffairStatus(actor, id, isActive),
  )
}

export async function archiveCurrentAffair(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminCurrentAffairsService.archiveCurrentAffair(actor, id))
}

export async function restoreCurrentAffair(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { id } = req.params as unknown as AdminIdParams
  sendSuccess(res, await adminCurrentAffairsService.restoreCurrentAffair(actor, id))
}
