import * as adminStatsRepository from '../../repositories/adminStats.repository'
import * as profileRepository from '../../repositories/profile.repository'
import * as userRepository from '../../repositories/user.repository'

const RECENT_REGISTRATIONS_LIMIT = 10

export interface AdminDashboardStatsDTO {
  totalStudents: number
  activeStudents: number
  premiumStudents: number
  questions: number
  subjects: number
  topics: number
  lessons: number
  practiceSessions: number
  weeklyExams: number
  currentAffairs: number
  recentRegistrations: {
    id: string
    name: string
    email: string
    subscriptionTier: string
    createdAt: Date | null
  }[]
}

/**
 * Assembles the Admin Dashboard's real, live-counted KPI set (Step 52).
 * `recentRegistrations` joins `User` (identity/date) with `Profile` (display
 * name) in one batched lookup — the same `findByUserIds` batch pattern
 * `services/leaderboard.service.ts` already established, avoiding an N+1
 * query for what could otherwise be up to 10 sequential `Profile` reads.
 */
export async function getDashboardStats(): Promise<AdminDashboardStatsDTO> {
  const [counts, recentUsers] = await Promise.all([
    adminStatsRepository.getPlatformCounts(),
    userRepository.findRecentStudentRegistrations(RECENT_REGISTRATIONS_LIMIT),
  ])

  const profiles = await profileRepository.findByUserIds(
    recentUsers.map((user) => user.id),
  )
  const nameByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.name]),
  )

  return {
    ...counts,
    recentRegistrations: recentUsers.map((user) => ({
      id: user.id,
      name: nameByUserId.get(user.id) ?? user.email,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt ?? null,
    })),
  }
}
