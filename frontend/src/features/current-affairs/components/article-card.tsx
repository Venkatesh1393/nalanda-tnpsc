import { motion } from 'framer-motion'
import { CheckCircle2, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { fadeInUp, motionFast } from '@/animations/variants'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/typography'
import { BookmarkToggleButton } from '@/features/learn/components/bookmark-toggle-button'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/utils/format-date'
import type { CurrentAffairsItem } from '@/types/currentAffairs'

type ArticleCardProps = {
  article: CurrentAffairsItem
  onToggleBookmark: (article: CurrentAffairsItem) => void
  bookmarkPending?: boolean
}

/**
 * One feed/archive/search-result row (docs/InformationArchitecture.md
 * §7.9) — date + category badge, an `isImportant` star badge for
 * headline-worthy entries, a read-progress indicator (checkmark once past
 * the read threshold, a slim bar otherwise), and the shared bookmark toggle
 * — clicking anywhere on the card opens the article; the bookmark button
 * stops propagation so it can be tapped independently, the same convention
 * `features/learn/components/bookmarks-list.tsx` already uses.
 */
export function ArticleCard({
  article,
  onToggleBookmark,
  bookmarkPending = false,
}: ArticleCardProps) {
  const { t } = useTranslation('currentAffairs')
  const navigate = useNavigate()
  const isRead = article.readProgressPercent >= 90

  return (
    <motion.li variants={fadeInUp} layout transition={motionFast}>
      <Card
        interactive
        onClick={() => navigate(ROUTES.currentAffairsArticle(article.id))}
      >
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`categories.${article.category}`)}</Badge>
              {article.isImportant && (
                <Badge variant="premium" className="gap-1">
                  <Star className="size-3" aria-hidden="true" />
                  {t('articleCard.important')}
                </Badge>
              )}
              <Text variant="caption">{formatDate(article.date)}</Text>
            </div>
            <BookmarkToggleButton
              label={article.title}
              isBookmarked={article.isBookmarked}
              pending={bookmarkPending}
              onToggle={() => onToggleBookmark(article)}
            />
          </div>

          <Text as="span" variant="body-md" className="font-medium">
            {article.title}
          </Text>
          <Text variant="body-sm">{article.excerpt}</Text>

          <div className="flex items-center gap-2 pt-1">
            {isRead ? (
              <span className="text-success flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                {t('readStatus.read')}
              </span>
            ) : article.readProgressPercent > 0 ? (
              <div className="flex flex-1 items-center gap-2">
                <Progress
                  value={article.readProgressPercent}
                  className="h-1.5 max-w-24"
                />
                <Text variant="caption">
                  {t('readStatus.percentRead', { percent: article.readProgressPercent })}
                </Text>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.li>
  )
}
