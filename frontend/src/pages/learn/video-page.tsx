import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { BreadcrumbTrail } from '@/components/breadcrumb-trail'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { BookmarkToggleButton, VideoPlayerMock } from '@/features/learn'
import {
  markSubtopicComplete,
  recordSubtopicVisit,
  toggleBookmark,
  updateVideoProgress,
} from '@/services/learnProgressService'
import { getLessonDetail, getVideoLesson } from '@/services/learnService'

/** Video — short-form video lesson for a subtopic (docs/Learn_Module.md
 * §4). No real media backend exists yet, so playback is simulated
 * (`features/learn/components/video-player-mock.tsx`). */
export function VideoPage() {
  const { t } = useTranslation('learn')
  const { subjectId = '', topicId = '', subtopicId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const lessonQueryKey = ['learn', 'lesson', subjectId, topicId, subtopicId]
  const { data: lesson } = useQuery({
    queryKey: lessonQueryKey,
    queryFn: () => getLessonDetail(subjectId, topicId, subtopicId),
  })
  const {
    data: video,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['learn', 'video', subjectId, topicId, subtopicId],
    queryFn: () => getVideoLesson(subjectId, topicId, subtopicId),
  })

  useEffect(() => {
    void recordSubtopicVisit(subjectId, topicId, subtopicId)
  }, [subjectId, topicId, subtopicId])

  function invalidateLearnQueries() {
    void queryClient.invalidateQueries({ queryKey: ['learn'] })
  }

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (!lesson || !video) throw new Error('Video not loaded')
      return toggleBookmark({
        subtopicId,
        contentType: 'video',
        title: video.title,
        subjectName: lesson.subjectName,
        topicName: lesson.topicName,
        subjectId,
        topicId,
      })
    },
    onSuccess: invalidateLearnQueries,
  })

  const progressMutation = useMutation({
    mutationFn: (percent: number) => updateVideoProgress(subtopicId, percent),
    onSuccess: invalidateLearnQueries,
  })

  const markWatchedMutation = useMutation({
    mutationFn: () => markSubtopicComplete(subtopicId),
    onSuccess: invalidateLearnQueries,
  })

  if (isError) {
    return (
      <ErrorState
        title={t('videoPage.errorTitle')}
        description={
          lesson?.subtopic.hasNotes ? t('videoPage.errorDescriptionWithNotes') : undefined
        }
        onRetry={() => void refetch()}
      />
    )
  }

  if (video === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  if (video === null) {
    return (
      <EmptyState
        title={t('videoPage.emptyTitle')}
        actionLabel={t('videoPage.backToLesson')}
        onAction={() => navigate(ROUTES.learnLesson(subjectId, topicId, subtopicId))}
      />
    )
  }

  const subjectName = lesson?.subjectName ?? subjectId
  const topicName = lesson?.topicName ?? topicId

  return (
    <div className="flex flex-col gap-5">
      <BreadcrumbTrail
        segments={[
          {
            label: t('videoPage.breadcrumbLearn'),
            href: ROUTES.learnSubjects,
            onClick: () => navigate(ROUTES.learnSubjects),
          },
          {
            label: subjectName,
            href: ROUTES.learnTopics(subjectId),
            onClick: () => navigate(ROUTES.learnTopics(subjectId)),
          },
          {
            label: topicName,
            href: ROUTES.learnSubtopics(subjectId, topicId),
            onClick: () => navigate(ROUTES.learnSubtopics(subjectId, topicId)),
          },
          {
            label: video.title,
            href: ROUTES.learnLesson(subjectId, topicId, subtopicId),
            onClick: () => navigate(ROUTES.learnLesson(subjectId, topicId, subtopicId)),
          },
          { label: t('videoPage.breadcrumbVideo') },
        ]}
      />

      <div className="flex items-center justify-between gap-3">
        <Heading variant="heading-3">{video.title}</Heading>
        <BookmarkToggleButton
          label={video.title}
          isBookmarked={video.isBookmarked}
          pending={bookmarkMutation.isPending}
          onToggle={() => bookmarkMutation.mutate()}
        />
      </div>

      <VideoPlayerMock
        title={video.title}
        durationSeconds={video.durationSeconds}
        initialProgressPercent={video.progressPercent}
        onProgressChange={(percent) => progressMutation.mutate(percent)}
        onWatchedThresholdReached={() => markWatchedMutation.mutate()}
      />
    </div>
  )
}
