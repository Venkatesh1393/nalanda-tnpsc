import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getRecommendedTopics } from '@/services/dashboardService'
import type { RecommendedTopic } from '@/types/dashboard'

/** Deep-links straight into Smart Practice's Topic Quiz config, pre-filled
 * with the Adaptive Practice Engine's own suggested topic/difficulty/
 * question count (Sprint 4 Step 60) — still fully editable there, never an
 * auto-started session, so the student always sees and can adjust what
 * they're about to practice. */
function recommendationHref(topic: RecommendedTopic): string {
  const params = new URLSearchParams({
    subjectId: topic.subjectId,
    topicId: topic.topicId,
    difficulty: topic.suggestedDifficulty,
    count: String(topic.suggestedQuestionCount),
  })
  return `${ROUTES.practice('quiz')}?${params.toString()}`
}

/** Widget 10 — Recommended Topics (docs/Dashboard.md §10) — a horizontally
 * scrollable row on mobile, a grid on desktop, each card carrying a
 * one-line "reason" so a recommendation never feels arbitrary. Backed by the
 * real, deterministic Adaptive Practice Engine (Sprint 4 Step 60) — clicking
 * a card jumps into Smart Practice with that topic/difficulty/count
 * pre-filled. */
export function RecommendedTopicsCard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const {
    data: topics,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'recommended-topics'],
    queryFn: getRecommendedTopics,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('recommendedTopicsCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('recommendedTopicsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !topics ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-48 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : topics.length === 0 ? (
            <Text variant="body-sm">{t('recommendedTopicsCard.emptyText')}</Text>
          ) : (
            <motion.div
              variants={staggerChildren(0.06)}
              initial="hidden"
              animate="visible"
              className="flex gap-3 overflow-x-auto pb-1"
            >
              {topics.map((topic) => (
                <motion.button
                  key={topic.id}
                  type="button"
                  variants={fadeInUp}
                  onClick={() => navigate(recommendationHref(topic))}
                  className="border-border hover:border-primary/50 hover:bg-primary/5 w-56 shrink-0 rounded-lg border p-3 text-left transition-colors"
                >
                  <span className="bg-primary/10 text-primary mb-2 flex size-8 items-center justify-center rounded-md">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <Text as="span" variant="body-md" className="block font-medium">
                    {topic.topic}
                  </Text>
                  <Text variant="caption" className="block">
                    {topic.subject}
                  </Text>
                  <Text variant="body-sm" className="mt-1.5 block">
                    {topic.reason}
                  </Text>
                </motion.button>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
