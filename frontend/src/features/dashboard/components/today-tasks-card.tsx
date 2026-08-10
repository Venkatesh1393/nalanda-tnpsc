import { motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileText, ListChecks, RotateCcw, Video } from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { fadeInUp, motionFast, staggerChildren } from '@/animations/variants'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Text } from '@/components/typography'
import { completeTask, getTodayTasks } from '@/services/dashboardService'
import type { DashboardTask } from '@/types/dashboard'
import { cn } from '@/lib/utils'

const TASK_ICONS: Record<DashboardTask['type'], LucideIcon> = {
  video: Video,
  notes: FileText,
  quiz: ListChecks,
  revision: RotateCcw,
}

/** Widget 3 — Today's Tasks (docs/Dashboard.md §3). Completing a row is a
 * mocked mutation (no backend to persist to) — the row animates to a
 * checked, muted "done" state rather than disappearing, so a student can
 * see what they accomplished today, not just what's left. */
export function TodayTasksCard() {
  const { t } = useTranslation('dashboard')
  const {
    data: tasks,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'today-tasks'],
    queryFn: getTodayTasks,
  })
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const { mutate: markComplete } = useMutation({
    mutationFn: completeTask,
    onSuccess: ({ taskId }) => {
      setCompletedIds((previous) => new Set(previous).add(taskId))
    },
  })

  const allDone = tasks !== undefined && tasks.every((task) => completedIds.has(task.id))

  return (
    <motion.div variants={fadeInUp} className="h-full">
      <Card className="h-full">
        <CardHeader>
          <Heading variant="heading-4">{t('todayTasksCard.heading')}</Heading>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('todayTasksCard.errorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !tasks ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <Text variant="body-sm">
              {t('todayTasksCard.noPlanPrefix')}{' '}
              <span className="text-primary font-medium">
                {t('todayTasksCard.generateOne')}
              </span>{' '}
              {t('todayTasksCard.noPlanSuffix')}
            </Text>
          ) : allDone ? (
            <Text variant="body-sm" className="text-success py-2">
              {t('todayTasksCard.allDone')}
            </Text>
          ) : (
            <motion.ul
              variants={staggerChildren(0.05)}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-1"
            >
              {tasks.map((task) => {
                const Icon = TASK_ICONS[task.type]
                const isDone = completedIds.has(task.id)
                return (
                  <motion.li
                    key={task.id}
                    variants={fadeInUp}
                    transition={motionFast}
                    className="flex items-center gap-3 rounded-md px-1.5 py-2"
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={(checked) => {
                        if (checked === true) markComplete(task.id)
                      }}
                      aria-label={t('todayTasksCard.markAsDoneAriaLabel', {
                        title: task.title,
                      })}
                    />
                    <Icon
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        'text-sm transition-colors',
                        isDone && 'text-muted-foreground line-through',
                      )}
                    >
                      {task.title}
                    </span>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
