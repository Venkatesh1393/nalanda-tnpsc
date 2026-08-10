import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  ListChecks,
  Newspaper,
  Sparkles,
  Timer,
  Users,
  UserCheck,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/services/adminService'

const STAT_TILES: {
  key: keyof Awaited<ReturnType<typeof getDashboardStats>>
  label: string
  icon: typeof Users
}[] = [
  { key: 'totalStudents', label: 'Total Students', icon: Users },
  { key: 'activeStudents', label: 'Active Students', icon: UserCheck },
  { key: 'premiumStudents', label: 'Premium Students', icon: Sparkles },
  { key: 'questions', label: 'Questions', icon: ListChecks },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'topics', label: 'Topics', icon: Layers },
  { key: 'lessons', label: 'Lessons', icon: FileText },
  { key: 'practiceSessions', label: 'Practice Sessions', icon: GraduationCap },
  { key: 'weeklyExams', label: 'Weekly Exams', icon: Timer },
  { key: 'currentAffairs', label: 'Current Affairs', icon: Newspaper },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Step 52's Admin Dashboard — every number here is a real, live
 * `countDocuments()` from `GET /admin/dashboard`
 * (`backend/src/services/admin/adminDashboard.service.ts`), never a
 * fabricated placeholder value.
 */
export function DashboardPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboardStats,
  })

  if (isError) {
    return (
      <ErrorState title="Couldn't load dashboard stats" onRetry={() => void refetch()} />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Real-time platform totals, computed live from MongoDB.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_TILES.map((tile) => (
          <Card key={tile.key}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <tile.icon className="size-3.5" aria-hidden="true" />
                {tile.label}
              </div>
              {isPending || !data ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-xl font-semibold tabular-nums">
                  {data[tile.key] as number}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : data.recentRegistrations.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm sm:p-5">
              No registrations yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Email</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Tier</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRegistrations.map((registration) => (
                    <tr key={registration.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium sm:px-5">
                        {registration.name}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {registration.email}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {registration.subscriptionTier}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {formatDate(registration.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
