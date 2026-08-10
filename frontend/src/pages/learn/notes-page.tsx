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
import { BookmarkToggleButton, NotesReader } from '@/features/learn'
import {
  markSubtopicComplete,
  markSubtopicIncomplete,
  recordSubtopicVisit,
  toggleBookmark,
  updateNotesProgress,
} from '@/services/learnProgressService'
import { getLessonDetail, getStudyNotes } from '@/services/learnService'

/** PDF / Notes — text-based study material for a subtopic
 * (docs/Learn_Module.md §5). */
export function NotesPage() {
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
    data: note,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['learn', 'notes', subjectId, topicId, subtopicId],
    queryFn: () => getStudyNotes(subjectId, topicId, subtopicId),
  })

  useEffect(() => {
    void recordSubtopicVisit(subjectId, topicId, subtopicId)
  }, [subjectId, topicId, subtopicId])

  function invalidateLearnQueries() {
    void queryClient.invalidateQueries({ queryKey: ['learn'] })
  }

  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (!lesson || !note) throw new Error('Notes not loaded')
      return toggleBookmark({
        subtopicId,
        contentType: 'note',
        title: note.title,
        subjectName: lesson.subjectName,
        topicName: lesson.topicName,
        subjectId,
        topicId,
      })
    },
    onSuccess: invalidateLearnQueries,
  })

  const progressMutation = useMutation({
    mutationFn: (percent: number) => updateNotesProgress(subtopicId, percent),
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      lesson?.subtopic.isComplete
        ? markSubtopicIncomplete(subtopicId)
        : markSubtopicComplete(subtopicId),
    onSuccess: invalidateLearnQueries,
  })

  if (isError) {
    return (
      <ErrorState
        title={t('notesPage.errorTitle')}
        description={
          lesson?.subtopic.hasVideo ? t('notesPage.errorDescriptionWithVideo') : undefined
        }
        onRetry={() => void refetch()}
      />
    )
  }

  if (note === undefined) {
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    )
  }

  if (note === null) {
    return (
      <EmptyState
        title={t('notesPage.emptyTitle')}
        actionLabel={t('notesPage.backToLesson')}
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
            label: t('notesPage.breadcrumbLearn'),
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
            label: note.title,
            href: ROUTES.learnLesson(subjectId, topicId, subtopicId),
            onClick: () => navigate(ROUTES.learnLesson(subjectId, topicId, subtopicId)),
          },
          { label: t('notesPage.breadcrumbNotes') },
        ]}
      />

      <div className="flex items-center justify-between gap-3">
        <Heading variant="heading-3">{note.title}</Heading>
        <BookmarkToggleButton
          label={note.title}
          isBookmarked={note.isBookmarked}
          pending={bookmarkMutation.isPending}
          onToggle={() => bookmarkMutation.mutate()}
        />
      </div>

      <NotesReader
        note={note}
        isComplete={Boolean(lesson?.subtopic.isComplete)}
        isMarkingComplete={completeMutation.isPending}
        onReadProgressChange={(percent) => progressMutation.mutate(percent)}
        onMarkAsRead={() => completeMutation.mutate()}
      />
    </div>
  )
}
