import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { fadeInUp } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { getAiMentorTip } from '@/services/dashboardService'

/**
 * Widget 15 — AI Mentor Card (docs/Dashboard.md §15) — the AI Teal
 * treatment reserved exclusively for AI surfaces (docs/UI_Design_System.md
 * §7, §35). The doubt-chatbot panel itself isn't built yet, so "Ask AI a
 * question" surfaces an honest "coming soon" toast rather than a dead link.
 */
export function AiMentorCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: tip,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'ai-mentor-tip'],
    queryFn: getAiMentorTip,
  })

  return (
    <motion.div variants={fadeInUp}>
      <Card className="border-ai-teal/30 bg-ai-teal/5">
        <CardHeader className="flex-row items-center gap-2.5">
          <span className="bg-ai-teal/10 text-ai-teal flex size-8 items-center justify-center rounded-full">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <Heading variant="heading-4">{t('aiMentorCard.heading')}</Heading>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isError ? (
            <ErrorState
              title={t('aiMentorCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !tip ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </>
          ) : (
            <Text variant="body-md">{tip.message}</Text>
          )}
          <Button
            variant="ai"
            className="w-fit"
            onClick={() =>
              toast(t('aiMentorCard.toastTitle'), {
                description: t('aiMentorCard.toastDescription'),
              })
            }
          >
            {t('aiMentorCard.askButton')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
