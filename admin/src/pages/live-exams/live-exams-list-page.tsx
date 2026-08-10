import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
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
  cancelLiveExam,
  listLiveExams,
  publishLiveExam,
  publishLiveExamResults,
  type AdminLiveExam,
  type LiveExamStatus,
} from '@/services/adminLiveExamsService'

const STATUS_BADGE: Record<
  LiveExamStatus,
  'success' | 'warning' | 'secondary' | 'destructive'
> = {
  scheduled: 'success',
  live: 'success',
  completed: 'secondary',
  draft: 'warning',
  cancelled: 'destructive',
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)
      ?.error?.message
    if (message) return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LiveExamsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LiveExamStatus | ''>('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'live-exams', { search, status, page }],
    queryFn: () =>
      listLiveExams({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishLiveExam(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-exams'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLiveExam(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-exams'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  })
  const publishResultsMutation = useMutation({
    mutationFn: (id: string) => publishLiveExamResults(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-exams'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  })

  async function runAction(id: string, action: (id: string) => Promise<unknown>) {
    setPendingId(id)
    setError(null)
    try {
      await action(id)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Weekly Live Exams</h1>
          <p className="text-muted-foreground text-sm">
            Create, schedule, configure marks/negative marking, publish, cancel, and
            publish results.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(ROUTES.liveExamNew)}>
          <Plus /> New Live Exam
        </Button>
      </div>

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search title..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
        </div>
        <Select
          className="w-36"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as LiveExamStatus | '')
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState
                title="Couldn't load live exams"
                onRetry={() => void refetch()}
              />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No live exams match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Schedule</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Questions</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Attempts</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((exam: AdminLiveExam) => (
                    <tr
                      key={exam.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 sm:px-5">
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.liveExamEdit(exam.id))}
                          className="font-medium hover:underline"
                        >
                          {pickText(exam.title)}
                        </button>
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-xs sm:px-5">
                        {formatDateTime(exam.scheduledStartAt)} →{' '}
                        {formatDateTime(exam.scheduledEndAt)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        {exam.totalQuestions} · {exam.totalMarks} marks
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">{exam.attemptCount}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge variant={STATUS_BADGE[exam.status]} className="capitalize">
                          {exam.status}
                        </Badge>
                        <span className="text-muted-foreground ml-1.5 text-xs capitalize">
                          ({exam.effectiveStatus})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.liveExamEdit(exam.id))}
                          >
                            Edit
                          </Button>
                          {exam.status === 'draft' && (
                            <Button
                              size="sm"
                              loading={pendingId === exam.id && publishMutation.isPending}
                              onClick={() =>
                                void runAction(exam.id, (id) =>
                                  publishMutation.mutateAsync(id),
                                )
                              }
                            >
                              Publish
                            </Button>
                          )}
                          {exam.status !== 'cancelled' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              loading={pendingId === exam.id && cancelMutation.isPending}
                              onClick={() =>
                                void runAction(exam.id, (id) =>
                                  cancelMutation.mutateAsync(id),
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                          {(exam.effectiveStatus === 'completed' ||
                            exam.effectiveStatus === 'cancelled') &&
                            !exam.resultPublication.publishedAt && (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={
                                  pendingId === exam.id &&
                                  publishResultsMutation.isPending
                                }
                                onClick={() =>
                                  void runAction(exam.id, (id) =>
                                    publishResultsMutation.mutateAsync(id),
                                  )
                                }
                              >
                                Publish Results
                              </Button>
                            )}
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
