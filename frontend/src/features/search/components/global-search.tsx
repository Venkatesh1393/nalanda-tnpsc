import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Search, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Spinner } from '@/components/spinner'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import {
  autocompleteSearch,
  getPopularSearches,
  getRecentSearches,
  removeRecentSearch,
} from '@/services/searchService'
import { SEARCH_CONTENT_TYPES, type GlobalSearchResult } from '@/types/search'
import { debounce } from '@/utils/debounce'

const MIN_QUERY_LENGTH = 2

/**
 * The platform-wide Search overlay (Sprint 4 Step 63, docs/Navigation.md
 * §7) — Cmd/Ctrl+K from anywhere in the authenticated app (mounted once by
 * `routes/protected-route.tsx`, alongside every page's `<Outlet />`, since
 * no shared top-bar shell exists yet to host a search icon — see that
 * file's header comment). Spans all six content types in one query;
 * grouped results here are capped per type by the backend's own
 * autocomplete endpoint, with a "See all results" row handing off to the
 * full, paginated, filterable `SearchPage`.
 */
export function GlobalSearch() {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 200), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((previous) => {
          const next = !previous
          if (!next) {
            setQuery('')
            setDebouncedQuery('')
          }
          return next
        })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setDebouncedQuery('')
    }
  }

  const trimmedQuery = debouncedQuery.trim()
  const showResults = trimmedQuery.length >= MIN_QUERY_LENGTH

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', 'autocomplete', trimmedQuery],
    queryFn: () => autocompleteSearch(trimmedQuery),
    enabled: showResults,
  })

  const { data: recentSearches } = useQuery({
    queryKey: ['search', 'recent'],
    queryFn: getRecentSearches,
    enabled: open && !showResults,
  })

  const { data: popularSearches } = useQuery({
    queryKey: ['search', 'popular'],
    queryFn: getPopularSearches,
    enabled: open && !showResults,
  })

  function goToResult(result: GlobalSearchResult) {
    handleOpenChange(false)
    navigate(result.deepLink)
  }

  function goToFullResults(q: string) {
    if (q.trim().length === 0) return
    handleOpenChange(false)
    navigate(`${ROUTES.search}?q=${encodeURIComponent(q.trim())}`)
  }

  async function handleRemoveRecent(q: string, event: React.MouseEvent) {
    event.stopPropagation()
    await removeRecentSearch(q)
    await queryClient.invalidateQueries({ queryKey: ['search', 'recent'] })
  }

  const hasHistory =
    (recentSearches && recentSearches.length > 0) ||
    (popularSearches && popularSearches.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-foreground ring-foreground/10 fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg ring-1 transition-opacity hover:opacity-90"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('overlay.triggerLabel')}</span>
        <CommandShortcut className="text-primary-foreground/70 hidden sm:inline">
          ⌘K
        </CommandShortcut>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={t('overlay.triggerLabel')}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('overlay.placeholder')}
            value={query}
            onValueChange={(value) => {
              setQuery(value)
              debouncedSetQuery(value)
            }}
          />
          <CommandList>
            {!showResults ? (
              hasHistory ? (
                <>
                  {recentSearches && recentSearches.length > 0 && (
                    <CommandGroup heading={t('overlay.recentHeading')}>
                      {recentSearches.map((item) => (
                        <CommandItem
                          key={item.query}
                          value={`recent-${item.query}`}
                          onSelect={() => goToFullResults(item.query)}
                        >
                          <History className="size-4" aria-hidden="true" />
                          <span>{item.query}</span>
                          <button
                            type="button"
                            aria-label={t('overlay.clearRecent')}
                            onClick={(event) => handleRemoveRecent(item.query, event)}
                            className="text-muted-foreground hover:text-foreground ml-auto"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {popularSearches && popularSearches.length > 0 && (
                    <CommandGroup heading={t('overlay.popularHeading')}>
                      {popularSearches.map((item) => (
                        <CommandItem
                          key={item.query}
                          value={`popular-${item.query}`}
                          onSelect={() => goToFullResults(item.query)}
                        >
                          <TrendingUp className="size-4" aria-hidden="true" />
                          <span>{item.query}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              ) : (
                <CommandEmpty>{t('overlay.emptyState')}</CommandEmpty>
              )
            ) : isFetching && !results ? (
              <div className="flex items-center justify-center p-4">
                <Spinner size="sm" />
              </div>
            ) : results && results.length === 0 ? (
              <CommandEmpty>
                {t('overlay.noMatches', { query: trimmedQuery })}
              </CommandEmpty>
            ) : (
              <>
                {SEARCH_CONTENT_TYPES.map((type) => {
                  const group = results?.filter((result) => result.type === type)
                  if (!group || group.length === 0) return null
                  return (
                    <CommandGroup key={type} heading={t(`overlay.groups.${type}`)}>
                      {group.map((result) => (
                        <CommandItem
                          key={`${result.type}-${result.id}`}
                          value={`${result.type}-${result.id}`}
                          onSelect={() => goToResult(result)}
                        >
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            <Text variant="caption">{result.context}</Text>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })}
                <CommandGroup>
                  <CommandItem
                    value="see-all-results"
                    onSelect={() => goToFullResults(trimmedQuery)}
                  >
                    <Search className="size-4" aria-hidden="true" />
                    <span>{t('overlay.seeAllResults', { query: trimmedQuery })}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
