import type { auth } from 'firebase-admin'

import type { AuthProvider } from '../../constants/user'
import type { UserDocument } from '../../models/User.model'
import * as adminInviteRepository from '../../repositories/adminInvite.repository'
import * as profileRepository from '../../repositories/profile.repository'
import * as userRepository from '../../repositories/user.repository'
import { logger } from '../../config/logger'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'

export interface SyncResult {
  user: UserDocument
  isNewUser: boolean
}

/**
 * Phase 3 of Sprint 3's Firebase step: Firebase is identity, MongoDB is the
 * application's system of record. Given an already-verified Firebase ID
 * token, finds the corresponding Nalanda `User` (+ `Profile` on first
 * creation) or creates one — never stores a password anywhere in MongoDB
 * (there isn't one to store; Firebase never gives the backend one).
 */
export async function findOrCreateUserFromFirebase(
  decoded: auth.DecodedIdToken,
  authProvider: AuthProvider,
): Promise<SyncResult> {
  const existingByUid = await userRepository.findByFirebaseUid(decoded.uid)
  if (existingByUid) {
    return { user: existingByUid, isNewUser: false }
  }

  if (!decoded.email) {
    // Google/Email-Password both always carry a verified email; this is a
    // defensive guard against a malformed/unexpected token shape, not an
    // expected path.
    throw ApiError.badRequest('This sign-in method did not provide an email address.')
  }

  // docs/Authentication.md §3 — same-email account linking. In practice
  // Firebase's own default "one account per email" project setting already
  // prevents two different Firebase UIDs from sharing an email, so this
  // branch mostly guards a defensive edge case (e.g. that setting was
  // changed) rather than the common path. A `User` has a single
  // `firebaseUid` field, not a list — this signs the caller into the
  // existing Mongo account without overwriting it, but does not merge
  // multi-provider identities at the Firebase layer itself.
  const existingByEmail = await userRepository.findByEmail(decoded.email)
  if (existingByEmail) {
    logger.warn('Firebase UID mismatch for an existing email — linking by email', {
      userId: existingByEmail.id,
    })
    return { user: existingByEmail, isNewUser: false }
  }

  // Sprint 4 Step 52 — "register account for new admins": a `super_admin`
  // may invite an email to receive an admin-staff role before that email
  // has ever signed in anywhere. The moment it does — Google or
  // Email/Password, on either `frontend/` or `admin/`, since both share
  // this one find-or-create path — the invite is atomically consumed and
  // the new `User` gets the invited role instead of the schema default
  // (`user`). An email with no pending invite is completely unaffected.
  const consumedInvite = await adminInviteRepository.consumePendingByEmail(decoded.email)

  const user = await userRepository.create({
    firebaseUid: decoded.uid,
    email: decoded.email,
    authProvider,
    ...(consumedInvite && { role: consumedInvite.role }),
  })

  await profileRepository.create({
    userId: user._id,
    name: decoded.name ?? decoded.email.split('@')[0] ?? 'Aspirant',
    photoUrl: decoded.picture,
  })

  if (consumedInvite) {
    logger.info('Admin invite consumed on first sign-in', {
      userId: user.id,
      role: consumedInvite.role,
    })
    await auditLogService.recordAction(
      { id: user.id, email: user.email, role: user.role },
      'admin.invite.consumed',
      'User',
      user.id,
      { role: consumedInvite.role, inviteId: consumedInvite.id },
    )
  }

  return { user, isNewUser: true }
}
