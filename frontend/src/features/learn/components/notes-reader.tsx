import { CheckCircle2, Download, Sparkles } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PremiumCard } from '@/components/premium-card'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import type { StudyNote } from '@/types/learn'

type NotesReaderProps = {
  note: StudyNote
  isComplete: boolean
  isMarkingComplete?: boolean
  onReadProgressChange: (percent: number) => void
  onMarkAsRead: () => void
}

/**
 * The PDF/Notes reading view (docs/Learn_Module.md §5) — comfortable reading
 * width, scroll-position progress tracking so a long note resumes where the
 * user left off, and the tier-gated lock treatment for Plus/Pro-only notes
 * (docs/UI_Design_System.md §36) via the shared `PremiumCard`.
 */
export function NotesReader({
  note,
  isComplete,
  isMarkingComplete = false,
  onReadProgressChange,
  onMarkAsRead,
}: NotesReaderProps) {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const scrollable = el.scrollHeight - el.clientHeight
    const percent = scrollable <= 0 ? 100 : Math.round((el.scrollTop / scrollable) * 100)
    onReadProgressChange(percent)
  }

  const body = (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="max-h-[55vh] max-w-2xl overflow-y-auto pr-2"
    >
      <Text variant="caption" className="mb-3">
        {t('notesReader.minRead', { minutes: note.estimatedReadMinutes })}
      </Text>
      <div className="flex flex-col gap-4">
        {note.paragraphs.map((paragraph, index) => (
          <Text key={index} variant="body-lg" className="text-foreground leading-relaxed">
            {paragraph}
          </Text>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {note.isPremium ? (
        <PremiumCard
          unlockLabel={t('notesReader.unlockLabel')}
          onUnlock={() => navigate(ROUTES.subscription)}
        >
          {body}
        </PremiumCard>
      ) : (
        body
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          variant="outline"
          onClick={() =>
            toast.info(
              note.isPremium
                ? t('notesReader.downloadPremiumToast')
                : t('notesReader.downloadToast'),
            )
          }
        >
          <Download />
          {t('notesReader.downloadPdf')}
        </Button>
        <Button variant="ai" onClick={() => toast.info(t('notesReader.askAiToast'))}>
          <Sparkles />
          {t('notesReader.askAi')}
        </Button>
        <Button variant="ghost" loading={isMarkingComplete} onClick={onMarkAsRead}>
          <CheckCircle2 className={isComplete ? 'text-success' : ''} />
          {isComplete ? t('notesReader.markedAsRead') : t('notesReader.markAsRead')}
        </Button>
      </div>
    </div>
  )
}
