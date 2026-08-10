import { CheckCircle2, Circle, Coins, Trophy, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ScoreRing } from '@/components/charts/score-ring'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/stat-card'
import { Heading, Text } from '@/components/typography'
import type { PracticeResult } from '@/types/practice'

type PracticeSummaryCardProps = {
  result: PracticeResult
}

/**
 * The Practice Summary (docs/UserJourney.md Screen 7's `/result` view) —
 * the immediate post-submission score, distinct from the deliberate,
 * question-by-question Review mode (docs/Smart_Practice.md §8). Reuses
 * `ScoreRing` (already built for Analytics) and `StatCard` (already built
 * for Dashboard) rather than bespoke summary widgets.
 */
export function PracticeSummaryCard({ result }: PracticeSummaryCardProps) {
  const { t } = useTranslation('practice')

  const minutes = Math.floor(result.timeTakenSeconds / 60)
  const seconds = result.timeTakenSeconds % 60
  const timeTaken = t('practiceSummaryCard.timeFormat', { minutes, seconds })

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-around">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing
              value={result.accuracyPercent}
              label={t('practiceSummaryCard.accuracyLabel')}
              size={140}
            />
            <Text variant="body-sm">
              {t('practiceSummaryCard.scoreSummary', {
                correct: result.correctCount,
                total: result.totalQuestions,
                time: timeTaken,
              })}
            </Text>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-primary size-5" aria-hidden="true" />
              <Heading variant="heading-3" className="tabular-nums">
                {t('practiceSummaryCard.xpAwarded', { xp: result.xpAwarded })}
              </Heading>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="text-premium-gold size-5" aria-hidden="true" />
              <Heading variant="heading-3" className="tabular-nums">
                {t('practiceSummaryCard.coinsAwarded', { coins: result.coinsAwarded })}
              </Heading>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('shared.outcome.correct')}
          value={String(result.correctCount)}
          icon={CheckCircle2}
        />
        <StatCard
          label={t('shared.outcome.incorrect')}
          value={String(result.incorrectCount)}
          icon={XCircle}
        />
        <StatCard
          label={t('shared.outcome.skipped')}
          value={String(result.skippedCount)}
          icon={Circle}
        />
      </div>
    </div>
  )
}
