import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { NAV_ITEMS } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'

/** Derives `Admin > Section > ...` from the current path — matches
 * `docs/InformationArchitecture.md`'s breadcrumb examples (`Admin >
 * Content Management > ...`) at foundation scope: one crumb per matched
 * nav section, plus a raw trailing segment for a detail route
 * (`/admin/users/:userId`) since there's no per-entity label to look up
 * yet without an extra fetch. */
export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean) // ['admin', 'users', ':id'?]

  const navItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.href))
  const extraSegment =
    navItem && location.pathname !== navItem.href ? segments[segments.length - 1] : null

  const crumbs = [
    { label: 'Admin', href: ROUTES.dashboard },
    ...(navItem ? [{ label: navItem.label, href: navItem.href }] : []),
    ...(extraSegment ? [{ label: extraSegment, href: location.pathname }] : []),
  ]

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <Fragment key={crumb.href + crumb.label}>
            {index > 0 && (
              <ChevronRight
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span className="text-foreground truncate font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
