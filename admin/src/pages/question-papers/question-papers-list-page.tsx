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
  archiveQuestionPaper,
  listQuestionPapers,
  restoreQuestionPaper,
  updateQuestionPaperStatus,
  type AdminQuestionPaper,
  type QuestionPaperStatus,
} from '@/services/adminQuestionPapersService'
import { listMetaExams } from '@/services/adminQuestionsService'

const STATUS_BADGE: Record<QuestionPaperStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  inactive: 'warning',
  archived: 'destructive',
}

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
}

/**
 * Previous Year Question Papers listing — mirrors `questions-list-page.tsx`'s
 * exact table/filter/pagination conventions. Reuses the existing
 * `listMetaExams` (Step 53's Questions filter-dropdown metadata endpoint)
 * for the exam filter rather than duplicating an identical call.
 */
export function QuestionPapersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [examId, setExamId] = useState('')
  const [status, setStatus] = useState<QuestionPaperStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: exams } = useQuery({
    queryKey: ['admin', 'question-papers', 'meta', 'exams'],
    queryFn: listMetaExams,
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'question-papers', { search, examId, status, page }],
    queryFn: () =>
      listQuestionPapers({
        search: search || undefined,
        examId: examId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  function resetPage() {
    setPage(1)
  }

  async function handleStatusToggle(paper: AdminQuestionPaper) {
    setPendingId(paper.id)
    try {
      await updateQuestionPaperStatus(paper.id, !paper.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'question-papers'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(paper: AdminQuestionPaper) {
    setPendingId(paper.id)
    try {
      if (paper.status === 'archived') await restoreQuestionPaper(paper.id)
      else await archiveQuestionPaper(paper.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'question-papers'] })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Previous Year Question Papers</h1>
          <p className="text-muted-foreground text-sm">
            Upload, edit, activate/deactivate, and archive real PDF question papers by
            exam and year.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(ROUTES.questionPaperNew)}>
          <Plus /> New Paper
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
            className="w-40"
            value={examId}
            onChange={(e) => {
              resetPage()
              setExamId(e.target.value)
            }}
          >
            <option value="">All exams</option>
            {exams?.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {pickText(exam.name)}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(e) => {
              resetPage()
              setStatus(e.target.value as QuestionPaperStatus | '')
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
              <ErrorState title="Couldn't load question papers" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No question papers match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Year</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">File</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((paper) => (
                    <tr key={paper.id} className="hover:bg-muted/40 border-b last:border-0">
                      <td className="max-w-xs px-4 py-2.5 sm:px-5">
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.questionPaperEdit(paper.id))}
                          className="line-clamp-2 text-left font-medium hover:underline"
                        >
                          {pickText(paper.title)}
                        </button>
                        {paper.tnpscExamType && (
                          <Badge variant="outline" className="mt-1 capitalize">
                            {paper.tnpscExamType}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">{paper.year}</td>
                      <td className="text-muted-foreground px-4 py-2.5 sm:px-5">
                        {paper.fileUrl ? 'Uploaded' : 'No file yet'}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge variant={STATUS_BADGE[paper.status]} className="capitalize">
                          {paper.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.questionPaperEdit(paper.id))}
                          >
                            Edit
                          </Button>
                          {paper.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === paper.id}
                              onClick={() => void handleStatusToggle(paper)}
                            >
                              {paper.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={paper.status === 'archived' ? 'outline' : 'destructive'}
                            size="sm"
                            loading={pendingId === paper.id}
                            onClick={() => void handleArchiveToggle(paper)}
                          >
                            {paper.status === 'archived' ? 'Restore' : 'Archive'}
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
