import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, Monitor, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import {
  getSecuritySessions,
  logoutAllOtherDevices,
  revokeSession,
} from '@/services/profileService'
import { formatRelativeTime } from '@/utils/format-date'

const QUERY_KEY = ['profile', 'security-sessions']

/** Account Recovery / Active Sessions (docs/Authentication.md §8, §10) —
 * this app is passwordless (Google + Email OTP only, no password ever
 * exists), so there is no "change password" control here; per-session
 * revoke plus "Log out of all other devices" (mirroring `POST
 * /auth/logout-all`) is what the doc defines instead for "I suspect
 * unauthorized access." A future session should not add a password field
 * to this card without re-confirming that decision with the user. */
export function SecurityCard() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const {
    data: sessions,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getSecuritySessions,
  })

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const logoutAllMutation = useMutation({
    mutationFn: logoutAllOtherDevices,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('securityCard.accountRecoveryTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Text variant="body-sm">{t('securityCard.accountRecoveryDescription')}</Text>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t('securityCard.activeSessionsTitle')}</CardTitle>
          {sessions && sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              loading={logoutAllMutation.isPending}
              onClick={() => logoutAllMutation.mutate()}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t('securityCard.logoutAllButton')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState
              title={t('securityCard.loadSessionsErrorTitle')}
              onRetry={() => void refetch()}
            />
          ) : !sessions ? (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => {
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
                        <Monitor className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Text variant="body-md" className="font-medium">
                            {session.deviceLabel}
                          </Text>
                          {session.isCurrent && (
                            <Badge variant="success" className="gap-1">
                              <ShieldCheck className="size-3" aria-hidden="true" />
                              {t('securityCard.currentDeviceBadge')}
                            </Badge>
                          )}
                        </div>
                        <Text variant="caption">
                          {t('securityCard.sessionActivity', {
                            location: session.location,
                            time: formatRelativeTime(session.lastActiveAt),
                          })}
                        </Text>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          revokeMutation.isPending &&
                          revokeMutation.variables === session.id
                        }
                        onClick={() => revokeMutation.mutate(session.id)}
                      >
                        {t('securityCard.logoutSessionButton')}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
