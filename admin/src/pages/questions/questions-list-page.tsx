import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { FileUp, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import {
  archiveQuestion,
  bulkDeleteQuestions,
  bulkUpdateQuestions,
  bulkUpdateQuestionsPreview,
  listMetaExams,
  listMetaSubjects,
  listMetaSubtopics,
  listMetaTopics,
  listQuestions,
  restoreQuestion,
  updateQuestionStatus,
  type AdminQuestion,
  type BulkUpdatePatch,
  type BulkUpdatePreviewResult,
  type QuestionListFilter,
  type WorkflowStatus,
} from '@/services/adminQuestionsService'

const STATUS_BADGE: Record<
  AdminQuestion['status'],
  'success' | 'warning' | 'destructive'
> = {
  active: 'success',
  inactive: 'warning',
  archived: 'destructive',
}

const WORKFLOW_BADGE: Record<WorkflowStatus, 'outline' | 'warning' | 'success'> = {
  draft: 'outline',
  pending_review: 'warning',
  approved: 'outline',
  published: 'success',
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

/**
 * Sprint 4 Step 71.5 — appears once ≥1 row is selected. `patch` only ever
 * includes fields the admin actually touched ("No change" is the default
 * for every field, per the backend's safe-field-allowlist scope — see
 * `questionBulkActions.service.ts`'s header comment for why hierarchy/
 * content-text fields aren't offered here at all). Preview is a required
 * step before Confirm is enabled, matching this app's existing bulk-import
 * "preview before commit" convention.
 */
function BulkActionsBar({
  selectedIds,
  onDone,
}: {
  selectedIds: string[]
  onDone: () => void
}) {
  const [isActive, setIsActive] = useState('')
  const [isPremium, setIsPremium] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [aiEligible, setAiEligible] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [preview, setPreview] = useState<BulkUpdatePreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function buildPatch(): BulkUpdatePatch {
    const patch: BulkUpdatePatch = {}
    if (isActive) patch.isActive = isActive === 'true'
    if (isPremium) patch.isPremium = isPremium === 'true'
    if (difficulty) patch.difficulty = difficulty as BulkUpdatePatch['difficulty']
    if (aiEligible) patch.aiExplanationEligible = aiEligible === 'true'
    if (tagsInput.trim()) {
      patch.tags = tagsInput
        .split(/[|,]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
    return patch
  }

  const previewMutation = useMutation({
    mutationFn: () => bulkUpdateQuestionsPreview(selectedIds),
    onSuccess: (result) => {
      setPreview(result)
      setError(null)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () => bulkUpdateQuestions(selectedIds, buildPatch()),
    onSuccess: () => {
      setPreview(null)
      onDone()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteQuestions(selectedIds),
    onSuccess: () => onDone(),
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const hasPatch = Object.keys(buildPatch()).length > 0

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {selectedIds.length} question{selectedIds.length === 1 ? '' : 's'} selected
          </p>
          <Button
            variant="destructive"
            size="sm"
            loading={deleteMutation.isPending}
            onClick={() => {
              if (
                confirm(
                  `Archive ${selectedIds.length} question(s)? This can be undone individually via Restore.`,
                )
              ) {
                deleteMutation.mutate()
              }
            }}
          >
            <Trash2 /> Bulk Delete (Archive)
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            className="w-40"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
          >
            <option value="">Active status: no change</option>
            <option value="true">Set Active</option>
            <option value="false">Set Inactive</option>
          </Select>
          <Select
            className="w-40"
            value={isPremium}
            onChange={(e) => setIsPremium(e.target.value)}
          >
            <option value="">Premium: no change</option>
            <option value="true">Set Premium</option>
            <option value="false">Set Not Premium</option>
          </Select>
          <Select
            className="w-40"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">Difficulty: no change</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select
            className="w-48"
            value={aiEligible}
            onChange={(e) => setAiEligible(e.target.value)}
          >
            <option value="">AI Explanation: no change</option>
            <option value="true">Set Eligible</option>
            <option value="false">Set Not Eligible</option>
          </Select>
          <Input
            className="w-56"
            placeholder="Replace tags (comma/pipe separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">
            {error}
          </p>
        )}

        {preview && (
          <div className="bg-muted/40 rounded-md p-2.5 text-sm">
            <p>{preview.matchedCount} question(s) will be updated.</p>
            {preview.sample.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {preview.sample.map((s) => (
                  <li key={s.id} className="text-muted-foreground line-clamp-1 text-xs">
                    {s.questionTextEn}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPatch}
            loading={previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
          >
            Preview Update
          </Button>
          <Button
            size="sm"
            disabled={!preview || !hasPatch}
            loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Confirm Update
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
}

/**
 * Question bank listing/search/filter/paginate (Step 53) — mirrors
 * `users-list-page.tsx`'s exact table/filter/pagination conventions.
 * Row actions (activate/deactivate/archive/restore) call the real backend
 * directly; every mutation is also independently RBAC-enforced server-side
 * (`backend/src/routes/admin/questions.routes.ts`).
 */
export function QuestionsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [examId, setExamId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [difficulty, setDifficulty] = useState<QuestionListFilter['difficulty'] | ''>('')
  const [status, setStatus] = useState<QuestionListFilter['status'] | ''>('')
  const [isPreviousYear, setIsPreviousYear] = useState('')
  const [page, setPage] = useState(1)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: exams } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'exams'],
    queryFn: listMetaExams,
  })
  const { data: subjects } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'subjects', examId],
    queryFn: () => listMetaSubjects(examId),
    enabled: Boolean(examId),
  })
  const { data: topics } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'topics', subjectId],
    queryFn: () => listMetaTopics(subjectId),
    enabled: Boolean(subjectId),
  })
  const { data: subtopics } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'subtopics', topicId],
    queryFn: () => listMetaSubtopics(topicId),
    enabled: Boolean(topicId),
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [
      'admin',
      'questions',
      {
        search,
        examId,
        subjectId,
        topicId,
        subtopicId,
        difficulty,
        status,
        isPreviousYear,
        page,
      },
    ],
    queryFn: () =>
      listQuestions({
        search: search || undefined,
        examId: examId || undefined,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
        subtopicId: subtopicId || undefined,
        difficulty: difficulty || undefined,
        status: status || undefined,
        isPreviousYear: isPreviousYear === '' ? undefined : isPreviousYear === 'true',
        page,
        limit: 20,
      }),
  })

  function resetPage() {
    setPage(1)
  }

  async function handleToggleActive(question: AdminQuestion) {
    setPendingActionId(question.id)
    try {
      await updateQuestionStatus(question.id, !question.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    } finally {
      setPendingActionId(null)
    }
  }

  async function handleArchiveToggle(question: AdminQuestion) {
    setPendingActionId(question.id)
    try {
      if (question.status === 'archived') await restoreQuestion(question.id)
      else await archiveQuestion(question.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    } finally {
      setPendingActionId(null)
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    const pageIds = data?.items.map((q) => q.id) ?? []
    setSelectedIds((current) => {
      const allSelected = pageIds.length > 0 && pageIds.every((id) => current.has(id))
      if (allSelected) return new Set()
      return new Set(pageIds)
    })
  }

  async function handleBulkActionsDone() {
    setSelectedIds(new Set())
    await queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Questions</h1>
          <p className="text-muted-foreground text-sm">
            Create, edit, activate, deactivate, and archive syllabus questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.aiQuestionGenerate)}
          >
            <Sparkles /> AI Generate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.questionImport)}
          >
            <FileUp /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => navigate(ROUTES.questionNew)}>
            <Plus /> New Question
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="relative sm:max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search question text..."
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
            className="w-36"
            value={examId}
            onChange={(e) => {
              resetPage()
              setExamId(e.target.value)
              setSubjectId('')
              setTopicId('')
              setSubtopicId('')
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
            value={subjectId}
            disabled={!examId}
            onChange={(e) => {
              resetPage()
              setSubjectId(e.target.value)
              setTopicId('')
              setSubtopicId('')
            }}
          >
            <option value="">All subjects</option>
            {subjects?.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {pickText(subject.name)}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={topicId}
            disabled={!subjectId}
            onChange={(e) => {
              resetPage()
              setTopicId(e.target.value)
              setSubtopicId('')
            }}
          >
            <option value="">All topics</option>
            {topics?.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {pickText(topic.name)}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={subtopicId}
            disabled={!topicId}
            onChange={(e) => {
              resetPage()
              setSubtopicId(e.target.value)
            }}
          >
            <option value="">All subtopics</option>
            {subtopics?.map((subtopic) => (
              <option key={subtopic.id} value={subtopic.id}>
                {pickText(subtopic.name)}
              </option>
            ))}
          </Select>
          <Select
            className="w-32"
            value={difficulty}
            onChange={(e) => {
              resetPage()
              setDifficulty(e.target.value as QuestionListFilter['difficulty'])
            }}
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select
            className="w-32"
            value={isPreviousYear}
            onChange={(e) => {
              resetPage()
              setIsPreviousYear(e.target.value)
            }}
          >
            <option value="">PYQ: any</option>
            <option value="true">PYQ only</option>
            <option value="false">Non-PYQ only</option>
          </Select>
          <Select
            className="w-32"
            value={status}
            onChange={(e) => {
              resetPage()
              setStatus(e.target.value as QuestionListFilter['status'])
            }}
          >
            <option value="">Active + Inactive</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedIds={Array.from(selectedIds)}
          onDone={() => void handleBulkActionsDone()}
        />
      )}

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState
                title="Couldn't load questions"
                onRetry={() => void refetch()}
              />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No questions match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">
                      <Checkbox
                        checked={
                          data.items.length > 0 &&
                          data.items.every((q) => selectedIds.has(q.id))
                        }
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Question</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Difficulty</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Source</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Workflow</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((question) => (
                    <tr
                      key={question.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 sm:px-5">
                        <Checkbox
                          checked={selectedIds.has(question.id)}
                          onChange={() => toggleSelected(question.id)}
                        />
                      </td>
                      <td className="max-w-xs px-4 py-2.5 sm:px-5">
                        <Link
                          to={ROUTES.questionEdit(question.id)}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {pickText(question.questionText)}
                        </Link>
                        {question.isPreviousYear && (
                          <Badge variant="outline" className="mt-1">
                            PYQ {question.pyqYear ?? ''}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {question.difficulty}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">
                        {question.source.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={STATUS_BADGE[question.status]}
                          className="capitalize"
                        >
                          {question.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={WORKFLOW_BADGE[question.workflow.status]}
                          className="capitalize"
                        >
                          {question.workflow.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.questionEdit(question.id))}
                          >
                            Edit
                          </Button>
                          {question.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingActionId === question.id}
                              onClick={() => void handleToggleActive(question)}
                            >
                              {question.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={
                              question.status === 'archived' ? 'outline' : 'destructive'
                            }
                            size="sm"
                            loading={pendingActionId === question.id}
                            onClick={() => void handleArchiveToggle(question)}
                          >
                            {question.status === 'archived' ? 'Restore' : 'Archive'}
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
