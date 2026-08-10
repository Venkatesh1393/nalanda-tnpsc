import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Heading } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { TopicList } from '@/features/learn'
import { getSubjects } from '@/services/learnService'

/** Topics — groupings within a subject (docs/Learn_Module.md §2). Two
 * levels deep from Learn's root, so per docs/InformationArchitecture.md §4's
 * "breadcrumbs only 3+ levels deep" rule this uses a simple back-link
 * instead of the full `BreadcrumbTrail`. */
export function TopicsPage() {
  const { t } = useTranslation('learn')
  const { subjectId = '' } = useParams()
  const { data: subjects } = useQuery({
    queryKey: ['learn', 'subjects'],
    queryFn: getSubjects,
  })
  const subjectName = subjects?.find((subject) => subject.id === subjectId)?.name

  return (
    <div className="flex flex-col gap-5">
      <Link
        to={ROUTES.learnSubjects}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t('topicsPage.backToLearn')}
      </Link>
      <Heading variant="heading-2">{subjectName ?? t('topicsPage.fallbackHeading')}</Heading>
      <TopicList subjectId={subjectId} />
    </div>
  )
}
