import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Autocomplete } from '@/components/inputs/autocomplete'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { MODE_META } from '@/features/practice/lib/mode-meta'
import { findSubtopicLocation, getSubjects, getTopics } from '@/services/learnService'
import { getPyqYears } from '@/services/practiceService'
import { createSession } from '@/services/practiceSessionService'
import type { PracticeMode, QuestionDifficulty } from '@/types/practice'

const EXAM_CATEGORY = 'group-4'

// Step 46 §4 — dev-scoped question-count options; the architecture (random
// `$sample` selection server-side) supports 100+ per topic without change
// once real production content exists at that scale.
const QUESTION_COUNT_OPTIONS = [5, 10, 20, 25] as const
const DIFFICULTY_VALUES: ('all' | QuestionDifficulty)[] = [
  'all',
  'easy',
  'medium',
  'hard',
]

type ModeConfigFormProps = {
  mode: PracticeMode
}

function isQuestionDifficulty(value: string | null): value is QuestionDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

/**
 * The per-mode start screen (`/app/practice/:mode`) — Topic Quiz/Sectional
 * get a subject (+ topic, Quiz only) picker reusing `services/learnService.ts`
 * so the same subjects browsable in Learn are practiceable here; PYQ gets a
 * year picker (docs/Smart_Practice.md §7); 100 Questions/Mock need no
 * configuration. A `?subtopicId=` query param — set by Learn's existing
 * "Practice This Topic" button (docs/Learn_Module.md §6) — pre-fills the
 * Quiz config automatically. `?subjectId=&topicId=&difficulty=&count=` —
 * set by the Adaptive Practice Engine's Dashboard "Recommended Topics" card
 * (Sprint 4 Step 60) — pre-fill the same config with the engine's own
 * suggested topic/difficulty/question count, still fully editable.
 */
export function ModeConfigForm({ mode }: ModeConfigFormProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subtopicIdFromHandoff = searchParams.get('subtopicId')
  const recommendedSubjectId = searchParams.get('subjectId') ?? undefined
  const recommendedTopicId = searchParams.get('topicId') ?? undefined
  const recommendedDifficultyParam = searchParams.get('difficulty')
  const recommendedCountParam = searchParams.get('count')
  const { t } = useTranslation(['common', 'practice'])

  // Pre-fill from Learn's "Practice This Topic" handoff (docs/Learn_Module.md
  // §6) — `findSubtopicLocation` is a real backend lookup now (Step 45).
  // `subjectId`/`topicId` are derived (handoff result, unless the user has
  // explicitly picked something via the dropdowns below) rather than
  // synced into state from an effect, avoiding a `setState`-in-effect
  // cascading render for what's fundamentally just a query-backed default.
  const { data: handoffLocation } = useQuery({
    queryKey: ['learn', 'subtopic-location', subtopicIdFromHandoff],
    queryFn: () => findSubtopicLocation(subtopicIdFromHandoff as string),
    enabled: Boolean(subtopicIdFromHandoff) && mode === 'quiz',
  })

  const [subjectIdOverride, setSubjectIdOverride] = useState<string | undefined>(
    recommendedSubjectId,
  )
  const [topicIdOverride, setTopicIdOverride] = useState<string | undefined>(
    recommendedTopicId,
  )
  const [pyqYear, setPyqYear] = useState<number | undefined>()
  const [questionCount, setQuestionCount] = useState<number>(
    recommendedCountParam ? Number(recommendedCountParam) : 10,
  )
  const [difficulty, setDifficulty] = useState<'all' | QuestionDifficulty>(
    isQuestionDifficulty(recommendedDifficultyParam) ? recommendedDifficultyParam : 'all',
  )
  const [isStarting, setIsStarting] = useState(false)

  const subjectId =
    subjectIdOverride ?? (mode === 'quiz' ? handoffLocation?.subjectId : undefined)
  const topicId =
    topicIdOverride ?? (mode === 'quiz' ? handoffLocation?.topicId : undefined)

  function setSubjectId(value: string | undefined) {
    setSubjectIdOverride(value)
    setTopicIdOverride(undefined)
  }

  const { data: subjects } = useQuery({
    queryKey: ['learn', 'subjects'],
    queryFn: getSubjects,
  })
  const { data: topics } = useQuery({
    queryKey: ['learn', 'topics', subjectId],
    queryFn: () => getTopics(subjectId as string),
    enabled: Boolean(subjectId) && mode === 'quiz',
  })
  const pyqYears = useMemo(() => getPyqYears(), [])

  const meta = MODE_META[mode]
  const modeTitle = t(meta.titleKey)
  const subjectOptions = subjects?.map((s) => ({ value: s.id, label: s.name })) ?? []
  const topicOptions = topics?.map((topic) => ({ value: topic.id, label: topic.name })) ?? []
  const canStart =
    mode === 'quiz'
      ? Boolean(subjectId) && Boolean(topicId)
      : mode !== 'pyq' || pyqYears.length === 0 || pyqYear !== undefined

  function difficultyLabel(value: 'all' | QuestionDifficulty): string {
    return value === 'all'
      ? t('practice:modeConfigForm.difficultyAll')
      : t(`common:difficulty.${value}`)
  }

  async function handleStart() {
    setIsStarting(true)
    try {
      const session = await createSession({
        mode,
        examCategory: EXAM_CATEGORY,
        subjectName: subjects?.find((s) => s.id === subjectId)?.name,
        topicName: topics?.find((topic) => topic.id === topicId)?.name,
        pyqYear,
        subjectId,
        topicId,
        questionCount,
        difficulty,
      })
      navigate(ROUTES.practiceSession(session.id))
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading variant="heading-2">{modeTitle}</Heading>
        <Text variant="body-sm">{t(meta.descriptionKey)}</Text>
      </div>

      {(mode === 'quiz' || mode === 'sectional') && (
        <div className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label>
              {mode === 'quiz'
                ? t('practice:modeConfigForm.subjectRequiredLabel')
                : t('practice:modeConfigForm.subjectLabel')}
            </Label>
            <Autocomplete
              options={subjectOptions}
              value={subjectId}
              onChange={setSubjectId}
              placeholder={
                mode === 'quiz'
                  ? t('practice:modeConfigForm.chooseSubjectPlaceholder')
                  : t('practice:modeConfigForm.chooseSubjectOptionalPlaceholder')
              }
            />
          </div>
          {mode === 'quiz' && subjectId && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('practice:modeConfigForm.topicRequiredLabel')}</Label>
              <Autocomplete
                options={topicOptions}
                value={topicId}
                onChange={setTopicIdOverride}
                placeholder={t('practice:modeConfigForm.chooseTopicPlaceholder')}
              />
            </div>
          )}
        </div>
      )}

      {mode === 'quiz' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t('practice:modeConfigForm.numberOfQuestionsLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <ToggleChip
                  key={count}
                  role="radio"
                  label={String(count)}
                  selected={questionCount === count}
                  onSelect={() => setQuestionCount(count)}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('practice:modeConfigForm.difficultyLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_VALUES.map((value) => (
                <ToggleChip
                  key={value}
                  role="radio"
                  label={difficultyLabel(value)}
                  selected={difficulty === value}
                  onSelect={() => setDifficulty(value)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'pyq' && pyqYears.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>{t('practice:modeConfigForm.yearLabel')}</Label>
          <div className="flex flex-wrap gap-2">
            {pyqYears.map((year) => (
              <ToggleChip
                key={year}
                role="radio"
                label={String(year)}
                selected={pyqYear === year}
                onSelect={() => setPyqYear(year)}
              />
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-fit"
        loading={isStarting}
        disabled={!canStart}
        onClick={() => void handleStart()}
      >
        {t('practice:modeConfigForm.startButton', { modeTitle })}
      </Button>
    </div>
  )
}
