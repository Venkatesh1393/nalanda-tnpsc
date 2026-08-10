import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, MessageCircle, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PremiumCard } from '@/components/premium-card'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/use-language'
import { explainQuestion, getAiExplanationErrorCode } from '@/services/aiService'
import type { PracticeQuestionOption } from '@/types/practice'

type AiExplanationPanelProps = {
  /** The underlying factual explanation, shown as-is once an answer is
   * revealed — always available, on every tier (Step 46 §7). */
  standardExplanation: string
  selectedOptionId: string | null
  correctOptionId: string
  options: PracticeQuestionOption[]
  /** `false` for free-tier users — the AI Explanation section renders
   * locked behind the existing `PremiumCard` upgrade treatment instead of
   * its real content. Sourced from the backend's `ai_explanations`
   * entitlement (Step 55), never re-derived from a raw tier string. */
  isPremiumEntitled: boolean
  /** The real, backend-tracked session + question this explanation is for
   * (Sprint 4 Step 57). Only Topic Quiz sessions have one — see
   * `canRequestAi`. */
  sessionId: string
  questionId: string
  /** `false` for mock-mode sessions (Sectional/Mock/PYQ/100 Questions —
   * still `localStorage`-backed, no real question/session id to send the
   * AI endpoint) — shows an honest "not available in this mode" message
   * instead of a button that would 404. */
  canRequestAi: boolean
  className?: string
}

/**
 * Wrong-Answer Experience (docs/Smart_Practice.md §5, Step 46 §7-§8, real AI
 * as of Sprint 4 Step 57): ❌/✅ status plus correct answer come from
 * `components/question-card.tsx` itself once `correctOptionId` is passed
 * in; this panel supplies the two explanation layers beneath it. Standard
 * Explanation is always visible and is a completely separate render path —
 * nothing in the AI section below can ever prevent it from showing. AI
 * Explanation is on-demand (a real click, never called automatically) and
 * gracefully degrades to an inline message on quota/provider failure,
 * per this step's explicit "never break Smart Practice because AI is
 * unavailable" requirement.
 */
export function AiExplanationPanel({
  standardExplanation,
  selectedOptionId,
  correctOptionId,
  options,
  isPremiumEntitled,
  sessionId,
  questionId,
  canRequestAi,
  className,
}: AiExplanationPanelProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('practice')
  const { language } = useLanguage()
  const selectedOption = options.find((option) => option.id === selectedOptionId)
  const correctOption = options.find((option) => option.id === correctOptionId)
  const wasCorrect = selectedOptionId === correctOptionId

  const explainMutation = useMutation({
    mutationFn: () => explainQuestion(sessionId, questionId, language),
  })
  const { reset: resetExplanation } = explainMutation

  // A fresh question (nav'd via Next/Previous or the palette) should start
  // from the "get explanation" button again, not show the previous
  // question's cached result or error.
  useEffect(() => {
    resetExplanation()
  }, [questionId, resetExplanation])

  const acknowledgement = selectedOption
    ? wasCorrect
      ? t('aiExplanationPanel.acknowledgementCorrect', { selected: selectedOption.text })
      : t('aiExplanationPanel.acknowledgementIncorrect', {
          selected: selectedOption.text,
          correct: correctOption?.text,
        })
    : t('aiExplanationPanel.acknowledgementUnanswered', { correct: correctOption?.text })

  const aiExplanationTeaser = (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Sparkles className="text-ai-teal size-4" aria-hidden="true" />
        <Heading variant="heading-4">{t('aiExplanationPanel.aiExplanationTitle')}</Heading>
      </CardHeader>
      <CardContent>
        <Text variant="body-sm">{t('aiExplanationPanel.teaserBody')}</Text>
      </CardContent>
    </Card>
  )

  function handleGetExplanation() {
    explainMutation.mutate(undefined, {
      onError: (error) => {
        const code = getAiExplanationErrorCode(error)
        if (code === 'DAILY_AI_LIMIT_REACHED') {
          toast.info(t('aiExplanationPanel.quotaReachedToast'))
        }
      },
    })
  }

  const errorCode = explainMutation.isError
    ? getAiExplanationErrorCode(explainMutation.error)
    : undefined

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader>
            <Heading variant="heading-4">
              {t('aiExplanationPanel.standardExplanationTitle')}
            </Heading>
          </CardHeader>
          <CardContent>
            <Text variant="body-md">
              {acknowledgement} {standardExplanation}
            </Text>
          </CardContent>
        </Card>

        {isPremiumEntitled ? (
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Sparkles className="text-ai-teal size-4" aria-hidden="true" />
              <Heading variant="heading-4">
                {t('aiExplanationPanel.aiExplanationTitle')}
              </Heading>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!canRequestAi ? (
                <Text variant="body-sm" className="text-muted-foreground">
                  {t('aiExplanationPanel.notAvailableForModeBody')}
                </Text>
              ) : explainMutation.data ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Text variant="body-sm" className="font-medium">
                      {t('aiExplanationPanel.whyCorrectTitle')}
                    </Text>
                    <Text variant="body-sm">{explainMutation.data.whyCorrectIsCorrect}</Text>
                  </div>
                  {explainMutation.data.whyYourAnswerIsWrong && (
                    <div className="flex flex-col gap-1">
                      <Text variant="body-sm" className="font-medium">
                        {t('aiExplanationPanel.whyYoursWrongTitle')}
                      </Text>
                      <Text variant="body-sm">
                        {explainMutation.data.whyYourAnswerIsWrong}
                      </Text>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Text variant="body-sm" className="font-medium">
                      {t('aiExplanationPanel.keyConceptTitle')}
                    </Text>
                    <Text variant="body-sm">{explainMutation.data.keyConcept}</Text>
                  </div>
                  {explainMutation.data.memoryTrick && (
                    <div className="flex flex-col gap-1">
                      <Text variant="body-sm" className="font-medium">
                        {t('aiExplanationPanel.memoryTrickTitle')}
                      </Text>
                      <Text variant="body-sm">{explainMutation.data.memoryTrick}</Text>
                    </div>
                  )}
                  {explainMutation.data.examRelevance && (
                    <div className="flex flex-col gap-1">
                      <Text variant="body-sm" className="font-medium">
                        {t('aiExplanationPanel.examRelevanceTitle')}
                      </Text>
                      <Text variant="body-sm">{explainMutation.data.examRelevance}</Text>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    asChild
                  >
                    <Link
                      to={`${ROUTES.aiTutor}?contextType=question&contextRefId=${questionId}`}
                    >
                      <MessageCircle />
                      {t('aiExplanationPanel.askFollowUpButton')}
                    </Link>
                  </Button>
                </div>
              ) : explainMutation.isError ? (
                <div className="bg-muted flex flex-col gap-2 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <Text variant="body-sm" className="font-medium">
                      {errorCode === 'DAILY_AI_LIMIT_REACHED'
                        ? t('aiExplanationPanel.quotaReachedTitle')
                        : t('aiExplanationPanel.unavailableTitle')}
                    </Text>
                  </div>
                  <Text variant="body-sm" className="text-muted-foreground">
                    {errorCode === 'DAILY_AI_LIMIT_REACHED'
                      ? t('aiExplanationPanel.quotaReachedBody')
                      : t('aiExplanationPanel.unavailableBody')}
                  </Text>
                  {errorCode !== 'DAILY_AI_LIMIT_REACHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={handleGetExplanation}
                    >
                      {t('aiExplanationPanel.retryButton')}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="ai"
                  size="sm"
                  className="w-fit"
                  loading={explainMutation.isPending}
                  onClick={handleGetExplanation}
                >
                  <Sparkles />
                  {t('aiExplanationPanel.getExplanationButton')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <PremiumCard
            unlockLabel={t('aiExplanationPanel.premiumUnlockLabel')}
            onUnlock={() => navigate(ROUTES.subscription)}
          >
            {aiExplanationTeaser}
          </PremiumCard>
        )}
      </div>
    </div>
  )
}
