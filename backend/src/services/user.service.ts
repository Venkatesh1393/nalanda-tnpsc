import type { ProfileDocument } from '../models/Profile.model'
import type { UserDocument } from '../models/User.model'
import * as profileRepository from '../repositories/profile.repository'
import * as userRepository from '../repositories/user.repository'
import * as cloudinaryUploadService from './media/cloudinaryUpload.service'
import { ApiError } from '../utils/ApiError'
import type { UpdateMeBody, UpdatePreferencesBody } from '../validators/user.validator'

/** The full `GET /users/me` shape (Step 44 §A) — never the raw Mongoose
 * documents. Combines the hot-path `User` (identity/claims) with the richer
 * `Profile` (name/avatar/onboarding/preferences) into one response so the
 * frontend doesn't need two round-trips for "who is this user." */
export interface MeDTO {
  id: string
  name: string
  email: string
  firebaseUid: string
  avatarUrl: string | null
  role: UserDocument['role']
  subscriptionTier: UserDocument['subscriptionTier']
  status: UserDocument['status']
  languagePreference: UserDocument['languagePreference']
  theme: ProfileDocument['theme']
  notificationPreferences: ProfileDocument['notificationPreferences']
  onboardingCompleted: boolean
  createdAt: Date | null
  lastLoginAt: Date | null
}

function toMeDTO(user: UserDocument, profile: ProfileDocument): MeDTO {
  return {
    id: user.id,
    name: profile.name,
    email: user.email,
    firebaseUid: user.firebaseUid,
    avatarUrl: profile.photoUrl ?? null,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    status: user.status,
    languagePreference: user.languagePreference,
    theme: profile.theme,
    notificationPreferences: profile.notificationPreferences,
    onboardingCompleted: profile.onboarding.completed,
    createdAt: user.createdAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  }
}

async function loadUserAndProfile(
  userId: string,
): Promise<{ user: UserDocument; profile: ProfileDocument }> {
  const [user, profile] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId),
  ])
  if (!user) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.')
  }
  if (!profile) {
    // Every user is created together with a Profile in the same
    // find-or-create call (services/auth/userSync.service.ts) — a missing
    // profile means data corruption, not a normal "not found" case.
    throw ApiError.internal('Profile record is missing for this account.')
  }
  return { user, profile }
}

export async function getMe(userId: string): Promise<MeDTO> {
  const { user, profile } = await loadUserAndProfile(userId)
  return toMeDTO(user, profile)
}

export async function updateMe(userId: string, patch: UpdateMeBody): Promise<MeDTO> {
  const { name, languagePreference } = patch

  await Promise.all([
    name !== undefined ? profileRepository.updateBasicInfo(userId, { name }) : null,
    languagePreference !== undefined
      ? userRepository.updateLanguagePreference(userId, languagePreference)
      : null,
  ])

  return getMe(userId)
}

const AVATAR_FOLDER = 'nalanda/avatars'

/** Uploads a new avatar (`POST /users/me/avatar`), replacing whatever was
 * there before. Uses a deterministic Cloudinary `public_id` (the user's own
 * id) so repeated "change photo" clicks overwrite the same asset in place
 * rather than accumulating orphaned versions — the old-asset delete below is
 * therefore just cleanup for the *previous* upload flow (URL-set avatars, or
 * assets from before this pattern existed), not the common case. */
export async function uploadAvatar(
  userId: string,
  file: Express.Multer.File,
): Promise<MeDTO> {
  const { profile } = await loadUserAndProfile(userId)
  const previousPublicId = profile.photoPublicId

  const uploaded = await cloudinaryUploadService.uploadBuffer(file.buffer, {
    folder: AVATAR_FOLDER,
    resourceType: 'image',
    publicId: userId,
  })

  await profileRepository.updateAvatar(userId, {
    photoUrl: uploaded.secureUrl,
    photoPublicId: uploaded.publicId,
  })

  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    await cloudinaryUploadService.deleteAsset(previousPublicId, 'image')
  }

  return getMe(userId)
}

/** Removes the avatar (`DELETE /users/me/avatar`) — deletes the Cloudinary
 * asset (if this app ever uploaded one; a Google-synced `photoUrl` has no
 * `photoPublicId` and is simply cleared) and clears both fields. */
export async function removeAvatar(userId: string): Promise<MeDTO> {
  const { profile } = await loadUserAndProfile(userId)

  if (profile.photoPublicId) {
    await cloudinaryUploadService.deleteAsset(profile.photoPublicId, 'image')
  }

  await profileRepository.clearAvatar(userId)
  return getMe(userId)
}

export async function updatePreferences(
  userId: string,
  patch: UpdatePreferencesBody,
): Promise<MeDTO> {
  const { theme, notificationPreferences } = patch

  await Promise.all([
    theme !== undefined ? profileRepository.updateTheme(userId, theme) : null,
    notificationPreferences !== undefined
      ? profileRepository.updateNotificationPreferences(userId, notificationPreferences)
      : null,
  ])

  return getMe(userId)
}
