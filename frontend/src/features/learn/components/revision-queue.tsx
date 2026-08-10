import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { motionCelebratory, motionFast } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Spinner } from '@/components/spinner'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getRevisionQueue, submitRevisionResponse } from '@/services/learnProgressService'
import type { RevisionItem } from '@/types/learn'

/**
 * The Revision queue (docs/Learn_Module.md §8) — a single prioritized daily
 * queue, not a raw list: one card at a time, "Got it"/"Still unsure" per
 * item (a quick `motion-fast` dismiss, never celebratory per item — that
 * would cheapen it within minutes of daily use). Finishing the *entire*
 * queue is the one moment in this module that earns `motion-celebratory`.
 */
export function RevisionQueue() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['learn', 'revision']
  const {
    data: items,
    isError,
    refetch,
  } = useQuery({ queryKey, queryFn: getRevisionQueue })
  const [exitDirection, setExitDirection] = useState<1 | -1>(1)

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: 'got-it' | 'still-unsure' }) =>
      submitRevisionResponse(id, response),
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<RevisionItem[]>(queryKey, (old) =>
        old?.filter((item) => item.id !== variables.id),
      )
      void queryClient.invalidateQueries({ queryKey: ['learn'] })
    },
  })

  if (isError) {
    return (
      <ErrorState
        title={t('revisionQueue.errorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (items === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner />
        <Text variant="body-sm">{t('revisionQueue.preparing')}</Text>
      </div>
    )
  }

  if (items.length === 0) {
    // A response only ever fires against a real current item, so a
    // successful mutation implies the queue had at least one item this
    // session — the signal for "just cleared" vs. "was always empty",
    // without needing separate effect/ref-tracked state.
    if (respondMutation.isSuccess) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionCelebratory}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center"
        >
          <span className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
            <PartyPopper className="size-6" aria-hidden="true" />
          </span>
          <Heading variant="heading-4">{t('revisionQueue.clearedTitle')}</Heading>
          <Text variant="body-sm" className="max-w-sm">
            {t('revisionQueue.clearedDescription')}
          </Text>
        </motion.div>
      )
    }
    return (
      <EmptyState
        title={t('revisionQueue.emptyTitle')}
        description={t('revisionQueue.emptyDescription')}
        actionLabel={t('revisionQueue.browseSubjects')}
        onAction={() => navigate(ROUTES.learnSubjects)}
      />
    )
  }

  const current = items[0]

  return (
    <div className="flex flex-col items-center gap-5">
      <Text variant="body-sm">
        {t(
          items.length === 1
            ? 'revisionQueue.itemsCountOne'
            : 'revisionQueue.itemsCountOther',
          { count: items.length },
        )}
      </Text>

      <div className="relative w-full max-w-md">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: exitDirection * 80 }}
            transition={motionFast}
          >
            <Card>
              <CardContent className="flex flex-col gap-3">
                <Badge variant="outline" className="w-fit capitalize">
                  {current.sourceType.replace('-', ' ')}
                </Badge>
                <Heading variant="heading-4">{current.title}</Heading>
                <Text variant="body-sm">{current.subjectName}</Text>
                <Text variant="caption">{current.dueReason}</Text>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          loading={respondMutation.isPending}
          onClick={() => {
            setExitDirection(-1)
            respondMutation.mutate({ id: current.id, response: 'still-unsure' })
          }}
        >
          {t('revisionQueue.stillUnsure')}
        </Button>
        <Button
          loading={respondMutation.isPending}
          onClick={() => {
            setExitDirection(1)
            respondMutation.mutate({ id: current.id, response: 'got-it' })
          }}
        >
          {t('revisionQueue.gotIt')}
        </Button>
      </div>
    </div>
  )
}
