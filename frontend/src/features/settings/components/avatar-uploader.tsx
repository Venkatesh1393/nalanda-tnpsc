import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/typography'
import { getProfile, updateAvatar } from '@/services/profileService'

const MAX_FILE_BYTES = 2 * 1024 * 1024

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Local-only avatar preview — no Cloudinary integration exists yet
 * (docs/MASTER_ROADMAP.md Phase 5), so a chosen file is read as a `data:`
 * URL and stored in `localStorage` via `services/profileService.ts` rather
 * than uploaded anywhere. Disclosed via the hint text below, not hidden. */
export function AvatarUploader() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile })

  const mutation = useMutation({
    mutationFn: updateAvatar,
    onSuccess: (next) => {
      queryClient.setQueryData(['profile'], next)
    },
  })

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('avatarUploader.invalidFileType'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t('avatarUploader.fileTooLargeTitle'), {
        description: t('avatarUploader.fileTooLargeDescription'),
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      mutation.mutate(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  if (!profile) {
    return <Skeleton className="size-20 rounded-full" />
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
        <AvatarFallback className="text-lg">{initials(profile.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            loading={mutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" aria-hidden="true" />
            {t('avatarUploader.changePhoto')}
          </Button>
          {profile.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('avatarUploader.removePhotoAriaLabel')}
              onClick={() => mutation.mutate(null)}
            >
              <X aria-hidden="true" />
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <Text variant="caption">{t('avatarUploader.storedOnDeviceOnly')}</Text>
      </div>
    </div>
  )
}
