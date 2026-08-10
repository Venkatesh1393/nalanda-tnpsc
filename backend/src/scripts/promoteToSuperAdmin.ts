import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { ADMIN_ACCESS_ROLES, ROLES, type Role } from '../constants/roles'
import * as auditLogService from '../services/auditLog.service'
import * as userRepository from '../repositories/user.repository'

/**
 * One-time (or occasional) bootstrap tool: `npm run promote:super-admin -- <email> [role]`.
 *
 * Solves a real chicken-and-egg problem in Step 52's design — the in-app
 * "Invite Admin" flow (`services/admin/adminInvites.service.ts`) is
 * deliberately `super_admin`-only, so it cannot create the *first*
 * `super_admin` on a fresh environment; something outside the app has to.
 * This script is that "something," using the exact same
 * `userRepository.updateRole` + `auditLogService.recordAction` calls the
 * real in-app role-change endpoint uses, so a bootstrap promotion is
 * recorded in the audit log exactly like any other role change — never a
 * silent, unaccountable database edit.
 *
 * Intentionally requires the target account to already exist (register
 * normally first, via Google or Email/Password, on either app) — this
 * script only ever changes a `role` field, it never creates a Firebase
 * identity or a password.
 */
async function main() {
  const [, , emailArg, roleArg] = process.argv
  if (!emailArg) {
    console.error(
      'Usage: npm run promote:super-admin -- <email> [role]\n' +
        `  role defaults to "super_admin"; must be one of: ${ADMIN_ACCESS_ROLES.join(', ')}`,
    )
    process.exitCode = 1
    return
  }

  const role = (roleArg ?? 'super_admin') as Role
  if (!ROLES.includes(role) || role === 'user') {
    console.error(
      `Invalid role "${role}". Must be one of: ${ADMIN_ACCESS_ROLES.join(', ')}`,
    )
    process.exitCode = 1
    return
  }

  const email = emailArg.toLowerCase().trim()

  await connectDatabase()
  try {
    const user = await userRepository.findByEmail(email)
    if (!user) {
      console.error(
        `No account found for ${email}. Register it first (Google or Email/Password, ` +
          `on either frontend/ or admin/), then re-run this script.`,
      )
      process.exitCode = 1
      return
    }

    const previousRole = user.role
    if (previousRole === role) {
      logger.info(`${email} already has role "${role}" — nothing to do.`)
      return
    }

    const updated = await userRepository.updateRole(user.id, role)
    if (!updated) {
      throw new Error('Role update failed unexpectedly.')
    }

    await auditLogService.recordAction(
      { id: user.id, email: user.email, role },
      'user.role.update',
      'User',
      user.id,
      { previousRole, newRole: role, via: 'bootstrap_script' },
    )

    logger.info(`Promoted ${email}: ${previousRole} -> ${role}`, { userId: user.id })
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('promoteToSuperAdmin failed', { error })
  process.exitCode = 1
})
