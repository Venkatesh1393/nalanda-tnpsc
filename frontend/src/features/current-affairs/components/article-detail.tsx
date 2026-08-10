import { CheckCircle2 } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { BookmarkToggleButton } from '@/features/learn/components/bookmark-toggle-button'
import { HighlightsCard } from '@/features/current-affairs/components/highlights-card'
import { ShareButton } from '@/features/current-affairs/components/share-button'
import { QuizDialog } from '@/features/current-affairs/components/quiz-dialog'
import { formatDate } from '@/utils/format-date'
import type { CurrentAffairsItem } from '@/types/currentAffairs'

type ArticleDetailProps = {
  article: CurrentAffairsItem
  onToggleBookmark: () => void
  bookmarkPending?: boolean
  onReadProgressChange: (percent: number) => void
  onMarkAsRead: () => void
  isMarkingRead?: boolean
}

/**
 * The article reading screen — header (category, date, Important badge),
 * scroll-tracked body (the same `scrollTop`-ratio technique
 * `features/learn/components/notes-reader.tsx` already uses for read-
 * progress, applied here to the whole article rather than a fixed-height
 * inner pane so the reading experience matches a normal article page), the
 * Important Highlights callout, exam-relevance tags, and the actions row
 * (Bookmark, Share, Quiz, Mark as Read).
 */
export function ArticleDetail({
  article,
  onToggleBookmark,
  bookmarkPending = false,
  onReadProgressChange,
  onMarkAsRead,
  isMarkingRead = false,
}: ArticleDetailProps) {
  const { t } = useTranslation('currentAffairs')
  const containerRef = useRef<HTMLDivElement>(null)
  const isRead = article.readProgressPercent >= 90

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const scrollable = el.scrollHeight - el.clientHeight
    const percent = scrollable <= 0 ? 100 : Math.round((el.scrollTop / scrollable) * 100)
    onReadProgressChange(percent)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`categories.${article.category}`)}</Badge>
          {article.isImportant && (
            <Badge variant="premium">{t('articleCard.important')}</Badge>
          )}
          <Text variant="caption">{formatDate(article.date)}</Text>
        </div>

        <Heading variant="heading-2">{article.title}</Heading>

        <div className="flex items-center gap-2">
          <Progress value={article.readProgressPercent} className="h-1.5 max-w-40" />
          <Text variant="caption">
            {isRead
              ? t('readStatus.read')
              : t('readStatus.percentRead', { percent: article.readProgressPercent })}
          </Text>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[55vh] max-w-2xl overflow-y-auto pr-2"
      >
        <div className="flex flex-col gap-4">
          {article.body.map((paragraph, index) => (
            <Text
              key={index}
              variant="body-lg"
              className="text-foreground leading-relaxed"
            >
              {paragraph}
            </Text>
          ))}
        </div>
      </div>

      <HighlightsCard highlights={article.highlights} />

      {article.examRelevanceTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.examRelevanceTags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <BookmarkToggleButton
          label={article.title}
          isBookmarked={article.isBookmarked}
          pending={bookmarkPending}
          onToggle={onToggleBookmark}
          size="icon"
        />
        <ShareButton
          title={article.title}
          excerpt={article.excerpt}
          url={window.location.href}
        />
        {article.quizAvailable && (
          <QuizDialog articleId={article.id} articleTitle={article.title} />
        )}
        <Button variant="ghost" loading={isMarkingRead} onClick={onMarkAsRead}>
          <CheckCircle2 className={isRead ? 'text-success' : ''} />
          {isRead ? t('articleDetail.markedAsRead') : t('articleDetail.markAsRead')}
        </Button>
      </div>
    </div>
  )
}
