import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getWeakSubjects } from '@/services/dashboardService'
import { slugify } from '@/utils/slugify'

const MIN_ATTEMPTS_FOR_CONFIDENCE = 5

/**
 * Widget 11 — Weak Subjects (docs/Dashboard.md §11) — a ranked action list,
 * not a chart (per docs/Analytics.md §8's own reasoning). Subjects under
 * the minimum attempt threshold show a "not enough data" disclaimer instead
 * of a falsely precise score (docs/Analytics.md §2).
 */
export function WeakSubjectsCard() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const {
    data: subjects,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'weak-subjects'],
    queryFn: getWeakSubjects,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <Heading variant="heading-4">{t('weakSubjectsCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('weakSubjectsCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !subjects ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <Text variant="body-sm">{t('weakSubjectsCard.emptyText')}</Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-1"
            >
              {subjects.map((subject) => {
                const hasEnoughData = subject.attemptCount >= MIN_ATTEMPTS_FOR_CONFIDENCE
                return (
                  <motion.li
                    key={subject.subject}
                    variants={fadeInUp}
                    className="flex items-center justify-between gap-3 rounded-md px-1.5 py-2"
                  >
                    <div className="flex flex-col">
                      <Text as="span" variant="body-md" className="font-medium">
                        {subject.subject}
                      </Text>
                      <Text variant="caption">
                        {hasEnoughData
                          ? t('weakSubjectsCard.accuracyText', {
                              accuracy: subject.accuracy,
                            })
                          : t('weakSubjectsCard.notEnoughData')}
                      </Text>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(ROUTES.learnTopics(slugify(subject.subject)))
                      }
                    >
                      {t('weakSubjectsCard.studyThisTopic')}
                    </Button>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
