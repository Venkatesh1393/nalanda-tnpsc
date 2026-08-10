import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, UserPlus, X } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createInvite,
  listInvites,
  revokeInvite,
  type AdminInvite,
} from '@/services/adminService'
import type { AdminRole } from '@/types/auth'

const INVITABLE_ROLES: AdminRole[] = [
  'moderator',
  'content_editor',
  'admin',
  'support',
  'super_admin',
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
 * "Register account for new admins" (Step 52 follow-up) — visible only to
 * `super_admin` (the backend independently enforces this on every call
 * here, not just this UI check). Two outcomes surface directly in the
 * result message: the email already had an account and was promoted
 * immediately, or a pending invite was created that applies the moment
 * that email first signs in (Google or Email/Password, either app).
 */
export function InviteAdminCard() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('content_editor')
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const { data: pendingInvites, isPending } = useQuery({
    queryKey: ['admin', 'invites', 'pending'],
    queryFn: () => listInvites('pending'),
  })

  const createMutation = useMutation({
    mutationFn: () => createInvite(email.trim(), role),
    onSuccess: (result) => {
      setResultMessage(
        result.outcome === 'role_applied_immediately'
          ? `${result.user.email} already had an account — role changed to "${result.user.role.replace('_', ' ')}" immediately.`
          : `Invite created for ${result.invite.email}. Their role will apply automatically the first time they sign in.`,
      )
      setEmail('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  })

  function handleSubmit() {
    setResultMessage(null)
    createMutation.mutate()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Invite Admin</CardTitle>
        <Button
          size="sm"
          variant={formOpen ? 'ghost' : 'default'}
          onClick={() => {
            setFormOpen((v) => !v)
            setResultMessage(null)
          }}
        >
          {formOpen ? (
            <>
              <X /> Cancel
            </>
          ) : (
            <>
              <UserPlus /> Invite Admin
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formOpen && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="newadmin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-44">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending}
              disabled={!email.trim()}
            >
              Send Invite
            </Button>
          </div>
        )}

        {resultMessage && (
          <p className="bg-success/10 text-success rounded-md p-2.5 text-xs">
            {resultMessage}
          </p>
        )}
        {createMutation.isError && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-xs">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Could not create the invite.'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">Pending Invites</p>
          {isPending ? (
            <Skeleton className="h-9 w-full" />
          ) : !pendingInvites || pendingInvites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending invites.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pendingInvites.map((invite: AdminInvite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{invite.email}</span>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {invite.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatDate(invite.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={
                        revokeMutation.isPending && revokeMutation.variables === invite.id
                      }
                      onClick={() => revokeMutation.mutate(invite.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
