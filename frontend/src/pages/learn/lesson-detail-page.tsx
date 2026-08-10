import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { BreadcrumbTrail } from '@/components/breadcrumb-trail'
import { ROUTES } from '@/constants/routes'
import { LessonOverview } from '@/features/learn'
import { recordSubtopicVisit } from '@/services/learnProgressService'
import { getLessonDetail } from '@/services/learnService'

/** Lesson Details — the subtopic expanded into its available content entry
 * points (docs/Learn_Module.md §3), between Subtopics and Video/PDF. Shares
 * its query key with `LessonOverview` so both read the same in-flight/cached
 * fetch rather than issuing it twice. */
export function LessonDetailPage() {
  const { t } = useTranslation('learn')
  const { subjectId = '', topicId = '', subtopicId = '' } = useParams()
  const navigate = useNavigate()
  const { data: lesson } = useQuery({
    queryKey: ['learn', 'lesson', subjectId, topicId, subtopicId],
    queryFn: () => getLessonDetail(subjectId, topicId, subtopicId),
  })

  useEffect(() => {
    void recordSubtopicVisit(subjectId, topicId, subtopicId)
  }, [subjectId, topicId, subtopicId])

  const subjectName = lesson?.subjectName ?? subjectId
  const topicName = lesson?.topicName ?? topicId
  const subtopicName = lesson?.subtopic.name ?? subtopicId

  return (
    <div className="flex flex-col gap-5">
      <BreadcrumbTrail
        segments={[
          {
            label: t('lessonDetailPage.breadcrumbLearn'),
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
          { label: subtopicName },
        ]}
      />
      <LessonOverview subjectId={subjectId} topicId={topicId} subtopicId={subtopicId} />
    </div>
  )
}
