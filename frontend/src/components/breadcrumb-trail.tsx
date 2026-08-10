import { useTranslation } from 'react-i18next'

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type BreadcrumbSegment = {
  label: string
  href?: string
  onClick?: () => void
}

type BreadcrumbTrailProps = {
  segments: BreadcrumbSegment[]
}

/**
 * The Navigation-system breadcrumb (docs/Navigation.md §8): only ever
 * renders 3+ levels deep (shallower pages rely on sidebar highlighting
 * alone, per docs/InformationArchitecture.md §4), and collapses a long
 * middle into a tappable ellipsis chip rather than wrapping or hard-
 * truncating, so no navigational information is ever hidden without a way
 * to reach it.
 */
export function BreadcrumbTrail({ segments }: BreadcrumbTrailProps) {
  const { t } = useTranslation('common')
  if (segments.length < 3) return null

  const first = segments[0]
  const last = segments[segments.length - 1]
  const middle = segments.slice(1, -1)
  const shouldCollapse = segments.length > 4

  const renderLink = (segment: BreadcrumbSegment) => (
    <BreadcrumbLink
      href={segment.href ?? '#'}
      onClick={(event) => {
        if (segment.onClick) {
          event.preventDefault()
          segment.onClick()
        }
      }}
    >
      {segment.label}
    </BreadcrumbLink>
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>{renderLink(first)}</BreadcrumbItem>
        <BreadcrumbSeparator />

        {shouldCollapse ? (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center"
                  aria-label={t('a11y.showHiddenSegments')}
                >
                  <BreadcrumbEllipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middle.map((segment) => (
                    <DropdownMenuItem
                      key={segment.label}
                      onClick={() => segment.onClick?.()}
                      asChild={Boolean(segment.href) && !segment.onClick}
                    >
                      {segment.href && !segment.onClick ? (
                        <a href={segment.href}>{segment.label}</a>
                      ) : (
                        segment.label
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : (
          middle.map((segment) => (
            <span key={segment.label} className="inline-flex items-center gap-1.5">
              <BreadcrumbItem>{renderLink(segment)}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </span>
          ))
        )}

        <BreadcrumbItem>
          <BreadcrumbPage>{last.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
