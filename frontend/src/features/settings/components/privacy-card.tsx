import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Text } from '@/components/typography'
import { useAuth } from '@/hooks/use-auth'
import { requestAccountDeletion, requestDataExport } from '@/services/profileService'

/** Privacy & Data (docs/InformationArchitecture.md §7.5, DPDP Act
 * alignment) — Export My Data and Delete Account. No real turnaround time
 * is quantified anywhere in the docs for data export (a disclosed, open
 * gap — docs/PROJECT_CONTEXT.md §13), so the confirmation copy below
 * deliberately doesn't invent one. */
export function PrivacyCard() {
  const { t } = useTranslation('settings')
  const { logout } = useAuth()

  const exportMutation = useMutation({
    mutationFn: requestDataExport,
    onSuccess: () =>
      toast.success(t('privacyCard.exportRequestedToastTitle'), {
        description: t('privacyCard.exportRequestedToastDescription'),
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: () => {
      toast.success(t('privacyCard.deletionRequestedToastTitle'), {
        description: t('privacyCard.deletionRequestedToastDescription'),
      })
      logout()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('privacyCard.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-0.5">
            <Text variant="body-md" className="font-medium">
              {t('privacyCard.exportDataTitle')}
            </Text>
            <Text variant="body-sm">{t('privacyCard.exportDataDescription')}</Text>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 gap-1.5 sm:w-auto"
            loading={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            <Download className="size-4" aria-hidden="true" />
            {t('privacyCard.exportDataButton')}
          </Button>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-0.5">
            <Text variant="body-md" className="font-medium">
              {t('privacyCard.deleteAccountTitle')}
            </Text>
            <Text variant="body-sm">{t('privacyCard.deleteAccountDescription')}</Text>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
              >
                {t('privacyCard.deleteAccountButton')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <span className="bg-destructive/10 text-destructive mb-1 flex size-10 items-center justify-center rounded-full">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <DialogTitle>{t('privacyCard.deleteDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('privacyCard.deleteDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {t('privacyCard.confirmDeleteButton')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
