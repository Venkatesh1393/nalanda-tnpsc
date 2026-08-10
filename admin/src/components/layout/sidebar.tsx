import { ShieldCheck, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { NAV_ITEMS } from '@/constants/navigation'
import { cn } from '@/lib/utils'

type SidebarProps = {
  /** Mobile drawer open/close — the sidebar is a fixed rail on desktop
   * (`lg:` and up) and a slide-over drawer below that breakpoint. */
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold">Nalanda Admin</span>
      </div>
      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5"
        aria-label="Admin"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="bg-sidebar border-sidebar-border hidden w-60 shrink-0 border-r lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="bg-sidebar border-sidebar-border absolute inset-y-0 left-0 w-64 border-r shadow-lg">
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="hover:bg-muted absolute top-3 right-3 flex size-7 items-center justify-center rounded-md"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={onMobileClose} />
          </div>
        </div>
      )}
    </>
  )
}
