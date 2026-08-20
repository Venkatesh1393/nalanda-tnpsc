import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, FileText, LayoutDashboard, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import axios from 'axios'

import { fadeInUp, staggerChildren } from '@/animations/variants'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { usePaperUnlockCheckout } from '@/features/payments/hooks/use-paper-unlock-checkout'
import { downloadPaper, listPapers } from '@/services/questionPapersService'
import type { QuestionPaper } from '@/types/questionPapers'

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
}

function isPaywallError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error
    ?.code
  return code === 'PAPER_PAYWALL_REQUIRED'
}

/**
 * Previous Year Question Papers — real, admin-uploaded PDFs by exam+year
 * (`backend/src/services/questionPaper.service.ts`), distinct from
 * Practice's PYQ mode (which practices individual PYQ-tagged questions, not
 * real paper documents). Renders its own minimal chrome-free header rather
 * than a real sidebar/top-bar shell — the same known, temporary
 * simplification `pages/notifications/notifications-page.tsx` already uses
 * ahead of `layouts/dashboard-layout.tsx` (still not built).
 */
export function QuestionPapersPage() {
  const { t } = useTranslation('questionPapers')
  const queryClient = useQueryClient()
  const { unlock, isProcessing } = usePaperUnlockCheckout()
  const [year, setYear] = useState<number | undefined>(undefined)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['question-papers', { year }],
    queryFn: () => listPapers({ year, page: 1, limit: 50 }),
  })

  const years = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.items.map((p) => p.year))).sort((a, b) => b - a)
  }, [data])

  async function handleDownload(paper: QuestionPaper) {
    if (!paper.isAccessible) {
      void unlock()
      return
    }
    setDownloadingId(paper.id)
    try {
      const { fileUrl } = await downloadPaper(paper.id)
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      await queryClient.invalidateQueries({ queryKey: ['question-papers'] })
    } catch (error) {
      if (isPaywallError(error)) void unlock()
      else toast.error(t('downloadErrorToast'))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('page.dashboard')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <motion.main
        variants={staggerChildren(0.08)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <motion.div variants={fadeInUp} className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('page.heading')}</Heading>
          <Text variant="body-sm">{t('page.subtitle')}</Text>
        </motion.div>

        {data && (
          <motion.div variants={fadeInUp}>
            <Badge variant={data.isUnlocked ? 'success' : 'secondary'}>
              {data.isUnlocked
                ? t('freeBanner.unlocked')
                : data.freeSlotsRemaining > 0
                  ? t('freeBanner.remaining', { count: data.freeSlotsRemaining })
                  : t('freeBanner.exhausted')}
            </Badge>
          </motion.div>
        )}

        {years.length > 1 && (
          <motion.div variants={fadeInUp} className="flex flex-wrap gap-2">
            <ToggleChip
              role="radio"
              label={t('filters.allYears')}
              selected={year === undefined}
              onSelect={() => setYear(undefined)}
            />
            {years.map((y) => (
              <ToggleChip
                key={y}
                role="radio"
                label={String(y)}
                selected={year === y}
                onSelect={() => setYear(y)}
              />
            ))}
          </motion.div>
        )}

        {isError ? (
          <ErrorState title={t('loadErrorTitle')} onRetry={() => void refetch()} />
        ) : isPending || !data ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        ) : (
          <motion.div variants={fadeInUp} className="flex flex-col gap-3">
            {data.items.map((paper) => (
              <Card key={paper.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col gap-1">
                    <Text variant="body-lg" className="font-medium">
                      {pickText(paper.title)}
                    </Text>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{paper.year}</Badge>
                      {paper.tnpscExamType && (
                        <Badge variant="outline" className="capitalize">
                          {paper.tnpscExamType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={paper.isAccessible ? 'default' : 'outline'}
                    size="sm"
                    loading={downloadingId === paper.id}
                    onClick={() => void handleDownload(paper)}
                  >
                    {paper.isAccessible ? (
                      <>
                        <Download className="size-3.5" /> {t('card.download')}
                      </>
                    ) : (
                      <>
                        <Lock className="size-3.5" /> {t('card.locked')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {!data?.isUnlocked && (data?.freeSlotsRemaining ?? 0) === 0 && data && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <span className="bg-premium-gold/10 text-premium-gold flex size-9 items-center justify-center rounded-full">
                  <Lock className="size-4" aria-hidden="true" />
                </span>
                <Heading variant="heading-4">{t('paywall.title')}</Heading>
                <Text variant="body-sm" className="max-w-sm">
                  {t('paywall.description', { limit: data.freeLimit })}
                </Text>
                <Button loading={isProcessing} onClick={() => void unlock()}>
                  {t('paywall.unlockButton')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.main>
    </div>
  )
}
