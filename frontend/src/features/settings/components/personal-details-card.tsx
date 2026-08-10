import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/error-state'
import { FormField } from '@/components/form-field'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { getProfile, updateProfile } from '@/services/profileService'
import { formatDate } from '@/utils/format-date'

/** Schema factory, not a module-scope constant — `t` isn't available at
 * module scope. Rebuilt via `useMemo(() => makeDetailsSchema(t), [t])` so a
 * language switch mid-form re-translates validation messages (same pattern
 * as `pages/auth/register-page.tsx`'s `makeDetailsSchema`). */
function makeDetailsSchema(t: TFunction<'settings'>) {
  return z.object({
    name: z
      .string()
      .min(2, t('personalDetailsCard.validation.nameMin'))
      .max(60, t('personalDetailsCard.validation.nameMax')),
  })
}

type DetailsFormValues = z.infer<ReturnType<typeof makeDetailsSchema>>

/** Editable name, read-only email (docs/Authentication.md §10 — changing
 * the registered email is a real re-verification flow, not a plain field
 * edit, so "Change Email" is disclosed as not-yet-wired rather than faked),
 * and read-only Exam Goal/Member Since context. */
export function PersonalDetailsCard() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const {
    data: profile,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const detailsSchema = useMemo(() => makeDetailsSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (profile) reset({ name: profile.name })
  }, [profile, reset])

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (next) => {
      queryClient.setQueryData(['profile'], next)
      toast.success(t('personalDetailsCard.profileUpdatedToast'))
      reset({ name: next.name })
    },
    onError: () =>
      toast.error(t('personalDetailsCard.saveErrorToastTitle'), {
        description: t('personalDetailsCard.saveErrorToastDescription'),
      }),
  })

  if (isError) {
    return (
      <ErrorState
        title={t('personalDetailsCard.loadErrorTitle')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('personalDetailsCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!profile ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
            className="flex flex-col gap-4"
          >
            <FormField
              label={t('personalDetailsCard.nameLabel')}
              {...register('name')}
              error={errors.name?.message}
            />

            <div className="flex flex-col gap-1.5">
              <Label>{t('personalDetailsCard.emailLabel')}</Label>
              <div className="flex items-center gap-2">
                <Text variant="body-md" className="flex-1">
                  {profile.email}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toast.info(t('personalDetailsCard.changeEmailToastTitle'), {
                      description: t('personalDetailsCard.changeEmailToastDescription'),
                    })
                  }
                >
                  {t('personalDetailsCard.changeEmailButton')}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('personalDetailsCard.examGoalLabel')}</Label>
                <Text variant="body-md">{profile.examGoalLabel}</Text>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('personalDetailsCard.memberSinceLabel')}</Label>
                <Text variant="body-md">{formatDate(profile.memberSince)}</Text>
              </div>
            </div>

            <Button
              type="submit"
              className="w-fit"
              disabled={!isDirty}
              loading={isSubmitting || mutation.isPending}
            >
              {t('personalDetailsCard.saveChangesButton')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
