import type { TFunction } from 'i18next'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import {
  CalendarCheck2,
  FileCheck2,
  MessageCircleQuestion,
  Newspaper,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { PointerEvent } from 'react'

import { motionBase } from '@/animations/variants'
import { AiOrb } from '@/components/ai-orb'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { getPlatformStats } from '@/services/publicService'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format-date'

type FloatingIcon = {
  icon: LucideIcon
  label: string
  className: string
  floatDuration: number
}

/**
 * The curated AI-capability icon set (docs/Landing_Page_Design.md §5) —
 * exactly the four capabilities named in the doc, never generic
 * robot/sparkle clip-art. Positioned as an "orbit" around the AI Assistant
 * orb rather than a rigid grid. Built from `t` rather than a module-scope
 * constant — `t` isn't available at module scope.
 */
function buildFloatingIcons(t: TFunction<'landing'>): FloatingIcon[] {
  return [
    {
      icon: MessageCircleQuestion,
      label: t('hero.floatingIcons.aiExplanation'),
      className: 'top-[8%] left-[6%]',
      floatDuration: 5,
    },
    {
      icon: CalendarCheck2,
      label: t('hero.floatingIcons.studyPlan'),
      className: 'top-[14%] right-[4%]',
      floatDuration: 6.5,
    },
    {
      icon: Newspaper,
      label: t('hero.floatingIcons.currentAffairsSummary'),
      className: 'bottom-[18%] left-[2%]',
      floatDuration: 5.5,
    },
    {
      icon: FileCheck2,
      label: t('hero.floatingIcons.mainsEvaluation'),
      className: 'right-[8%] bottom-[10%]',
      floatDuration: 7,
    },
  ]
}

function FloatingIconChips() {
  const { t } = useTranslation('landing')
  const floatingIcons = buildFloatingIcons(t)
  const prefersReducedMotion = useReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    mouseX.set(((event.clientX - rect.left) / rect.width - 0.5) * 16)
    mouseY.set(((event.clientY - rect.top) / rect.height - 0.5) * 16)
  }

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      style={prefersReducedMotion ? undefined : { x: springX, y: springY }}
      className="pointer-events-none absolute inset-0"
    >
      {floatingIcons.map(({ icon: Icon, label, className, floatDuration }) => (
        <motion.span
          key={label}
          animate={prefersReducedMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'bg-ai-teal/10 text-ai-teal absolute flex size-11 items-center justify-center rounded-xl shadow-sm',
            className,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </motion.span>
      ))}
    </motion.div>
  )
}

function HeroVisual() {
  return (
    <div className="relative isolate flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-3xl sm:aspect-video lg:aspect-square">
      <div
        aria-hidden="true"
        className="animate-gradient-drift absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--accent)_0%,transparent_45%),radial-gradient(circle_at_85%_75%,var(--ai-teal)_0%,transparent_35%)] [background-size:140%_140%] opacity-70 dark:opacity-40"
      />
      <FloatingIconChips />
      <AiOrb trigger="viewport" />
    </div>
  )
}

function TrustStrip() {
  const { t } = useTranslation('landing')
  const { language } = useLanguage()
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: getPlatformStats,
  })

  if (!stats) return null

  return (
    <Text variant="body-sm" className="tabular-nums">
      {t('hero.trustedBy', { count: formatNumber(stats.studentsCount, language) })}
    </Text>
  )
}

/**
 * The Landing Page's Hero (docs/Landing_Page_Design.md §3-§6) — the single
 * highest-leverage section on the page. Two-zone split on desktop (copy +
 * CTAs left, animated AI composition right), stacked on mobile.
 */
export function HeroSection() {
  const { t } = useTranslation('landing')
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:pt-16 sm:pb-20 md:px-6 lg:grid-cols-[55%_45%] lg:pt-24 lg:pb-28">
      <motion.div
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-start gap-5 text-left"
      >
        <motion.span
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          transition={motionBase}
          className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
        >
          {t('hero.badge')}
        </motion.span>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          transition={motionBase}
        >
          <Heading as="h1" variant="display" className="max-w-xl">
            {t('hero.title')}
          </Heading>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          transition={motionBase}
        >
          <Text variant="body-lg" className="text-muted-foreground max-w-lg">
            {t('hero.subtitle')}
          </Text>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          transition={motionBase}
          className="flex flex-wrap items-center gap-3 pt-1"
        >
          <Button size="lg" asChild>
            <Link to={ROUTES.register}>{t('hero.startFree')}</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link to={ROUTES.homeSection('learn')}>{t('hero.seeHowItWorks')}</Link>
          </Button>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          transition={motionBase}
        >
          <TrustStrip />
        </motion.div>
      </motion.div>

      <div className="flex justify-center lg:justify-end">
        <HeroVisual />
      </div>
    </section>
  )
}
