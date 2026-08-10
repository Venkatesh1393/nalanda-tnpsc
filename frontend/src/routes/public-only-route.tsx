import { Navigate, Outlet } from 'react-router-dom'

import { PageLoader } from '@/components/page-loader'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'

/**
 * The inverse of `ProtectedRoute` — gates Login/Register/Verify Email so an
 * already-signed-in visitor is bounced straight to the Dashboard instead of
 * seeing an auth form again (docs/UserJourney.md's cross-cutting standards
 * imply this, and it's standard practice everywhere else too).
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return <PageLoader label="Loading" />
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
