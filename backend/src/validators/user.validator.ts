import { z } from 'zod'

import { LANGUAGE_PREFERENCES } from '../constants/user'

/** Body shape for `PATCH /users/me` (Step 44 §A) — every field optional
 * (partial update), but at least one must be present so an empty PATCH is
 * rejected rather than silently doing nothing. `name` lives on `Profile`;
 * `languagePreference` lives on `User` — the service layer routes each to
 * its own repository.
 *
 * Deliberately excludes `avatarUrl` (Step 44 originally accepted an
 * arbitrary client-supplied URL string here) — Sprint 3 Step 50 replaced
 * that with a real upload path (`POST`/`DELETE /users/me/avatar`,
 * `middleware/upload.middleware.ts` + `services/media/`) that actually
 * validates MIME type/extension/size and stores the file through
 * Cloudinary, rather than trusting the client to hand back a pre-hosted
 * URL of unknown/unvalidated origin. */
export const updateMeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name is too long')
      .optional(),
    languagePreference: z.enum(LANGUAGE_PREFERENCES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  })

export type UpdateMeBody = z.infer<typeof updateMeSchema>

/** Body shape for `PATCH /users/me/preferences` (Step 44 §C) — theme and/or
 * a partial notification-preferences patch. */
export const updatePreferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notificationPreferences: z
      .object({
        examReminder: z.boolean().optional(),
        studyReminder: z.boolean().optional(),
        premiumUpdate: z.boolean().optional(),
        currentAffairsAlert: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  })

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesSchema>
