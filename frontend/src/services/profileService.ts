import { NOTIFICATION_CATEGORIES } from '@/constants/notifications'
import type { NotificationCategoryId } from '@/types/notifications'
import type { SecuritySession, UserProfile } from '@/types/profile'

/**
 * Mocked Profile/Settings domain calls (docs/InformationArchitecture.md
 * §7.5) — no backend exists yet (docs/MASTER_ROADMAP.md Phase 5), so
 * editable state lives in `localStorage`, the same pattern every other
 * module's mock service uses. Deliberately **not** synced with
 * `providers/auth-provider.tsx`'s `AuthUser` — editing your name here
 * doesn't update the Dashboard's separate "Kalaivani" mock greeting,
 * mirroring the exact kind of disconnected-mock-worlds boundary
 * `services/practiceSessionService.ts`'s XP/Coins ledger already has with
 * Dashboard's own numbers; wiring these together is real work that belongs
 * to whichever session adds real backend-issued sessions.
 */

const PROFILE_KEY = 'nalanda-profile'
const NOTIFICATION_PREFS_KEY = 'nalanda-notification-preferences'
const REVOKED_SESSIONS_KEY = 'nalanda-revoked-sessions'

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const DEFAULT_PROFILE: UserProfile = {
  // Matches `services/dashboardService.ts`'s `getDashboardSummary` mock
  // user, the same "shared mock world" precedent `services/learnService.ts`
  // set for content names.
  name: 'Kalaivani',
  email: 'kalaivani@example.com',
  avatarUrl: null,
  examGoalLabel: 'Group 4',
  memberSince: '2026-04-12',
}

function readProfile(): UserProfile {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return DEFAULT_PROFILE
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) }
  } catch {
    return DEFAULT_PROFILE
  }
}

function writeProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export async function getProfile(): Promise<UserProfile> {
  return delay(readProfile(), 400)
}

export async function updateProfile(
  patch: Partial<Pick<UserProfile, 'name' | 'email'>>,
): Promise<UserProfile> {
  const next = { ...readProfile(), ...patch }
  writeProfile(next)
  return delay(next, 400)
}

/** Reads the file locally (no Cloudinary integration exists yet) and stores
 * it as a `data:` URL — pass `null` to remove the avatar. */
export async function updateAvatar(dataUrl: string | null): Promise<UserProfile> {
  const next = { ...readProfile(), avatarUrl: dataUrl }
  writeProfile(next)
  return delay(next, 500)
}

// ---- Notification preferences (Settings' own tab — distinct from the
// Notification Center list at services/notificationsService.ts) ----

type NotificationPreferences = Record<NotificationCategoryId, boolean>

function defaultNotificationPreferences(): NotificationPreferences {
  return Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [category.id, true]),
  ) as NotificationPreferences
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
  if (!raw) return delay(defaultNotificationPreferences(), 350)
  try {
    return delay(
      {
        ...defaultNotificationPreferences(),
        ...(JSON.parse(raw) as NotificationPreferences),
      },
      350,
    )
  } catch {
    return delay(defaultNotificationPreferences(), 350)
  }
}

export async function setNotificationPreference(
  category: NotificationCategoryId,
  enabled: boolean,
): Promise<void> {
  const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
  let current: NotificationPreferences
  try {
    current = raw
      ? {
          ...defaultNotificationPreferences(),
          ...(JSON.parse(raw) as NotificationPreferences),
        }
      : defaultNotificationPreferences()
  } catch {
    current = defaultNotificationPreferences()
  }
  current[category] = enabled
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(current))
  await delay(undefined, 200)
}

// ---- Security — Account Recovery (docs/Authentication.md §8/§10). This is
// a passwordless system, so there is no "change password" here; Active
// Sessions + "log out of all other devices" is what replaces it. ----

const SEED_SESSIONS: SecuritySession[] = [
  {
    id: 'session-current',
    deviceLabel: 'Chrome on Windows',
    location: 'Chennai, Tamil Nadu',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 'session-2',
    deviceLabel: 'Chrome on Android',
    location: 'Chennai, Tamil Nadu',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    isCurrent: false,
  },
  {
    id: 'session-3',
    deviceLabel: 'Safari on iPhone',
    location: 'Coimbatore, Tamil Nadu',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    isCurrent: false,
  },
]

function readRevokedSessionIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REVOKED_SESSIONS_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export async function getSecuritySessions(): Promise<SecuritySession[]> {
  const revoked = readRevokedSessionIds()
  return delay(
    SEED_SESSIONS.filter((s) => !revoked.includes(s.id)),
    400,
  )
}

export async function revokeSession(id: string): Promise<void> {
  const revoked = readRevokedSessionIds()
  if (!revoked.includes(id)) {
    localStorage.setItem(REVOKED_SESSIONS_KEY, JSON.stringify([...revoked, id]))
  }
  await delay(undefined, 300)
}

/** Mirrors `POST /auth/logout-all` (docs/Authentication.md §8/§10) —
 * revokes every session except the current one; the current session's own
 * logout is handled separately by `useAuth().logout()`. */
export async function logoutAllOtherDevices(): Promise<void> {
  const otherIds = SEED_SESSIONS.filter((s) => !s.isCurrent).map((s) => s.id)
  localStorage.setItem(REVOKED_SESSIONS_KEY, JSON.stringify(otherIds))
  await delay(undefined, 400)
}

// ---- Privacy & Data (docs/InformationArchitecture.md §7.5, DPDP Act) ----

/** No doc specifies a real turnaround time for this (a disclosed, open gap
 * — see docs/PROJECT_CONTEXT.md §13), so this deliberately doesn't invent
 * one; the caller shows a generic "we'll email you" confirmation instead
 * of a fabricated SLA. */
export async function requestDataExport(): Promise<void> {
  await delay(undefined, 500)
}

export async function requestAccountDeletion(): Promise<void> {
  await delay(undefined, 500)
}
