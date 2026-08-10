import { ShieldX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

/**
 * Reached when an authenticated, non-admin-staff account (a plain `user` /
 * student) is redirected here by `ProtectedRoute` — the frontend-visible
 * side of Step 52's "students must NEVER access admin routes" requirement.
 * Every underlying API call would also independently 403 even without this
 * page existing (backend/src/routes/admin/index.ts) — this is purely the
 * honest, dead-end message a denied visitor should see instead of a blank
 * or broken screen.
 */
export function AccessDeniedPage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
        <ShieldX className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">
          You don't have access to the Admin Panel
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          {user
            ? `${user.email} is signed in with a student account. Admin access requires a staff role.`
            : 'Admin access requires a staff role.'}
        </p>
      </div>
      <Button variant="outline" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  )
}
