import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, FileText, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { BookmarkToggleButton } from '@/features/learn/components/bookmark-toggle-button'
import { getLessonDetail } from '@/services/learnService'
import {
  markSubtopicComplete,
  markSubtopicIncomplete,
  toggleBookmark,
} from '@/services/learnProgressService'

type LessonOverviewProps = {
  subjectId: string
  topicId: string
  subtopicId: string
}

/**
 * The "Lesson Details" screen — the subtopic expanded to show its available
 * content entry points as separate cards rather than forcing a single
 * default choice (docs/Learn_Module.md §3), plus the "Practice This Topic"
 * handoff (§6) pre-filtered to this exact subtopic.
 */
export function LessonOverview({ subjectId, topicId, subtopicId }: LessonOverviewProps) {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['learn', 'lesson', subjectId, topicId, subtopicId]
  const {
    data: lesson,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getLessonDetail(subjectId, topicId, subtopicId),
  })

  function invalidateLessonQueries() {
    void queryClient.invalidateQueries({ queryKey: ['learn'] })
  }

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (!lesson) throw new Error('Lesson not loaded')
      return toggleBookmark({
        subtopicId,
        contentType: lesson.subtopic.hasNotes ? 'note' : 'video',
        title: lesson.subtopic.name,
        subjectName: lesson.subjectName,
        topicName: lesson.topicName,
        subjectId,
        topicId,
      })
    },
    onSuccess: invalidateLessonQueries,
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      lesson?.subtopic.isComplete
        ? markSubtopicIncomplete(subtopicId)
        : markSubtopicComplete(subtopicId),
    onSuccess: invalidateLessonQueries,
  })

  if (isError) {
    return (
      <ErrorState title={t('lessonOverview.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  if (lesson === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (lesson === null) {
    return (
      <EmptyState
        title={t('lessonOverview.notFoundTitle')}
        description={t('lessonOverview.notFoundDescription')}
        actionLabel={t('lessonOverview.backToSubjects')}
        onAction={() => navigate(ROUTES.learnSubjects)}
      />
    )
  }

  const { subtopic, subjectName, topicName, description } = lesson

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading variant="heading-2">{subtopic.name}</Heading>
          <Text variant="body-sm">
            {t('lessonOverview.metaLine', {
              subjectName,
              topicName,
              minutes: subtopic.estimatedMinutes,
            })}
          </Text>
        </div>
        <BookmarkToggleButton
          label={subtopic.name}
          isBookmarked={subtopic.isBookmarked}
          pending={bookmarkMutation.isPending}
          onToggle={() => bookmarkMutation.mutate()}
          size="icon"
        />
      </div>

      <Text variant="body-md">{description}</Text>

      {subtopic.hasVideo || subtopic.hasNotes ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {subtopic.hasVideo && (
            <Card
              interactive
              role="button"
              tabIndex={0}
              onClick={() => navigate(ROUTES.learnVideo(subjectId, topicId, subtopicId))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(ROUTES.learnVideo(subjectId, topicId, subtopicId))
                }
              }}
            >
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                    <Video className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <Text as="span" variant="body-md" className="font-medium">
                      {t('lessonOverview.watchVideoTitle')}
                    </Text>
                    <Text variant="caption">{t('lessonOverview.watchVideoSubtitle')}</Text>
                  </div>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
              </CardContent>
            </Card>
          )}
          {subtopic.hasNotes && (
            <Card
              interactive
              role="button"
              tabIndex={0}
              onClick={() => navigate(ROUTES.learnNotes(subjectId, topicId, subtopicId))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(ROUTES.learnNotes(subjectId, topicId, subtopicId))
                }
              }}
            >
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-ai-teal/10 text-ai-teal flex size-9 items-center justify-center rounded-lg">
                    <FileText className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <Text as="span" variant="body-md" className="font-medium">
                      {t('lessonOverview.readNotesTitle')}
                    </Text>
                    <Text variant="caption">{t('lessonOverview.readNotesSubtitle')}</Text>
                  </div>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState
          title={t('lessonOverview.noContentTitle')}
          description={t('lessonOverview.noContentDescription')}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          onClick={() =>
            navigate(
              `${ROUTES.practice('quiz')}?subtopicId=${encodeURIComponent(subtopicId)}`,
            )
          }
        >
          {t('lessonOverview.practiceThisTopic')}
        </Button>
        <Button
          variant="outline"
          loading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <CheckCircle2 className={subtopic.isComplete ? 'text-success' : ''} />
          {subtopic.isComplete
            ? t('lessonOverview.completed')
            : t('lessonOverview.markAsComplete')}
        </Button>
      </div>
    </div>
  )
}
