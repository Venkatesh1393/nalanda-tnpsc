import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { InviteAdminCard } from '@/components/invite-admin-card'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import {
  listUsers,
  type AdminUserSummary,
  type UserListFilter,
} from '@/services/adminService'

const STATUS_BADGE: Record<
  AdminUserSummary['status'],
  'success' | 'warning' | 'destructive'
> = {
  active: 'success',
  suspended: 'warning',
  deleted: 'destructive',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * User listing/search/filter/pagination (Step 52's User Management
 * requirement) — `GET /admin/users` is real, backed by MongoDB, gated to
 * `admin`/`support`/`super_admin` server-side (a `moderator`/
 * `content_editor` account that somehow reached this page would get a real
 * 403 from every call here, not just a hidden button).
 */
export function UsersListPage() {
  const { user: actingAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserListFilter['role'] | ''>('')
  const [status, setStatus] = useState<UserListFilter['status'] | ''>('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', { search, role, status, page }],
    queryFn: () =>
      listUsers({
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Search, filter, and manage every account.
        </p>
      </div>

      {actingAdmin?.role === 'super_admin' && <InviteAdminCard />}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by email..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
        </div>
        <Select
          className="sm:w-40"
          value={role}
          onChange={(e) => {
            setPage(1)
            setRole(e.target.value as UserListFilter['role'])
          }}
        >
          <option value="">All roles</option>
          <option value="user">Student</option>
          <option value="moderator">Moderator</option>
          <option value="content_editor">Content Editor</option>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
          <option value="super_admin">Super Admin</option>
        </Select>
        <Select
          className="sm:w-36"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as UserListFilter['status'])
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load users" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No users match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Email</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Role</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Tier</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">
                        <Link to={ROUTES.userDetail(user.id)} className="hover:underline">
                          {user.name}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {user.email}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {user.role.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge variant={STATUS_BADGE[user.status]} className="capitalize">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {user.subscriptionTier}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
