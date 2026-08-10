import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
import { searchLearnContent } from '@/services/learnService'
import type { LearnSearchResult, LearnSearchResultType } from '@/types/learn'

const GROUP_ORDER: LearnSearchResultType[] = ['subject', 'topic', 'subtopic']
const MAX_PER_GROUP = 4

/**
 * The Learn module's search bar (docs/Learn_Module.md §1 — jump directly to
 * a topic/subtopic by name without descending through the hierarchy
 * manually) — debounced (via `SearchInput`), grouped results capped per
 * group with a minimum-2-character threshold, following the same shape as
 * the global Search overlay's own conventions (docs/Navigation.md §7).
 */
export function LearnSearch() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const showResults = debouncedQuery.trim().length >= 2

  const { data: results, isFetching } = useQuery({
    queryKey: ['learn', 'search', debouncedQuery],
    queryFn: () => searchLearnContent(debouncedQuery),
    enabled: showResults,
  })

  function goToResult(result: LearnSearchResult) {
    setQuery('')
    setDebouncedQuery('')
    if (result.type === 'subject') {
      navigate(ROUTES.learnTopics(result.subjectId))
    } else if (result.type === 'topic' && result.topicId) {
      navigate(ROUTES.learnSubtopics(result.subjectId, result.topicId))
    } else if (result.type === 'subtopic' && result.topicId && result.subtopicId) {
      navigate(ROUTES.learnLesson(result.subjectId, result.topicId, result.subtopicId))
    }
  }

  return (
    <div className="relative">
      <SearchInput
        placeholder={t('learnSearch.placeholder')}
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
                  {t('learnSearch.noMatches', { query: debouncedQuery })}
                </CommandEmpty>
              ) : (
                GROUP_ORDER.map((type) => {
                  const group = results
                    ?.filter((r) => r.type === type)
                    .slice(0, MAX_PER_GROUP)
                  if (!group || group.length === 0) return null
                  return (
                    <CommandGroup key={type} heading={t(`learnSearch.groups.${type}`)}>
                      {group.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={result.id}
                          onSelect={() => goToResult(result)}
                        >
                          <div className="flex flex-col">
                            <span>{result.label}</span>
                            {result.type !== 'subject' && (
                              <Text variant="caption">{result.context}</Text>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
