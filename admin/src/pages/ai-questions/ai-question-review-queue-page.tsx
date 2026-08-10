import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Check, Pencil, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ROUTES } from '@/constants/routes'
import {
  approveDraft,
  listDrafts,
  rejectDraft,
  updateDraft,
  type AiQuestionDraft,
  type AiQuestionDraftStatus,
} from '@/services/adminAiQuestionGeneratorService'

const STATUS_BADGE: Record<AiQuestionDraftStatus, 'success' | 'warning' | 'destructive'> =
  {
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
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

type DraftCardProps = {
  draft: AiQuestionDraft
  onChanged: () => void
}

function DraftCard({ draft, onChanged }: DraftCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [questionTextEn, setQuestionTextEn] = useState(draft.questionText.en ?? '')
  const [questionTextTa, setQuestionTextTa] = useState(draft.questionText.ta ?? '')
  const [explanationEn, setExplanationEn] = useState(draft.explanation?.en ?? '')
  const [explanationTa, setExplanationTa] = useState(draft.explanation?.ta ?? '')
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: () =>
      updateDraft(draft.id, {
        questionText: { en: questionTextEn, ta: questionTextTa },
        explanation: { en: explanationEn, ta: explanationTa },
      }),
    onSuccess: () => {
      setIsEditing(false)
      setError(null)
      onChanged()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const approveMutation = useMutation({
    mutationFn: () => approveDraft(draft.id),
    onSuccess: () => {
      setError(null)
      onChanged()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectDraft(draft.id, rejectionReason.trim() || undefined),
    onSuccess: () => {
      setError(null)
      setIsRejecting(false)
      onChanged()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const isPending = draft.status === 'pending'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={STATUS_BADGE[draft.status]} className="capitalize">
              {draft.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {draft.difficulty}
            </Badge>
            {draft.isPreviousYear && <Badge variant="outline">PYQ style</Badge>}
            {draft.generation.estimatedCostUsd != null && (
              <Badge variant="outline">
                ${draft.generation.estimatedCostUsd.toFixed(4)} · {draft.generation.model}
              </Badge>
            )}
          </div>
          {isPending && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil /> Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={questionTextEn}
              onChange={(e) => setQuestionTextEn(e.target.value)}
              placeholder="Question (English)"
            />
            <Textarea
              value={questionTextTa}
              onChange={(e) => setQuestionTextTa(e.target.value)}
              placeholder="Question (Tamil)"
            />
            <Textarea
              value={explanationEn}
              onChange={(e) => setExplanationEn(e.target.value)}
              placeholder="Explanation (English)"
            />
            <Textarea
              value={explanationTa}
              onChange={(e) => setExplanationTa(e.target.value)}
              placeholder="Explanation (Tamil)"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save changes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-medium">{draft.questionText.en}</p>
            {draft.questionText.ta && (
              <p className="text-muted-foreground">{draft.questionText.ta}</p>
            )}
            <ul className="flex flex-col gap-1 text-sm">
              {draft.options.map((option) => (
                <li
                  key={option.optionId}
                  className={
                    option.isCorrect
                      ? 'text-success flex items-center gap-1.5 font-medium'
                      : 'text-muted-foreground flex items-center gap-1.5'
                  }
                >
                  {option.isCorrect && <Check className="size-3.5" aria-hidden="true" />}
                  {option.optionId}) {option.text.en}
                  {option.text.ta ? ` / ${option.text.ta}` : ''}
                </li>
              ))}
            </ul>
            {draft.explanation?.en && (
              <p className="text-muted-foreground text-sm">
                <span className="font-medium">Explanation: </span>
                {draft.explanation.en}
              </p>
            )}
            {draft.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {draft.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {draft.status === 'approved' && draft.publishedQuestionId && (
          <Link
            to={ROUTES.questionEdit(draft.publishedQuestionId)}
            className="text-primary text-sm hover:underline"
          >
            View published question &rarr;
          </Link>
        )}
        {draft.status === 'rejected' && draft.rejectionReason && (
          <p className="text-muted-foreground text-sm">Reason: {draft.rejectionReason}</p>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {isPending && !isEditing && (
          <div className="flex flex-col gap-2 border-t pt-3">
            {isRejecting ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Reason for rejecting (optional)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                  >
                    Confirm reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  <Check /> Approve &amp; Publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsRejecting(true)}>
                  <X /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Sprint 4 Step 65 — the review gate. Every draft listed here starts
 * `pending` and stays invisible to students until Approved — this page is
 * the *only* place that action can be taken (`approveDraft`/`rejectDraft`
 * both independently RBAC-enforced server-side regardless of this page's
 * own route guard).
 */
export function AiQuestionReviewQueuePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') as AiQuestionDraftStatus | null) ?? 'pending'
  const batchId = searchParams.get('batchId') ?? undefined

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'ai-question-drafts', { status, batchId }],
    queryFn: () => listDrafts({ status, batchId, limit: 50 }),
  })

  function handleChanged() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'ai-question-drafts'] })
  }

  function setStatusFilter(next: AiQuestionDraftStatus) {
    const params = new URLSearchParams(searchParams)
    params.set('status', next)
    setSearchParams(params)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(ROUTES.aiQuestionGenerate)}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to Generator
      </button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="text-primary size-4" aria-hidden="true" />
            AI Question Review Queue
          </h1>
          <p className="text-muted-foreground text-sm">
            {batchId
              ? 'Showing the batch you just generated.'
              : 'Review, edit, approve, or reject AI-generated question drafts.'}
          </p>
        </div>
        <Select
          className="w-40"
          value={status}
          onChange={(e) => setStatusFilter(e.target.value as AiQuestionDraftStatus)}
        >
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {isError ? (
        <ErrorState
          title="Couldn't load the review queue"
          onRetry={() => void refetch()}
        />
      ) : isPending || !data ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No drafts in this status" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  )
}
