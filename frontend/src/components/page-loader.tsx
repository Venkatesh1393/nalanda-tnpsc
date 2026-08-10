import { Spinner } from '@/components/spinner'

/**
 * Sprint 4 Step 67 — the full-viewport centered spinner used anywhere a
 * whole page/route is still resolving (an auth check, or now a lazy-loaded
 * route chunk still downloading — see `routes/app-routes.tsx`'s
 * `<Suspense>` boundary). Extracted from `routes/protected-route.tsx`'s
 * inline session-check loader so both call sites share one implementation
 * instead of two copies of the same markup drifting apart.
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  )
}
