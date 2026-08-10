import type { Request, Response } from 'express'

import * as adminInvitesService from '../../services/admin/adminInvites.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  CreateInviteBody,
  InviteIdParams,
  ListInvitesQuery,
} from '../../validators/admin.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { email, role } = req.body as CreateInviteBody
  const result = await adminInvitesService.createInvite(actor, email, role)
  sendSuccess(res, result, result.outcome === 'invite_created' ? 201 : 200)
}

export async function listInvites(req: Request, res: Response): Promise<void> {
  const { status, page, limit } = req.query as unknown as ListInvitesQuery
  const { items, total } = await adminInvitesService.listInvites(status, page, limit)
  sendSuccess(res, items, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  })
}

export async function revokeInvite(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { inviteId } = req.params as unknown as InviteIdParams
  const invite = await adminInvitesService.revokeInvite(actor, inviteId)
  sendSuccess(res, invite)
}
