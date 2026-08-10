import { Bell, Menu, Search } from 'lucide-react'

import { ProfileMenu } from '@/components/layout/profile-menu'

type TopbarProps = {
  onOpenMobileMenu: () => void
}

/** Top navigation bar — global search (placeholder, per Step 52's scope:
 * no search backend exists yet), a notifications bell (placeholder — the
 * Admin Panel has no notification source of its own yet, distinct from the
 * Student Web App's real Notifications module), and the profile menu. */
export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  return (
    <header className="bg-background/95 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
        className="hover:bg-muted flex size-8 items-center justify-center rounded-md lg:hidden"
      >
        <Menu className="size-4.5" aria-hidden="true" />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search users, questions, content..."
          disabled
          title="Global search is not wired up yet"
          className="border-input bg-muted/40 text-muted-foreground placeholder:text-muted-foreground h-8 w-full rounded-lg border pr-3 pl-8 text-sm outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          disabled
          title="Notifications are not wired up yet"
          aria-label="Notifications"
          className="text-muted-foreground flex size-8 items-center justify-center rounded-md"
        >
          <Bell className="size-4.5" aria-hidden="true" />
        </button>
        <ProfileMenu />
      </div>
    </header>
  )
}
