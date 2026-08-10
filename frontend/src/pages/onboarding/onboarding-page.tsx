import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { motionBase } from '@/animations/variants'
import { Logo } from '@/components/logo'
import { Spinner } from '@/components/spinner'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import {
  CompletionStep,
  ExamStep,
  GeneratePlanStep,
  isStepComplete,
  LanguageStep,
  LearningStyleStep,
  ONBOARDING_INPUT_STEPS,
  StepProgress,
  StudyHoursStep,
  TargetMonthStep,
  useOnboardingWizard,
  WeakSubjectsStep,
  type OnboardingStepId,
} from '@/features/onboarding'
import { useAuth } from '@/hooks/use-auth'

/** Steps that auto-advance the instant a choice is made (docs/Onboarding.md
 * Screens 1 and 4) — a single, unambiguous selection needs no separate
 * Continue press. Every other data-entry step requires an explicit
 * Continue, either because it's multi-select or because (Target Month)
 * the doc shows a distinct Continue action. */
const AUTO_ADVANCE_STEPS = new Set(['language', 'study-hours', 'learning-style'])

/**
 * The Onboarding wizard shell (docs/Onboarding.md, docs/Onboarding_Personalization_Flow.md)
 * — chrome-free like `AuthLayout`, but mounted directly here (rather than
 * through that layout's route) since onboarding is only ever reached by an
 * authenticated user, not the public-only auth screens. Owns step
 * navigation, the progress indicator, and Back/Continue; each step
 * component only supplies its own inputs. The last two steps (Generate
 * Plan, Completion) are deliberately excluded from the numbered progress
 * indicator and the Back/Continue footer — they're payoff/confirmation
 * moments, not data the user is filling in (docs/Onboarding.md itself
 * frames Generate Plan as "the payoff moment," not just "step 7 of 8").
 */
export function OnboardingPage() {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const wizard = useOnboardingWizard()
  const { step, stepIndex, data, isLoading, updateData, goNext, goBack, finish } = wizard
  const stepRegionRef = useRef<HTMLDivElement>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  useEffect(() => {
    stepRegionRef.current?.focus()
  }, [step])

  // `user` is real, backend-sourced state (Step 44) — an already-onboarded
  // user (including one who completed it on another device/tab) never sees
  // the wizard again, regardless of what this tab's localStorage thinks.
  if (user?.onboardingCompleted) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="lg" label={t('wizard.loadingProgress')} />
      </div>
    )
  }

  function handleAutoAdvance(patch: Partial<typeof data>) {
    updateData(patch)
    goNext()
  }

  async function handleFinish() {
    setIsFinishing(true)
    try {
      await finish()
      updateUser({ onboardingCompleted: true })
      navigate(ROUTES.dashboard, { replace: true })
    } catch {
      toast.error(t('wizard.couldNotSaveTitle'), {
        description: t('wizard.couldNotSaveDescription'),
      })
    } finally {
      setIsFinishing(false)
    }
  }

  const inputStepPosition = (
    ONBOARDING_INPUT_STEPS as readonly OnboardingStepId[]
  ).indexOf(step)
  const isInputStep = inputStepPosition !== -1
  const isAutoAdvanceStep = AUTO_ADVANCE_STEPS.has(step)
  const showBack = isInputStep && stepIndex > 0
  const showContinue = isInputStep && !isAutoAdvanceStep

  return (
    <div className="bg-muted/30 flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {isInputStep && (
            <div className="mb-6">
              <StepProgress
                currentStep={inputStepPosition + 1}
                totalSteps={ONBOARDING_INPUT_STEPS.length}
                label={t(`wizard.stepLabels.${step}`)}
              />
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              ref={stepRegionRef}
              role="group"
              aria-label={t(`wizard.stepLabels.${step}`)}
              tabIndex={-1}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={motionBase}
              className="outline-none"
            >
              {step === 'language' && (
                <LanguageStep
                  value={data.language}
                  onSelect={(language) => handleAutoAdvance({ language })}
                />
              )}
              {step === 'exam' && (
                <ExamStep
                  value={data.examCategories}
                  onChange={(examCategories) => updateData({ examCategories })}
                  language={data.language}
                />
              )}
              {step === 'target-month' && (
                <TargetMonthStep
                  value={data.targetMonth}
                  onChange={(targetMonth) => updateData({ targetMonth })}
                />
              )}
              {step === 'study-hours' && (
                <StudyHoursStep
                  value={data.studyHoursBand}
                  onSelect={(studyHoursBand) => handleAutoAdvance({ studyHoursBand })}
                />
              )}
              {step === 'weak-subjects' && (
                <WeakSubjectsStep
                  examCategories={data.examCategories}
                  value={data.weakSubjects}
                  onChange={(weakSubjects) => updateData({ weakSubjects })}
                />
              )}
              {step === 'learning-style' && (
                <LearningStyleStep
                  value={data.learningStyle}
                  onSelect={(learningStyle) => handleAutoAdvance({ learningStyle })}
                />
              )}
              {step === 'generate-plan' && (
                <GeneratePlanStep data={data} onGenerated={goNext} onFallback={goNext} />
              )}
              {step === 'completion' && (
                <CompletionStep
                  examCategories={data.examCategories}
                  onFinish={() => void handleFinish()}
                  isFinishing={isFinishing}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {(showBack || showContinue) && (
            <div className="mt-6 flex items-center justify-between gap-3">
              {showBack ? (
                <Button type="button" variant="ghost" onClick={goBack}>
                  {t('wizard.back')}
                </Button>
              ) : (
                <span />
              )}
              {showContinue && (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!isStepComplete(step, data)}
                >
                  {t('wizard.continueButton')}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
