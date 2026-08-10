import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Pause, Play, Quote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fadeInUp, motionFast } from '@/animations/variants'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES } from '@/constants/exam'
import { useLanguage } from '@/hooks/use-language'
import { getTestimonials } from '@/services/publicService'
import { cn } from '@/lib/utils'
import type { Testimonial } from '@/types/marketing'

function examLabel(examCategory: Testimonial['examCategory'], language: 'en' | 'ta'): string {
  return (
    EXAM_CATEGORIES.find((exam) => exam.id === examCategory)?.label[language] ?? examCategory
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { language } = useLanguage()
  return (
    <Card className="relative w-[300px] shrink-0 overflow-hidden shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5">
      <Quote
        className="text-muted-foreground/10 pointer-events-none absolute -top-2 -right-2 size-20"
        aria-hidden="true"
      />
      <CardContent className="relative flex flex-col gap-3">
        <Text variant="body-md">"{testimonial.quote}"</Text>
        <div className="flex items-center gap-2 pt-1">
          <Avatar className="size-8">
            <AvatarImage src={testimonial.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Text variant="body-sm" className="text-foreground font-medium">
              {testimonial.name}
            </Text>
          </div>
          <Badge variant="outline" className="ml-auto">
            {examLabel(testimonial.examCategory, language)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Testimonials (docs/Landing_Page_Design.md §16) — broad-based trust via
 * volume, from `GET /public/testimonials` (docs/API.md §17). A slow,
 * continuous marquee on desktop/tablet (the `animate-marquee` keyframe in
 * index.css); falls back to a static wrapped grid when the visitor has
 * reduced motion enabled, since a paused single-row marquee would otherwise
 * crop most of the content.
 *
 * The marquee auto-scrolls for longer than the 5 seconds WCAG 2.2.2 ("Pause,
 * Stop, Hide") allows before requiring user control — hover/focus-within
 * pausing it (index.css) covers a mouse, but not a touch, keyboard-only, or
 * screen-reader visitor, none of whom can hover. The explicit Pause/Play
 * button below is what actually satisfies that requirement.
 */
export function TestimonialsSection() {
  const { t } = useTranslation('landing')
  const prefersReducedMotion = useReducedMotion()
  const [isPaused, setIsPaused] = useState(false)
  const { data, isError, refetch } = useQuery({
    queryKey: ['public', 'testimonials'],
    queryFn: () => getTestimonials(12),
  })
  const items = data ?? []

  if (!isError && data && items.length === 0) return null

  return (
    <section className="bg-muted/40 py-16 md:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeInUp}
        className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 px-4 text-center md:px-6"
      >
        <Heading as="h2" variant="heading-1">
          {t('testimonials.title')}
        </Heading>
        {!prefersReducedMotion && data && items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-pressed={isPaused}
            onClick={() => setIsPaused((paused) => !paused)}
          >
            {isPaused ? <Play /> : <Pause />}
            {isPaused ? t('testimonials.play') : t('testimonials.pause')}{' '}
            {t('testimonials.scrolling')}
          </Button>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="mx-auto max-w-6xl px-4 md:px-6"
          >
            <ErrorState
              title={t('testimonials.errorTitle')}
              onRetry={() => void refetch()}
            />
          </motion.div>
        ) : !data ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="mx-auto flex max-w-6xl gap-4 overflow-hidden px-4 md:px-6"
          >
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-[300px] shrink-0 rounded-xl" />
            ))}
          </motion.div>
        ) : prefersReducedMotion ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-3"
          >
            {items.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="marquee"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'animate-marquee flex w-max gap-4 px-4',
                isPaused && '![animation-play-state:paused]',
              )}
            >
              {[...items, ...items].map((testimonial, index) => (
                <TestimonialCard
                  key={`${testimonial.id}-${index}`}
                  testimonial={testimonial}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
