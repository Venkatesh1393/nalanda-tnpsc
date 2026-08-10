import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Spinner } from '@/components/spinner'
import { ToggleChip } from '@/components/inputs/toggle-chip'
import { Heading, Text } from '@/components/typography'
import { EXAM_CATEGORIES, type ExamCategoryId } from '@/constants/exam'
import { ROUTES } from '@/constants/routes'
import { globalSearch } from '@/services/searchService'
import { SEARCH_CONTENT_TYPES, type SearchContentType } from '@/types/search'

const RESULTS_PER_PAGE = 20

/**
 * Global Search's full results page (Sprint 4 Step 63) — the "See all
 * results" destination from the Cmd/Ctrl+K overlay
 * (`features/search/components/global-search.tsx`), and a real,
 * bookmarkable/shareable URL (`?q=&types=&examCategory=&page=`) in its own
 * right. Same chrome-free local header as `NotificationsPage`/
 * `AnalyticsPage` — no persistent app shell exists yet (see those pages'
 * own header comments).
 */
export function SearchPage() {
  const { t } = useTranslation('search')
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const activeTypes = searchParams.getAll('types') as SearchContentType[]
  const examCategory = (searchParams.get('examCategory') ?? undefined) as
    ExamCategoryId | undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', 'results', query, activeTypes, examCategory, page],
    queryFn: () =>
      globalSearch(
        query,
        { types: activeTypes.length > 0 ? activeTypes : undefined, examCategory },
        page,
        RESULTS_PER_PAGE,
      ),
    enabled: query.trim().length >= 2,
  })

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next)
  }

  function toggleType(type: SearchContentType) {
    updateParams((params) => {
      const next = new Set(activeTypes)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      params.delete('types')
      for (const t of next) params.append('types', t)
      params.set('page', '1')
    })
  }

  function setExamCategory(value: string) {
    updateParams((params) => {
      if (value === 'all') params.delete('examCategory')
      else params.set('examCategory', value)
      params.set('page', '1')
    })
  }

  function goToPage(nextPage: number) {
    updateParams((params) => params.set('page', String(nextPage)))
  }

  const total = data?.total ?? 0
  const subtitleKey =
    total === 1
      ? 'resultsPage.subtitleWithCountOne'
      : 'resultsPage.subtitleWithCountOther'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('overlay.triggerLabel')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <Heading variant="heading-2">{t('resultsPage.heading')}</Heading>
          {query && (
            <Text variant="body-sm">{t(subtitleKey, { count: total, query })}</Text>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SEARCH_CONTENT_TYPES.map((type) => (
            <ToggleChip
              key={type}
              role="checkbox"
              selected={activeTypes.includes(type)}
              label={t(`overlay.groups.${type}`)}
              onSelect={() => toggleType(type)}
            />
          ))}
          <Select value={examCategory ?? 'all'} onValueChange={setExamCategory}>
            <SelectTrigger size="sm" className="ml-auto w-auto min-w-32">
              <SelectValue placeholder={t('resultsPage.filters.examCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('resultsPage.filters.allTypes')}</SelectItem>
              {EXAM_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState title={t('resultsPage.errorTitle')} onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={t('resultsPage.emptyTitle')}
            description={t('resultsPage.emptyDescription')}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {data.items.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    to={result.deepLink}
                    className="hover:bg-muted flex flex-col gap-0.5 rounded-lg border p-4 transition-colors"
                  >
                    <Text variant="body-md" className="text-foreground font-medium">
                      {result.title}
                    </Text>
                    <Text variant="caption">{result.context}</Text>
                  </Link>
                </li>
              ))}
            </ul>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Text variant="caption">
                  {page} / {data.totalPages}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
