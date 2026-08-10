import { Navigate, Outlet } from 'react-router-dom'

import { Spinner } from '@/components/spinner'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'
import { ADMIN_ACCESS_ROLES } from '@/types/auth'

/**
 * The frontend half of "students must NEVER access admin routes" (Step 52).
 * This is a UX convenience only — the real, authoritative boundary is the
 * backend's `authenticate` + `authorizeRoles(...ADMIN_ACCESS_ROLES)` gate on
 * every `/admin/*` API route (`backend/src/routes/admin/index.ts`), which
 * holds regardless of whether this component renders, has a bug, or is
 * bypassed entirely — every data-fetching call this app makes still 401s/
 * 403s against a plain `user` (student) token no matter what this guard
 * does. Waits for `isInitializing` so a page reload never flashes the
 * login screen before a silent-refresh attempt has had a chance to
 * restore an already-valid session.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isInitializing, user } = useAuth()

  if (isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!ADMIN_ACCESS_ROLES.includes(user.role)) {
    return <Navigate to={ROUTES.accessDenied} replace />
  }

  return <Outlet />
}

/** Guards `/login` itself — an already-authenticated, already-admin-staff
 * user shouldn't see the login screen again. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing, user } = useAuth()

  if (isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isAuthenticated && user && ADMIN_ACCESS_ROLES.includes(user.role)) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
