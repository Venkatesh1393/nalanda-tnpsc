import type { Request, Response } from 'express'

import * as adminUsersService from '../../services/admin/adminUsers.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type {
  ListUsersQuery,
  UpdateUserRoleBody,
  UpdateUserStatusBody,
  UserIdParams,
} from '../../validators/admin.validator'

/** Every handler below requires `req.user` — guaranteed by `authenticate` +
 * `authorizeRoles` already mounted ahead of these on every `/admin/*` route
 * (`routes/admin/index.ts`), so the `if (!req.user)` check here is
 * defensive typing, not a real runtime path. The JWT carries no `email`
 * claim (`types/jwt.types.ts`), so the service layer resolves the actor's
 * current email itself before writing an audit entry, rather than trusting
 * a claim that isn't there. */
function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { search, role, status, subscriptionTier, page, limit } =
    req.query as unknown as ListUsersQuery
  const result = await adminUsersService.listUsers(
    { search, role, status, subscriptionTier },
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

export async function getUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as unknown as UserIdParams
  const user = await adminUsersService.getUserById(userId)
  sendSuccess(res, user)
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { userId } = req.params as unknown as UserIdParams
  const { status } = req.body as UpdateUserStatusBody
  const user = await adminUsersService.updateUserStatus(actor, userId, status)
  sendSuccess(res, user)
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const { userId } = req.params as unknown as UserIdParams
  const { role } = req.body as UpdateUserRoleBody
  const user = await adminUsersService.updateUserRole(actor, userId, role)
  sendSuccess(res, user)
}
