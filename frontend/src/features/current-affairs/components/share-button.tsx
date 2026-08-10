import { Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type ShareButtonProps = {
  title: string
  excerpt: string
  url: string
}

/**
 * Share option on an article's detail screen — the Web Share API where
 * available (native share sheet on mobile/supporting desktop browsers),
 * falling back to a clipboard copy + toast confirmation everywhere else.
 * `navigator.share` rejects with an `AbortError` when the user simply
 * cancels the native sheet — that's not a failure worth surfacing.
 */
export function ShareButton({ title, excerpt, url }: ShareButtonProps) {
  const { t } = useTranslation('currentAffairs')

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: excerpt, url })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        toast.error(t('shareButton.shareError'))
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('shareButton.copySuccess'))
    } catch {
      toast.error(t('shareButton.copyError'))
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void handleShare()}>
      <Share2 />
      {t('shareButton.label')}
    </Button>
  )
}
