import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import {
  archiveCurrentAffair,
  listCurrentAffairs,
  restoreCurrentAffair,
  updateCurrentAffairStatus,
  type AdminCurrentAffair,
  type CurrentAffairsCategory,
  type CurrentAffairsPeriod,
  type PublishStatus,
} from '@/services/adminCurrentAffairsService'

const PUBLISH_BADGE: Record<
  PublishStatus,
  'success' | 'warning' | 'secondary' | 'destructive'
> = {
  published: 'success',
  scheduled: 'warning',
  draft: 'secondary',
  archived: 'destructive',
}

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function CurrentAffairsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<CurrentAffairsPeriod | ''>('')
  const [category, setCategory] = useState<CurrentAffairsCategory | ''>('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived' | ''>('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'current-affairs', { search, period, category, status, page }],
    queryFn: () =>
      listCurrentAffairs({
        search: search || undefined,
        period: period || undefined,
        category: category || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  function resetPage() {
    setPage(1)
  }

  async function handlePublishToggle(article: AdminCurrentAffair) {
    setPendingId(article.id)
    try {
      await updateCurrentAffairStatus(article.id, !article.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'current-affairs'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(article: AdminCurrentAffair) {
    setPendingId(article.id)
    try {
      if (article.publishStatus === 'archived') await restoreCurrentAffair(article.id)
      else await archiveCurrentAffair(article.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'current-affairs'] })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Current Affairs</h1>
          <p className="text-muted-foreground text-sm">
            Create, edit, schedule/publish, unpublish, tag, and link questions to
            articles.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(ROUTES.currentAffairNew)}>
          <Plus /> New Article
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="relative sm:max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search title..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              resetPage()
              setSearch(e.target.value)
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            className="w-32"
            value={period}
            onChange={(e) => {
              resetPage()
              setPeriod(e.target.value as CurrentAffairsPeriod | '')
            }}
          >
            <option value="">All periods</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
          <Select
            className="w-40"
            value={category}
            onChange={(e) => {
              resetPage()
              setCategory(e.target.value as CurrentAffairsCategory | '')
            }}
          >
            <option value="">All categories</option>
            <option value="national">National</option>
            <option value="tamil-nadu">Tamil Nadu</option>
            <option value="economy">Economy</option>
            <option value="environment">Environment</option>
            <option value="science-tech">Science &amp; Tech</option>
            <option value="polity-governance">Polity &amp; Governance</option>
            <option value="international">International</option>
            <option value="sports-awards">Sports &amp; Awards</option>
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(e) => {
              resetPage()
              setStatus(e.target.value as 'active' | 'inactive' | 'archived' | '')
            }}
          >
            <option value="">Active + Inactive</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load articles" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No articles match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Date</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Period</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Category</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((article) => (
                    <tr
                      key={article.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="max-w-xs px-4 py-2.5 sm:px-5">
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.currentAffairEdit(article.id))}
                          className="line-clamp-2 text-left font-medium hover:underline"
                        >
                          {pickText(article.title)}
                        </button>
                        {article.isImportant && (
                          <Badge variant="outline" className="mt-1">
                            Important
                          </Badge>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {formatDate(article.date)}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">{article.period}</td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {article.category.replace('-', ' ')}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={PUBLISH_BADGE[article.publishStatus]}
                          className="capitalize"
                        >
                          {article.publishStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.currentAffairEdit(article.id))}
                          >
                            Edit
                          </Button>
                          {article.publishStatus !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === article.id}
                              onClick={() => void handlePublishToggle(article)}
                            >
                              {article.isActive ? 'Unpublish' : 'Publish'}
                            </Button>
                          )}
                          <Button
                            variant={
                              article.publishStatus === 'archived'
                                ? 'outline'
                                : 'destructive'
                            }
                            size="sm"
                            loading={pendingId === article.id}
                            onClick={() => void handleArchiveToggle(article)}
                          >
                            {article.publishStatus === 'archived' ? 'Restore' : 'Archive'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
