import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { LiveExamCard, MyAttemptCard } from '@/features/live-exams'
import { getLiveExams, getMyLiveExamAttempts } from '@/services/liveExamService'
import type { LiveExamTab } from '@/types/liveExam'

type PageTab = LiveExamTab | 'my-attempts'

const TAB_VALUES: PageTab[] = ['upcoming', 'live', 'completed', 'my-attempts']

function isPageTab(value: string | undefined): value is PageTab {
  return TAB_VALUES.some((v) => v === value)
}

function ExamListTabContent({ tab }: { tab: LiveExamTab }) {
  const { t } = useTranslation('liveExams')
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['live-exams', 'list', tab],
    queryFn: () => getLiveExams(tab),
  })

  if (isError) {
    return <ErrorState title={t('examList.errorTitle')} onRetry={() => void refetch()} />
  }
  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title={t(`examList.emptyTitle.${tab}`)}
        description={t('examList.emptyDescription')}
        actionLabel={t('page.backToDashboard')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {data.map((exam) => (
        <LiveExamCard key={exam.id} exam={exam} />
      ))}
    </div>
  )
}

function MyAttemptsTabContent() {
  const { t } = useTranslation('liveExams')
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['live-exams', 'my-attempts'],
    queryFn: getMyLiveExamAttempts,
  })

  if (isError) {
    return (
      <ErrorState title={t('myAttempts.errorTitle')} onRetry={() => void refetch()} />
    )
  }
  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title={t('myAttempts.emptyTitle')}
        description={t('myAttempts.emptyDescription')}
        actionLabel={t('myAttempts.browseUpcoming')}
        onAction={() => navigate(ROUTES.liveExams('upcoming'))}
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {data.map((attempt) => (
        <MyAttemptCard key={attempt.attemptId} attempt={attempt} />
      ))}
    </div>
  )
}

/** `/app/live-exams/:tab` — Weekly Live Exam's entry point (Step 48,
 * docs/InformationArchitecture.md §7.10): Upcoming/Live/Completed/My
 * Attempts, one `ToggleChip` row, the same tab-switch pattern
 * `CurrentAffairsPage` already established for its Daily/Weekly/Monthly
 * period switch. Each tab's data-fetching lives in its own child
 * component so an invalid `:tab` can early-return here without violating
 * the rules of hooks. */
export function LiveExamsPage() {
  const { t } = useTranslation('liveExams')
  const { tab } = useParams()
  const navigate = useNavigate()

  const tabs: { value: PageTab; label: string }[] = [
    { value: 'upcoming', label: t('tabs.upcoming') },
    { value: 'live', label: t('tabs.live') },
    { value: 'completed', label: t('tabs.completed') },
    { value: 'my-attempts', label: t('tabs.myAttempts') },
  ]

  if (!isPageTab(tab)) {
    return (
      <EmptyState
        title={t('page.unknownTabTitle')}
        description={t('page.unknownTabDescription')}
        actionLabel={t('page.backToDashboard')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading variant="heading-2">{t('page.heading')}</Heading>
        <Text variant="body-sm">{t('page.subtitle')}</Text>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tabItem) => (
          <ToggleChip
            key={tabItem.value}
            role="radio"
            label={tabItem.label}
            selected={tab === tabItem.value}
            onSelect={() => navigate(ROUTES.liveExams(tabItem.value))}
          />
        ))}
      </div>

      {tab === 'my-attempts' ? (
        <MyAttemptsTabContent />
      ) : (
        <ExamListTabContent tab={tab} />
      )}
    </div>
  )
}
