import { motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  Crown,
  Globe,
  Menu,
  Newspaper,
  Radio,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { staggerChildren, fadeInUp } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { useScrolled } from '@/hooks/use-scrolled'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

type NavLink = {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * The product-module links this Navbar was asked to carry — deliberately
 * text-only in the desktop row (docs/Landing_Page_Design.md §1: "no
 * decorative icons in the link row... keeping the Navbar calm and legible")
 * with icons reserved for the denser stacked mobile Drawer list, where they
 * aid scanability instead of competing for attention. Built from `t`
 * rather than a module-scope constant — `t` isn't available at module
 * scope (no I18nextProvider exists yet when this file is first imported).
 */
function buildNavLinks(t: TFunction<'common'>): NavLink[] {
  return [
    {
      label: t('nav.currentAffairs'),
      href: ROUTES.homeSection('current-affairs'),
      icon: Newspaper,
    },
    { label: t('nav.learn'), href: ROUTES.homeSection('learn'), icon: BookOpen },
    {
      label: t('nav.smartPractice'),
      href: ROUTES.homeSection('smart-practice'),
      icon: Target,
    },
    {
      label: t('nav.weeklyLiveExam'),
      href: ROUTES.homeSection('live-exam'),
      icon: Radio,
    },
    { label: t('nav.analytics'), href: ROUTES.homeSection('analytics'), icon: BarChart3 },
    { label: t('nav.community'), href: ROUTES.homeSection('community'), icon: Users },
  ]
}

const navLinkClassName =
  'relative text-sm font-medium whitespace-nowrap text-foreground/80 transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-180 hover:after:scale-x-100'

function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation('common')

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={
        language === 'en' ? t('language.switchToTamil') : t('language.switchToEnglish')
      }
      onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
      className="gap-1.5"
    >
      <Globe className="text-muted-foreground" />
      {language === 'en' ? 'EN' : 'தமிழ்'}
    </Button>
  )
}

/**
 * The Website's sticky top navigation (docs/Landing_Page_Design.md §1-§2,
 * docs/Navigation.md §1) — logo, product-module links, language/theme
 * controls, and account actions, transitioning from transparent-over-Hero
 * to a solid surface once the page scrolls (§2). Collapses to a hamburger
 * + full-height `Drawer` sheet below the `md` breakpoint (docs/UI_Design_System.md
 * §28's bottom-sheet convention, adapted to a right-side sheet for primary
 * navigation rather than a contextual action).
 */
export function Navbar() {
  const scrolled = useScrolled(80)
  const { t } = useTranslation('common')
  const navLinks = useMemo(() => buildNavLinks(t), [t])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-[260ms]',
        scrolled
          ? 'bg-background/95 border-border border-b shadow-xs backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Logo />

        <motion.nav
          variants={staggerChildren(0.04)}
          initial="hidden"
          animate="visible"
          className="hidden items-center gap-5 xl:flex"
          aria-label={t('nav.primary')}
        >
          {navLinks.map((link) => (
            <motion.div key={link.label} variants={fadeInUp}>
              <Link to={link.href} className={navLinkClassName}>
                {link.label}
              </Link>
            </motion.div>
          ))}
        </motion.nav>

        <div className="hidden items-center gap-2 xl:flex">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="premium" size="sm" asChild>
            <Link to={ROUTES.pricing}>
              <Crown />
              {t('actions.pricing')}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.login}>{t('actions.login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={ROUTES.register}>{t('actions.getStartedFree')}</Link>
          </Button>
        </div>

        {/* Mobile/tablet: hamburger opening the full-height nav sheet. The
            desktop link row (6 labels + language/theme/3 CTAs) needs ~1300px
            to lay out on one line without wrapping (docs/Landing_Page_Design.md
            §1 says "tablet collapses secondary links into an overflow menu" —
            in practice the whole row collapses to this sheet below `xl`,
            since a partial collapse still didn't fit at 1024px in testing). */}
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              aria-label={t('nav.openMenu')}
            >
              <Menu />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="flex h-full w-full flex-col sm:max-w-xs">
            <DrawerHeader>
              <Logo />
              {/* Logo isn't wired with asChild here — it doesn't forward
                  arbitrary props to its rendered <Link>, so Radix's a11y
                  linking (aria-labelledby) would silently drop. A plain
                  sr-only title satisfies the same requirement instead. */}
              <DrawerTitle className="sr-only">{t('nav.siteMenu')}</DrawerTitle>
              <DrawerDescription className="sr-only">
                {t('nav.siteMenuDescription')}
              </DrawerDescription>
            </DrawerHeader>

            <nav
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-4"
              aria-label={t('nav.primary')}
            >
              {navLinks.map((link) => (
                <DrawerClose asChild key={link.label}>
                  <Link
                    to={link.href}
                    className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                  >
                    <link.icon
                      className="text-muted-foreground size-4"
                      aria-hidden="true"
                    />
                    {link.label}
                  </Link>
                </DrawerClose>
              ))}
            </nav>

            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="premium" asChild>
                  <Link to={ROUTES.pricing}>
                    <Crown />
                    {t('actions.pricing')}
                  </Link>
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button asChild>
                  <Link to={ROUTES.register}>{t('actions.getStartedFree')}</Link>
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button variant="outline" asChild>
                  <Link to={ROUTES.login}>{t('actions.login')}</Link>
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  )
}
