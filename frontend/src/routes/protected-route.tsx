import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { PageLoader } from '@/components/page-loader'
import { ROUTES } from '@/constants/routes'
import { GlobalSearch } from '@/features/search/components/global-search'
import { useAuth } from '@/hooks/use-auth'

/**
 * Gates every route nested under it (docs/InformationArchitecture.md's
 * authenticated Student Dashboard shell) behind a signed-in session.
 * Redirects to Login with the attempted location in `state.from`, so Login
 * can send the user back where they meant to go after verifying — never
 * silently drop them on the Dashboard instead.
 *
 * Also mounts `GlobalSearch` (Sprint 4 Step 63) once here, alongside the
 * routed page — this is the one wrapper every authenticated page already
 * passes through, so it's the natural home for a Cmd/Ctrl+K overlay until
 * a real persistent top-bar shell exists (`docs/InformationArchitecture.md`
 * §4, still `MASTER_ROADMAP.md` Phase 7).
 */
export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <PageLoader label="Checking your session" />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  return (
    <>
      <GlobalSearch />
      <Outlet />
    </>
  )
}
