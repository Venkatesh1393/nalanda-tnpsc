import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { SearchInput } from '@/components/inputs/search-input'
import { Spinner } from '@/components/spinner'
import { Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { searchCurrentAffairs } from '@/services/currentAffairsService'
import { formatDate } from '@/utils/format-date'

/**
 * Current Affairs' search bar — same debounced-overlay shape as Learn's
 * search (`features/learn/components/learn-search.tsx`), searching across
 * every article's title/tags/category regardless of period, since a user
 * looking for something specific shouldn't have to know or guess whether
 * it was a daily update or a monthly capsule.
 */
export function CurrentAffairsSearch() {
  const { t } = useTranslation('currentAffairs')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const showResults = debouncedQuery.trim().length >= 2

  const { data: results, isFetching } = useQuery({
    queryKey: ['current-affairs', 'search', debouncedQuery],
    queryFn: () => searchCurrentAffairs(debouncedQuery),
    enabled: showResults,
  })

  function goToResult(id: string) {
    setQuery('')
    setDebouncedQuery('')
    navigate(ROUTES.currentAffairsArticle(id))
  }

  return (
    <div className="relative">
      <SearchInput
        placeholder={t('currentAffairsSearch.placeholder')}
        value={query}
        onChange={setQuery}
        onDebouncedChange={setDebouncedQuery}
        onClear={() => setDebouncedQuery('')}
        className="max-w-md"
      />

      {showResults && (
        <div className="bg-popover ring-foreground/10 absolute z-20 mt-1.5 w-full max-w-md rounded-lg shadow-md ring-1">
          <Command shouldFilter={false}>
            <CommandList>
              {isFetching && !results ? (
                <div className="flex items-center justify-center p-4">
                  <Spinner size="sm" />
                </div>
              ) : results && results.length === 0 ? (
                <CommandEmpty>
                  {t('currentAffairsSearch.noMatches', { query: debouncedQuery })}
                </CommandEmpty>
              ) : (
                <CommandGroup heading={t('currentAffairsSearch.resultsHeading')}>
                  {results?.slice(0, 8).map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => goToResult(result.id)}
                    >
                      <div className="flex flex-col">
                        <span>{result.title}</span>
                        <Text variant="caption">
                          {t(`categories.${result.category}`)} · {formatDate(result.date)}
                        </Text>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
