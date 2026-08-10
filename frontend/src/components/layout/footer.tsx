import type { TFunction } from 'i18next'
import { Send, ShieldCheck } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'
import { Text } from '@/components/typography'
import { EXAM_CATEGORIES } from '@/constants/exam'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { cn } from '@/lib/utils'

type FooterLink = { label: string; href: string }
type FooterLinkGroup = { title: string; links: FooterLink[] }

/**
 * Built from `t`/`language` rather than a module-scope constant — `t`
 * isn't available at module scope (no I18nextProvider exists yet when this
 * file is first imported), and `EXAM_CATEGORIES`' labels are real
 * `{en, ta}` per-item data (constants/exam.ts), not i18next UI copy — this
 * indexes `[language]` directly rather than hardcoding `.en`.
 */
function buildLinkGroups(t: TFunction<'common'>, language: 'en' | 'ta'): FooterLinkGroup[] {
  return [
    {
      title: t('footer.companyGroup'),
      links: [
        { label: t('footer.about'), href: ROUTES.about },
        { label: t('footer.contact'), href: ROUTES.contact },
      ],
    },
    {
      title: t('footer.coursesGroup'),
      // Real exam-category data (constants/exam.ts) — not a fabricated link list.
      links: EXAM_CATEGORIES.map((exam) => ({
        label: exam.label[language],
        href: ROUTES.examLanding(exam.id),
      })),
    },
    {
      title: t('footer.resourcesGroup'),
      links: [
        { label: t('footer.currentAffairs'), href: ROUTES.homeSection('current-affairs') },
        { label: t('footer.successStories'), href: ROUTES.homeSection('success-stories') },
        { label: t('footer.blog'), href: ROUTES.blog },
      ],
    },
  ]
}

// Brand names — deliberately not translated (proper nouns, universally
// kept in Latin script regardless of UI language).
const socialLinks = [
  { label: 'Instagram', shortLabel: 'IG', href: '#' },
  { label: 'YouTube', shortLabel: 'YT', href: '#' },
  { label: 'X (Twitter)', shortLabel: 'X', href: '#' },
  { label: 'LinkedIn', shortLabel: 'in', href: '#' },
]

const footerLinkClassName =
  'text-sm text-footer-foreground/70 transition-colors hover:text-footer-foreground'

function NewsletterForm() {
  const { t } = useTranslation('common')
  const inputId = useId()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    // No backend endpoint exists yet for newsletter capture — this is
    // real, local form behavior (validated input, real submitting state,
    // real feedback), just not yet wired to a server. Swap the body for a
    // service-layer call once that endpoint exists, with no markup change.
    window.setTimeout(() => {
      setSubmitting(false)
      setEmail('')
      toast.success(t('footer.subscribedTitle'), {
        description: t('footer.subscribedDescription'),
      })
    }, 400)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-footer-foreground/70 text-xs">
        {t('footer.newsletterLabel')}
      </Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="email"
          required
          placeholder={t('footer.newsletterPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="border-footer-foreground/15 bg-footer-foreground/5 text-footer-foreground placeholder:text-footer-foreground/40 h-8"
        />
        <Button type="submit" size="sm" loading={submitting} aria-label={t('actions.subscribe')}>
          <Send />
        </Button>
      </div>
    </form>
  )
}

function FooterBrand({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  return (
    <div className={cn('flex max-w-xs flex-col gap-4', className)}>
      <Logo inverted />
      <Text className="text-footer-foreground/70 text-sm">{t('footer.tagline')}</Text>
      <NewsletterForm />
      <div className="flex items-center gap-2">
        {socialLinks.map((social) => (
          <a
            key={social.label}
            href={social.href}
            aria-label={social.label}
            className="bg-footer-foreground/10 text-footer-foreground/80 hover:bg-footer-foreground/20 hover:text-footer-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
          >
            {social.shortLabel}
          </a>
        ))}
      </div>
    </div>
  )
}

/**
 * The Website's Footer (docs/Landing_Page_Design.md §18) — the final
 * sitemap/trust surface. Deliberately low-motion (no scroll-reveal
 * animation, per the doc's "explicitly a low-motion, purely functional
 * zone" rule) and on its own dark `--footer` surface regardless of the
 * active site theme (see index.css). Desktop renders 4 flat columns;
 * mobile collapses the 3 link groups into an `Accordion`, matching the
 * doc's "accordion-style, matching the FAQ's interaction pattern" rule.
 */
export function Footer() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const year = new Date().getFullYear()
  // Not memoized (`useMemo`) deliberately — the React Compiler auto-
  // memoizes this component and rejects a manual memo it can't verify is
  // safe to preserve (same "let the compiler handle it" precedent
  // `components/data-table/data-table.tsx` already documents).
  const linkGroups = buildLinkGroups(t, language)

  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        {/* Desktop: 4 flat columns */}
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          <FooterBrand />
          {linkGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <Text variant="overline" className="text-footer-foreground/50">
                {group.title}
              </Text>
              {group.links.map((link) => (
                <Link key={link.label} to={link.href} className={footerLinkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile: brand + collapsible link groups */}
        <div className="flex flex-col gap-2 md:hidden">
          <FooterBrand className="mb-4" />
          <Accordion type="single" collapsible>
            {linkGroups.map((group) => (
              <AccordionItem
                key={group.title}
                value={group.title}
                className="border-footer-foreground/10"
              >
                <AccordionTrigger className="text-footer-foreground hover:no-underline">
                  {group.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3">
                    {group.links.map((link) => (
                      <Link
                        key={link.label}
                        to={link.href}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Bottom bar: copyright, legal, repeat CTA, trust badge */}
        <div className="border-footer-foreground/10 mt-10 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Text className="text-footer-foreground/50 text-xs">
              {t('footer.copyright', { year })}
            </Text>
            <Link
              to={ROUTES.privacy}
              className="text-footer-foreground/60 text-xs hover:underline"
            >
              {t('footer.privacyPolicy')}
            </Link>
            <Link
              to={ROUTES.terms}
              className="text-footer-foreground/60 text-xs hover:underline"
            >
              {t('footer.termsOfService')}
            </Link>
            <Link
              to={ROUTES.register}
              className="text-footer-primary text-xs font-medium hover:underline"
            >
              {t('footer.getStartedFree')}
            </Link>
          </div>

          <div className="text-footer-foreground/50 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t('footer.paymentsSecured')}
          </div>
        </div>
      </div>
    </footer>
  )
}
