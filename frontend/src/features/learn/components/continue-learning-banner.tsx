import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getLastVisited } from '@/services/learnProgressService'
import { getLessonDetail } from '@/services/learnService'

/**
 * Learn's own "Continue Learning" entry point atop the Subjects page — reads
 * real Learn progress state (`services/learnProgressService.ts`'s
 * `lastVisited` record), distinct from Dashboard's separate
 * `ContinueLearningCard` (which reads Dashboard's own mock). Renders nothing
 * for a brand-new user rather than an empty-state card, so a first-time
 * visitor's Subjects page isn't cluttered with a "nothing to continue" box.
 */
export function ContinueLearningBanner() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const { data, isPending } = useQuery({
    queryKey: ['learn', 'continue-learning'],
    queryFn: async () => {
      const last = await getLastVisited()
      if (!last) return null
      const lesson = await getLessonDetail(last.subjectId, last.topicId, last.subtopicId)
      if (!lesson) return null
      return { ...last, lesson }
    },
  })

  if (isPending) return <Skeleton className="h-20 w-full rounded-xl" />
  if (!data) return null

  const { lesson, subjectId, topicId, subtopicId } = data

  return (
    <motion.div variants={fadeInUp}>
      <Card
        interactive
        role="button"
        tabIndex={0}
        onClick={() => navigate(ROUTES.learnLesson(subjectId, topicId, subtopicId))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            navigate(ROUTES.learnLesson(subjectId, topicId, subtopicId))
          }
        }}
        className="bg-primary/5"
      >
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <PlayCircle className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <Text variant="caption">{t('continueLearningBanner.label')}</Text>
              <Text as="span" variant="body-lg" className="font-medium">
                {lesson.subtopic.name}
              </Text>
              <Text variant="body-sm">
                {lesson.subjectName} · {lesson.topicName}
              </Text>
            </div>
          </div>
          <ChevronRight
            className="text-muted-foreground size-5 shrink-0"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}
