import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { BookmarksList } from '@/features/learn'

/** Bookmarks — cross-module save index (docs/Learn_Module.md §7). */
export function BookmarksPage() {
  const { t } = useTranslation('learn')

  return (
    <div className="flex flex-col gap-5">
      <Link
        to={ROUTES.learnSubjects}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t('bookmarksPage.backToLearn')}
      </Link>
      <div className="flex flex-col gap-1">
        <Heading variant="heading-2">{t('bookmarksPage.heading')}</Heading>
        <Text variant="body-sm">{t('bookmarksPage.subtitle')}</Text>
      </div>
      <BookmarksList />
    </div>
  )
}
