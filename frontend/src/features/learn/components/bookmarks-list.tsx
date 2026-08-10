import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, FileText, MessageSquareText, Newspaper, Video, X } from 'lucide-react'
import { useState, type ComponentType, type SVGProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { motionFast } from '@/animations/variants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { getBookmarks, removeBookmark } from '@/services/learnProgressService'
import { formatDate } from '@/utils/format-date'
import type { LearnBookmark, LearnContentType } from '@/types/learn'

type BookmarkFilter = 'all' | LearnContentType

const TABS: { value: BookmarkFilter; labelKey: 'all' | 'note' | 'video' | 'question' | 'currentAffairs' }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'note', labelKey: 'note' },
  { value: 'video', labelKey: 'video' },
  { value: 'question', labelKey: 'question' },
  { value: 'current-affairs', labelKey: 'currentAffairs' },
]

const CONTENT_ICONS: Record<LearnContentType, ComponentType<SVGProps<SVGSVGElement>>> = {
  note: FileText,
  video: Video,
  question: MessageSquareText,
  'current-affairs': Newspaper,
}

/**
 * The Bookmarks screen (docs/Learn_Module.md §7) — a pure index across
 * everything the user has saved from Learn: filter tabs at the top so a
 * large collection stays navigable, and every card deep-links back to the
 * live source content rather than duplicating it.
 */
export function BookmarksList() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<BookmarkFilter>('all')
  const queryKey = ['learn', 'bookmarks']
  const {
    data: bookmarks,
    isError,
    refetch,
  } = useQuery({ queryKey, queryFn: () => getBookmarks() })

  const removeMutation = useMutation({
    mutationFn: (bookmarkId: string) => removeBookmark(bookmarkId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['learn'] }),
  })

  if (isError) {
    return (
      <ErrorState title={t('bookmarksList.errorTitle')} onRetry={() => void refetch()} />
    )
  }

  const filtered = bookmarks?.filter((b) => filter === 'all' || b.contentType === filter)

  function openBookmark(bookmark: LearnBookmark) {
    if (bookmark.subjectId && bookmark.topicId && bookmark.subtopicId) {
      navigate(
        ROUTES.learnLesson(bookmark.subjectId, bookmark.topicId, bookmark.subtopicId),
      )
    } else if (bookmark.contentType === 'current-affairs' && bookmark.subtopicId) {
      // Current Affairs bookmarks have no Learn hierarchy home, so
      // `subtopicId` holds the article id directly (per
      // `learnProgressService.ToggleBookmarkInput`'s "unique id for the
      // bookmarked item" convention already established for Practice
      // questions).
      navigate(ROUTES.currentAffairsArticle(bookmark.subtopicId))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as BookmarkFilter)}>
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(`bookmarksList.tabs.${tab.labelKey}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!bookmarks ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={t('bookmarksList.emptyTitle')}
          description={t('bookmarksList.emptyDescription')}
          actionLabel={t('bookmarksList.browseSubjects')}
          onAction={() => navigate(ROUTES.learnSubjects)}
        />
      ) : (
        <motion.ul layout className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filtered?.map((bookmark) => {
              const Icon = CONTENT_ICONS[bookmark.contentType]
              return (
                <motion.li
                  key={bookmark.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, height: 0 }}
                  transition={motionFast}
                >
                  <Card
                    interactive={Boolean(bookmark.subtopicId)}
                    onClick={() => openBookmark(bookmark)}
                  >
                    <CardContent className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <div className="flex flex-col">
                          <Text as="span" variant="body-md" className="font-medium">
                            {bookmark.title}
                          </Text>
                          <Text variant="caption">
                            {t('bookmarksList.metaLine', {
                              subjectName: bookmark.subjectName,
                              topicName: bookmark.topicName,
                              date: formatDate(bookmark.createdAt),
                            })}
                          </Text>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('bookmarksList.removeAriaLabel', {
                          title: bookmark.title,
                        })}
                        disabled={removeMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          removeMutation.mutate(bookmark.id)
                        }}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}
