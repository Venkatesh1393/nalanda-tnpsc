import { Construction } from 'lucide-react'

type PlaceholderPageProps = {
  title: string
}

/**
 * Step 52 is explicitly the Admin Portal *foundation* — Content, Questions,
 * Exams, Current Affairs, Live Exams, Subscriptions, Analytics, and Settings
 * management all get a real route and a place in the sidebar (per the
 * requested route list) but no backend/CRUD yet (bulk question upload is
 * explicitly out of scope for this step, and the rest follow the same
 * "foundation first" boundary). An honest "coming soon" state, never
 * fabricated data standing in for a feature that doesn't exist yet.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Construction className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{title} management is coming soon</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            This section is scaffolded as part of the Admin Portal foundation — the real
            backend and CRUD screens land in a later Sprint 4 step.
          </p>
        </div>
      </div>
    </div>
  )
}
