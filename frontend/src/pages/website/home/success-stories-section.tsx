import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { motionFast, slideInLeft, slideInRight } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES } from '@/constants/exam'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { getSuccessStories } from '@/services/publicService'
import { cn } from '@/lib/utils'
import type { SuccessStory } from '@/types/marketing'

function examLabel(examCategory: SuccessStory['examCategory'], language: 'en' | 'ta'): string {
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

function StoryRow({ story, reverse }: { story: SuccessStory; reverse: boolean }) {
  const { t } = useTranslation('landing')
  const { language } = useLanguage()
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <motion.div
        variants={reverse ? slideInRight : slideInLeft}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className={cn(
          'flex aspect-4/3 items-center justify-center overflow-hidden rounded-2xl',
          reverse && 'md:order-2',
        )}
      >
        {story.photoUrl ? (
          <img
            src={story.photoUrl}
            alt={story.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="bg-accent text-accent-foreground flex size-full items-center justify-center text-5xl font-bold">
            {initials(story.name)}
          </div>
        )}
      </motion.div>

      <motion.div
        variants={reverse ? slideInLeft : slideInRight}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className={cn('flex flex-col items-start gap-3', reverse && 'md:order-1')}
      >
        <Badge variant="outline">{examLabel(story.examCategory, language)}</Badge>
        <Heading as="h3" variant="heading-2">
          {story.headline}
        </Heading>
        <Text variant="body-lg" className="text-muted-foreground">
          {story.story}
        </Text>
        <Text variant="body-sm" className="font-medium">
          — {story.name}, {t('successStories.clearedPrefix')} {story.examCleared}
        </Text>
        <Link
          to={ROUTES.register}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t('successStories.startYourStory')}
        </Link>
      </motion.div>
    </div>
  )
}

/**
 * Success Stories (docs/Landing_Page_Design.md §14) — deep, narrative-driven
 * proof from `GET /public/success-stories` (docs/API.md §17). The only
 * section on the page using a directional (not purely vertical) entrance,
 * and deliberately more editorial/spacious than the compact Testimonials
 * below it.
 */
export function SuccessStoriesSection() {
  const { t } = useTranslation('landing')
  const { data, isError, refetch } = useQuery({
    queryKey: ['public', 'success-stories'],
    queryFn: () => getSuccessStories(4),
  })
  const items = data ?? []

  if (!isError && data && items.length === 0) return null

  return (
    <section
      id="success-stories"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <Heading as="h2" variant="heading-1">
          {t('successStories.title')}
        </Heading>
        <Text variant="body-lg" className="text-muted-foreground mt-3">
          {t('successStories.subtitle')}
        </Text>
      </div>

      <AnimatePresence mode="wait">
        {isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
          >
            <ErrorState
              title={t('successStories.errorTitle')}
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
            className="flex flex-col gap-16"
          >
            {[0, 1].map((i) => (
              <div key={i} className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                <Skeleton className="aspect-4/3 w-full rounded-2xl" />
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionFast}
            className="flex flex-col gap-16"
          >
            {items.map((story, index) => (
              <StoryRow key={story.id} story={story} reverse={index % 2 === 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex justify-center">
        <Button variant="secondary" asChild>
          <Link to={ROUTES.successStories}>{t('successStories.readMore')}</Link>
        </Button>
      </div>
    </section>
  )
}
