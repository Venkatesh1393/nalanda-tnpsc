import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ROUTES } from '@/constants/routes'
import { listMetaExams, listMetaSubjects } from '@/services/adminContentService'
import {
  createLiveExam,
  getLiveExam,
  updateLiveExam,
  type LiveExamInput,
  type ResultPublicationMode,
} from '@/services/adminLiveExamsService'
import { getQuestion, listQuestions } from '@/services/adminQuestionsService'

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

function toLocalInput(iso: string): string {
  return iso.slice(0, 16)
}

export function LiveExamEditorPage() {
  const { liveExamId } = useParams<{ liveExamId?: string }>()
  const isEditMode = Boolean(liveExamId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formError, setFormError] = useState<string | null>(null)

  const [titleEn, setTitleEn] = useState('')
  const [titleTa, setTitleTa] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [examId, setExamId] = useState('')
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [scheduledStartAt, setScheduledStartAt] = useState('')
  const [scheduledEndAt, setScheduledEndAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [marksPerQuestion, setMarksPerQuestion] = useState('1')
  const [negativeEnabled, setNegativeEnabled] = useState(false)
  const [negativeMarks, setNegativeMarks] = useState('0.25')
  const [instructionsEn, setInstructionsEn] = useState('')
  const [resultMode, setResultMode] = useState<ResultPublicationMode>('immediate')
  const [resultPublishAt, setResultPublishAt] = useState('')
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [questionLabels, setQuestionLabels] = useState<Record<string, string>>({})
  const [questionSearch, setQuestionSearch] = useState('')

  const { data: exams } = useQuery({
    queryKey: ['admin', 'meta', 'exams'],
    queryFn: listMetaExams,
  })
  const { data: subjects } = useQuery({
    queryKey: ['admin', 'meta', 'subjects', examId],
    queryFn: () => listMetaSubjects(examId),
    enabled: Boolean(examId),
  })

  const {
    data: existing,
    isPending: isLoadingExisting,
    isError: isLoadingError,
  } = useQuery({
    queryKey: ['admin', 'live-exams', liveExamId],
    queryFn: () => getLiveExam(liveExamId as string),
    enabled: isEditMode,
  })

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!existing || hydratedRef.current) return
    hydratedRef.current = true
    setTitleEn(existing.title.en ?? '')
    setTitleTa(existing.title.ta ?? '')
    setDescriptionEn(existing.description.en ?? '')
    setExamId(existing.examId)
    setSubjectIds(existing.subjectIds)
    setScheduledStartAt(toLocalInput(existing.scheduledStartAt))
    setScheduledEndAt(toLocalInput(existing.scheduledEndAt))
    setDurationMinutes(String(existing.durationMinutes))
    setMarksPerQuestion(String(existing.marksPerQuestion))
    setNegativeEnabled(existing.negativeMarking.enabled)
    setNegativeMarks(String(existing.negativeMarking.marksPerWrongAnswer))
    setInstructionsEn(existing.instructions.en.join('\n'))
    setResultMode(existing.resultPublication.mode)
    setResultPublishAt(
      existing.resultPublication.publishAt
        ? toLocalInput(existing.resultPublication.publishAt)
        : '',
    )
    setQuestionIds(existing.questionIds)
  }, [existing])

  useEffect(() => {
    const missing = questionIds.filter((id) => !questionLabels[id])
    if (missing.length === 0) return
    void Promise.all(missing.map((id) => getQuestion(id).catch(() => null))).then(
      (results) => {
        setQuestionLabels((current) => {
          const next = { ...current }
          results.forEach((question, index) => {
            if (question)
              next[missing[index]!] =
                question.questionText.en || question.questionText.ta || missing[index]!
          })
          return next
        })
      },
    )
  }, [questionIds, questionLabels])

  const { data: searchResults } = useQuery({
    queryKey: ['admin', 'live-exams', 'question-search', questionSearch, examId],
    queryFn: () =>
      listQuestions({
        search: questionSearch,
        examId: examId || undefined,
        page: 1,
        limit: 10,
      }),
    enabled: questionSearch.trim().length >= 2,
  })

  function toggleSubject(subjectId: string) {
    setSubjectIds((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    )
  }

  function addQuestion(id: string, label: string) {
    if (questionIds.includes(id)) return
    setQuestionIds((current) => [...current, id])
    setQuestionLabels((current) => ({ ...current, [id]: label }))
    setQuestionSearch('')
  }

  function removeQuestion(id: string) {
    setQuestionIds((current) => current.filter((qid) => qid !== id))
  }

  function buildPayload(): LiveExamInput | null {
    if (!titleEn.trim()) return fail('English title is required.')
    if (!descriptionEn.trim()) return fail('English description is required.')
    if (!examId) return fail('Select an exam.')
    if (subjectIds.length === 0) return fail('Select at least one subject.')
    if (questionIds.length === 0) return fail('Add at least one question.')
    if (!scheduledStartAt || !scheduledEndAt)
      return fail('Set both a start and end time.')
    if (new Date(scheduledEndAt) <= new Date(scheduledStartAt))
      return fail('End time must be after start time.')
    if (resultMode === 'scheduled' && !resultPublishAt)
      return fail('Set a results publish time, or switch to Immediate.')

    setFormError(null)
    return {
      title: { en: titleEn.trim(), ta: titleTa.trim() || undefined },
      description: { en: descriptionEn.trim() },
      examId,
      subjectIds,
      questionIds,
      scheduledStartAt: new Date(scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(scheduledEndAt).toISOString(),
      durationMinutes: Number(durationMinutes) || 1,
      marksPerQuestion: Number(marksPerQuestion) || 0,
      negativeMarking: {
        enabled: negativeEnabled,
        marksPerWrongAnswer: Number(negativeMarks) || 0,
      },
      instructions: {
        en: instructionsEn
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        ta: [],
      },
      resultPublication: {
        mode: resultMode,
        publishAt:
          resultMode === 'scheduled'
            ? new Date(resultPublishAt).toISOString()
            : undefined,
      },
    }
  }

  function fail(message: string): null {
    setFormError(message)
    return null
  }

  const saveMutation = useMutation({
    mutationFn: (input: LiveExamInput) =>
      isEditMode ? updateLiveExam(liveExamId as string, input) : createLiveExam(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'live-exams'] })
      navigate(ROUTES.liveExams)
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  function handleSave() {
    const payload = buildPayload()
    if (payload) saveMutation.mutate(payload)
  }

  if (isEditMode && isLoadingError)
    return <ErrorState title="Couldn't load this live exam" />
  if (isEditMode && (isLoadingExisting || !existing)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const computedTotalMarks = questionIds.length * (Number(marksPerQuestion) || 0)

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(ROUTES.liveExams)}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to Live Exams
      </button>

      <h1 className="text-lg font-semibold">
        {isEditMode ? 'Edit Live Exam' : 'New Live Exam'}
      </h1>
      {isEditMode && existing?.status !== 'draft' && (
        <p className="text-muted-foreground text-xs">
          This exam is already {existing?.status}. Changes still apply, but students may
          already be able to see it.
        </p>
      )}

      {formError && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {formError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Title (English) *</Label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Title (Tamil)</Label>
              <Input value={titleTa} onChange={(e) => setTitleTa(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description (English) *</Label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Exam *</Label>
              <Select
                value={examId}
                onChange={(e) => {
                  setExamId(e.target.value)
                  setSubjectIds([])
                }}
              >
                <option value="">Select exam</option>
                {exams?.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {pickText(exam.name)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Subjects *</Label>
              <div className="flex flex-wrap gap-3 pt-1.5">
                {subjects?.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={subjectIds.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    {pickText(subject.name)}
                  </label>
                ))}
                {examId && !subjects?.length && (
                  <p className="text-muted-foreground text-xs">
                    No subjects for this exam.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule &amp; Duration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Scheduled start *</Label>
            <Input
              type="datetime-local"
              value={scheduledStartAt}
              onChange={(e) => setScheduledStartAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Scheduled end *</Label>
            <Input
              type="datetime-local"
              value={scheduledEndAt}
              onChange={(e) => setScheduledEndAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Duration per student (minutes)</Label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marks &amp; Negative Marking</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Marks per question</Label>
            <Input
              type="number"
              step="0.25"
              value={marksPerQuestion}
              onChange={(e) => setMarksPerQuestion(e.target.value)}
            />
          </div>
          <label className="mt-6 flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={negativeEnabled}
              onChange={(e) => setNegativeEnabled(e.target.checked)}
            />
            Enable negative marking
          </label>
          {negativeEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label>Marks deducted per wrong answer</Label>
              <Input
                type="number"
                step="0.25"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
              />
            </div>
          )}
          <p className="text-muted-foreground text-xs sm:col-span-3">
            {questionIds.length} question(s) × {marksPerQuestion || 0} marks ={' '}
            {computedTotalMarks} total marks (computed automatically).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions *</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Search the question bank</Label>
            <Input
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder="Type at least 2 characters..."
            />
            {searchResults && searchResults.items.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border p-2">
                {searchResults.items.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                      onClick={() =>
                        addQuestion(q.id, q.questionText.en || q.questionText.ta || q.id)
                      }
                    >
                      {q.questionText.en || q.questionText.ta}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {questionIds.length === 0 && (
              <p className="text-muted-foreground text-xs">No questions selected yet.</p>
            )}
            {questionIds.map((id, index) => (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
              >
                <span className="truncate">
                  {index + 1}. {questionLabels[id] ?? id}
                </span>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructionsEn}
            onChange={(e) => setInstructionsEn(e.target.value)}
            placeholder="One instruction per line"
            className="min-h-24"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Result Publication</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Mode</Label>
            <Select
              className="w-40"
              value={resultMode}
              onChange={(e) => setResultMode(e.target.value as ResultPublicationMode)}
            >
              <option value="immediate">Immediate (at exam end)</option>
              <option value="scheduled">Scheduled</option>
            </Select>
          </div>
          {resultMode === 'scheduled' && (
            <div className="flex flex-col gap-1.5">
              <Label>Publish at</Label>
              <Input
                type="datetime-local"
                value={resultPublishAt}
                onChange={(e) => setResultPublishAt(e.target.value)}
              />
            </div>
          )}
          {isEditMode && existing?.resultPublication.publishedAt && (
            <Badge variant="success">
              Manually published{' '}
              {new Date(existing.resultPublication.publishedAt).toLocaleString('en-IN')}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(ROUTES.liveExams)}>
          Cancel
        </Button>
        <Button loading={saveMutation.isPending} onClick={handleSave}>
          {isEditMode ? 'Save Changes' : 'Create Live Exam'}
        </Button>
      </div>
    </div>
  )
}
