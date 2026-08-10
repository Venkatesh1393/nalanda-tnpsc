import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { getUser, updateUserRole, updateUserStatus } from '@/services/adminService'
import type { AdminRole } from '@/types/auth'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  suspended: 'warning',
  deleted: 'destructive',
}

const ALL_ROLES: AdminRole[] = [
  'user',
  'moderator',
  'content_editor',
  'admin',
  'support',
  'super_admin',
]

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * View + manage a single account. Status changes are available to
 * `admin`/`moderator`/`super_admin`; role changes are restricted in this UI
 * to `super_admin` (Step 52's explicit requirement) — but the real
 * enforcement is server-side (`backend/src/routes/admin/users.routes.ts`),
 * so hiding the control here is a UX nicety, never the security boundary.
 */
export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user: actingAdmin } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: user,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => getUser(userId!),
    enabled: Boolean(userId),
  })

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'suspended') => updateUserStatus(userId!, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const roleMutation = useMutation({
    mutationFn: (role: AdminRole) => updateUserRole(userId!, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const canChangeRole = actingAdmin?.role === 'super_admin' && actingAdmin.id !== userId
  const canChangeStatus =
    actingAdmin?.role === 'admin' ||
    actingAdmin?.role === 'moderator' ||
    actingAdmin?.role === 'super_admin'

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={ROUTES.users}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to Users
      </Link>

      {isError ? (
        <ErrorState title="Couldn't load this user" onRetry={() => void refetch()} />
      ) : isPending || !user ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{user.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Email</span>
                <span>{user.email}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge variant={STATUS_BADGE[user.status]} className="w-fit capitalize">
                  {user.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Role</span>
                <span className="capitalize">{user.role.replace('_', ' ')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Subscription Tier</span>
                <span className="capitalize">{user.subscriptionTier}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Joined</span>
                <span>{formatDateTime(user.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Last Login</span>
                <span>{formatDateTime(user.lastLoginAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2.5">
              {canChangeStatus ? (
                <>
                  <Button
                    variant={user.status === 'active' ? 'outline' : 'default'}
                    size="sm"
                    disabled={user.status === 'active' || statusMutation.isPending}
                    loading={
                      statusMutation.isPending && statusMutation.variables === 'active'
                    }
                    onClick={() => statusMutation.mutate('active')}
                  >
                    Reactivate
                  </Button>
                  <Button
                    variant={user.status === 'suspended' ? 'outline' : 'destructive'}
                    size="sm"
                    disabled={user.status === 'suspended' || statusMutation.isPending}
                    loading={
                      statusMutation.isPending && statusMutation.variables === 'suspended'
                    }
                    onClick={() => statusMutation.mutate('suspended')}
                  >
                    Suspend
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Your role doesn't permit changing account status.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2.5">
              {canChangeRole ? (
                <Select
                  className="w-52"
                  value={user.role}
                  disabled={roleMutation.isPending}
                  onChange={(e) => roleMutation.mutate(e.target.value as AdminRole)}
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {actingAdmin?.id === userId
                    ? 'You cannot change your own role.'
                    : 'Only Super Admins can change a role.'}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(ROUTES.users)}
      >
        Done
      </Button>
    </div>
  )
}
