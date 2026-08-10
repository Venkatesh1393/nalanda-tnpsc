import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES, type ExamCategoryId } from '@/constants/exam'
import { useLanguage } from '@/hooks/use-language'

type CompletionStepProps = {
  examCategories: ExamCategoryId[]
  onFinish: () => void
  isFinishing?: boolean
}

/**
 * Step 8 — Completion — requested alongside this flow as a distinct final
 * screen (docs/Onboarding.md itself fades the Generate-Plan screen straight
 * into the Dashboard; see docs/PROJECT_CONTEXT.md §14 for this deviation).
 * Deliberately calm rather than using `motionCelebratory`
 * (docs/UI_Design_System.md §19/§32) — that treatment is reserved for
 * genuine, earned in-product milestones (a streak, a finished mock test),
 * the same reasoning already applied to Registration/OTP (never
 * celebratory for an administrative setup step, however satisfying).
 */
export function CompletionStep({
  examCategories,
  onFinish,
  isFinishing = false,
}: CompletionStepProps) {
  const { t } = useTranslation('onboarding')
  const { language } = useLanguage()
  const examLabel = EXAM_CATEGORIES.filter((option) => examCategories.includes(option.id))
    .map((option) => option.label[language])
    .join(', ')

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
        <CircleCheck className="size-6" aria-hidden="true" />
      </span>
      <Heading variant="heading-2">{t('completion.allSet')}</Heading>
      <Text variant="body-sm">
        {examLabel
          ? t('completion.planReadyFor', { exam: examLabel })
          : t('completion.planReady')}
      </Text>
      <Button type="button" className="w-full" onClick={onFinish} loading={isFinishing}>
        {t('completion.goToDashboard')}
      </Button>
    </div>
  )
}
