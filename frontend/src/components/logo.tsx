import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  /** For use on a fixed-dark surface regardless of the active theme (e.g.
   * `layout/footer.tsx`, whose surface is always dark per
   * docs/Landing_Page_Design.md §18) — the two-tone primary accent split is
   * dropped in favor of one flat light color, since `--primary` itself
   * flips between a darker/lighter value depending on the *site* theme and
   * isn't guaranteed to contrast against a surface that doesn't flip with it. */
  inverted?: boolean
}

/**
 * The bilingual wordmark (docs/UI_Design_System.md §2). No image asset
 * exists yet — `assets/brand/` is still empty — so this renders as styled
 * text: a minimal glyph chip + "Nalanda TNPSC" at equal visual weight, never
 * Tamil rendered smaller than English (the same rule applies here in
 * reverse: this English-only wordmark isn't final, it's a placeholder for
 * the real bilingual lockup once a logomark exists). Swap the glyph span
 * for a real SVG once one exists, without changing any call site.
 */
export function Logo({ className, inverted = false }: LogoProps) {
  return (
    <Link to={ROUTES.home} className={cn('flex items-center gap-2', className)}>
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
        N
      </span>
      <span
        className={cn(
          'font-heading text-heading-4 font-semibold',
          inverted ? 'text-footer-foreground' : 'text-foreground',
        )}
      >
        {inverted ? (
          'Nalanda TNPSC'
        ) : (
          <>
            Nalanda <span className="text-primary">TNPSC</span>
          </>
        )}
      </span>
    </Link>
  )
}
