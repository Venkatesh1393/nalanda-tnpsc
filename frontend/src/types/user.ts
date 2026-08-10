/**
 * The real `GET /users/me` response shape (Step 44 §A,
 * `backend/src/services/user.service.ts`'s `MeDTO`) — distinct from
 * `types/profile.ts`'s `UserProfile`, which is the older, still-mocked
 * Settings-module shape (`services/profileService.ts`). Kept separate
 * rather than merged so migrating Settings off the mock later is a
 * contained, one-file change instead of a type-shape negotiation.
 */
export type MeResponse = {
  id: string
  name: string
  email: string
  firebaseUid: string
  avatarUrl: string | null
  role: 'user' | 'moderator' | 'content_editor' | 'admin' | 'support'
  subscriptionTier: 'free' | 'plus' | 'pro' | 'institutional'
  status: 'active' | 'suspended' | 'deleted'
  languagePreference: 'ta' | 'en' | 'bilingual'
  theme: 'light' | 'dark' | 'system'
  notificationPreferences: {
    examReminder: boolean
    studyReminder: boolean
    premiumUpdate: boolean
    currentAffairsAlert: boolean
  }
  onboardingCompleted: boolean
  createdAt: string | null
  lastLoginAt: string | null
}

export type UpdateMePayload = Partial<{
  name: string
  avatarUrl: string | null
  languagePreference: 'ta' | 'en' | 'bilingual'
}>

export type UpdatePreferencesPayload = Partial<{
  theme: 'light' | 'dark' | 'system'
  notificationPreferences: Partial<MeResponse['notificationPreferences']>
}>
