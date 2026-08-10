import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** A small, hand-rolled dropdown (click-outside-to-close) — no Radix
 * dependency for this foundation app's one menu. */
export function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-1.5"
      >
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold">
          {initials(user.name) || user.email[0]?.toUpperCase()}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">{user.name}</span>
          <span className="text-muted-foreground block text-xs leading-tight capitalize">
            {user.role.replace('_', ' ')}
          </span>
        </span>
        <ChevronDown className="text-muted-foreground size-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="bg-popover absolute right-0 z-30 mt-1.5 w-56 rounded-lg border p-1.5 shadow-md"
        >
          <div className="flex flex-col gap-1 px-2.5 py-2">
            <span className="truncate text-sm font-medium">{user.email}</span>
            <Badge variant="outline" className="w-fit capitalize">
              {user.role.replace('_', ' ')}
            </Badge>
          </div>
          <div className="my-1 border-t" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
