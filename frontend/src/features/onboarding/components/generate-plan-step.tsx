import type { TFunction } from 'i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { motionFast } from '@/animations/variants'
import { AiOrb } from '@/components/ai-orb'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import type { OnboardingData } from '@/features/onboarding/types'
import { generateStudyPlan, type StudyPlanResult } from '@/services/onboardingService'

/** Built from `t` rather than a module-scope constant — `t` isn't
 * available at module scope. */
function buildStatusMessages(t: TFunction<'onboarding'>): string[] {
  return [
    t('generatePlan.statusMessages.understanding'),
    t('generatePlan.statusMessages.mapping'),
    t('generatePlan.statusMessages.balancing'),
    t('generatePlan.statusMessages.finalizing'),
  ]
}

/** A stable primitive (not `statusMessages.length`, which is a new array
 * every render) so the cycling interval's effect deps stay honest without
 * re-running on every language-driven re-translation. */
const STATUS_MESSAGE_COUNT = 4

type GeneratePlanStepProps = {
  data: OnboardingData
  onGenerated: (result: StudyPlanResult) => void
  onFallback: () => void
}

type GenerationAttemptProps = {
  data: OnboardingData
  onGenerated: (result: StudyPlanResult) => void
  onFallback: () => void
  onRetry: () => void
}

/** One attempt at generating the plan — mounted fresh (via a `key` on
 * `retryToken` in the parent) for every retry, so "Try Again" resets state
 * by remounting rather than by calling `setState` synchronously inside the
 * effect body (react-hooks/set-state-in-effect). */
function GenerationAttempt({
  data,
  onGenerated,
  onFallback,
  onRetry,
}: GenerationAttemptProps) {
  const { t } = useTranslation('onboarding')
  const statusMessages = buildStatusMessages(t)
  const [messageIndex, setMessageIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const interval = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % STATUS_MESSAGE_COUNT)
    }, 1800)

    generateStudyPlan(data)
      .then((result) => {
        if (!cancelled) onGenerated(result)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [data, onGenerated])

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AiOrb size="md" className="opacity-60" />
        <Heading variant="heading-3">{t('generatePlan.failedTitle')}</Heading>
        <Text variant="body-sm">{t('generatePlan.failedDescription')}</Text>
        <div className="flex w-full flex-col gap-2">
          <Button type="button" className="w-full" onClick={onFallback}>
            {t('generatePlan.continueWithGeneral')}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onRetry}>
            {t('generatePlan.tryAgain')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center gap-6 text-center"
      role="status"
      aria-live="polite"
    >
      <AiOrb pulseSeconds={2} />
      <Heading variant="heading-3">{t('generatePlan.buildingTitle')}</Heading>
      <AnimatePresence mode="wait">
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={motionFast}
        >
          <Text variant="body-sm">{statusMessages[messageIndex]}</Text>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * Step 7 — Generate AI Study Plan (docs/Onboarding.md Screen 6) — the
 * onboarding wizard's payoff moment, deliberately never a bare spinner. The
 * `AiOrb` reappears here exactly as it looked in the Landing Page Hero
 * (deliberate visual continuity, §6), now pulsing faster to read as
 * "actively working" rather than "waiting," while status copy cross-fades
 * through the real phases of generation every ~1.8s. If generation takes
 * longer than the message sequence, it loops on the final line rather than
 * stalling or reverting to generic "please wait" text. A thrown error
 * (`AI_SERVICE_UNAVAILABLE`, docs/API.md §12) never blocks the user from
 * reaching the Dashboard — "Continue with General Plan" is a fully
 * legitimate path, not a degraded/apologetic one.
 */
export function GeneratePlanStep({
  data,
  onGenerated,
  onFallback,
}: GeneratePlanStepProps) {
  const [retryToken, setRetryToken] = useState(0)

  return (
    <GenerationAttempt
      key={retryToken}
      data={data}
      onGenerated={onGenerated}
      onFallback={onFallback}
      onRetry={() => setRetryToken((token) => token + 1)}
    />
  )
}
