import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { NOTIFICATION_CATEGORIES } from '@/constants/notifications'
import { NOTIFICATION_CATEGORY_ICONS } from '@/features/notifications/lib/category-icons'
import {
  getNotificationPreferences,
  setNotificationPreference,
} from '@/services/profileService'
import type { NotificationCategoryId } from '@/types/notifications'

const QUERY_KEY = ['profile', 'notification-preferences']

/** One switch per Notification category (`constants/notifications.ts`'s
 * same 4 categories the Notification Center at `ROUTES.notifications`
 * already filters by) — this is the opt-in/opt-out control the Notification
 * Center's own `docs/InformationArchitecture.md` §7.7 read-only list
 * doesn't have; toggling a category off here is what a future notification-
 * dispatch backend would check before sending, per `docs/PROJECT_CONTEXT.md`'s
 * dispatch-preference-resolver note for the real Notifications module. */
export function NotificationPreferencesCard() {
  const { t } = useTranslation(['settings', 'notifications'])
  const queryClient = useQueryClient()
  const {
    data: preferences,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getNotificationPreferences,
  })

  const mutation = useMutation({
    mutationFn: ({
      category,
      enabled,
    }: {
      category: NotificationCategoryId
      enabled: boolean
    }) => setNotificationPreference(category, enabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notificationPreferencesCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState
            title={t('notificationPreferencesCard.errorTitle')}
            onRetry={() => void refetch()}
          />
        ) : !preferences ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const Icon = NOTIFICATION_CATEGORY_ICONS[category.id]
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <Label htmlFor={`notif-pref-${category.id}`}>
                      {t(`notifications:categories.${category.id}`)}
                    </Label>
                  </div>
                  <Switch
                    id={`notif-pref-${category.id}`}
                    checked={preferences[category.id]}
                    onCheckedChange={(checked) =>
                      mutation.mutate({ category: category.id, enabled: checked })
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
