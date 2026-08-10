import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { MeResponse, UpdateMePayload, UpdatePreferencesPayload } from '@/types/user'

/**
 * The real User/Profile domain facade (Step 44 §A/§C) — backed by
 * `backend/src/routes/user.routes.ts`. Every function unwraps the
 * `{success, data, error}` envelope (docs/API.md §0), the same pattern
 * `services/authService.ts`'s `establishBackendSession` already set.
 */

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<{ data: MeResponse }>(endpoints.users.me)
  return response.data.data
}

export async function updateMe(patch: UpdateMePayload): Promise<MeResponse> {
  const response = await apiClient.patch<{ data: MeResponse }>(endpoints.users.me, patch)
  return response.data.data
}

export async function updatePreferences(
  patch: UpdatePreferencesPayload,
): Promise<MeResponse> {
  const response = await apiClient.patch<{ data: MeResponse }>(
    endpoints.users.preferences,
    patch,
  )
  return response.data.data
}
