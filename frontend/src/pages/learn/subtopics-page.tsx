import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { BreadcrumbTrail } from '@/components/breadcrumb-trail'
import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { SubtopicList } from '@/features/learn'
import { getSubjects, getTopics } from '@/services/learnService'

/** Subtopics — the atomic syllabus unit, first level where content
 * consumption and bookmarking begin (docs/Learn_Module.md §3). */
export function SubtopicsPage() {
  const { t } = useTranslation('learn')
  const { subjectId = '', topicId = '' } = useParams()
  const navigate = useNavigate()
  const { data: subjects } = useQuery({
    queryKey: ['learn', 'subjects'],
    queryFn: getSubjects,
  })
  const { data: topics } = useQuery({
    queryKey: ['learn', 'topics', subjectId],
    queryFn: () => getTopics(subjectId),
  })

  const subjectName =
    subjects?.find((subject) => subject.id === subjectId)?.name ?? subjectId
  const topicName = topics?.find((topic) => topic.id === topicId)?.name ?? topicId

  return (
    <div className="flex flex-col gap-5">
      <BreadcrumbTrail
        segments={[
          {
            label: t('subtopicsPage.breadcrumbLearn'),
            href: ROUTES.learnSubjects,
            onClick: () => navigate(ROUTES.learnSubjects),
          },
          {
            label: subjectName,
            href: ROUTES.learnTopics(subjectId),
            onClick: () => navigate(ROUTES.learnTopics(subjectId)),
          },
          { label: topicName },
        ]}
      />
      <Heading variant="heading-2">{topicName}</Heading>
      <SubtopicList
        subjectId={subjectId}
        topicId={topicId}
        subjectName={subjectName}
        topicName={topicName}
      />
    </div>
  )
}
