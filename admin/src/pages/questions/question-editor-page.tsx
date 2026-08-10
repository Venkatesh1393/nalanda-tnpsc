import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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
import {
  createQuestion,
  getQuestion,
  listMetaExams,
  listMetaSubjects,
  listMetaSubtopics,
  listMetaTopics,
  updateQuestion,
  type QuestionDifficulty,
  type QuestionInput,
  type QuestionSource,
  type QuestionType,
  type TnpscExamStage,
} from '@/services/adminQuestionsService'

type OptionDraft = {
  optionId: string
  en: string
  ta: string
  isCorrect: boolean
}

function newOption(index: number): OptionDraft {
  return { optionId: `opt${index}`, en: '', ta: '', isCorrect: false }
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

function pickText(text: { en?: string; ta?: string } | undefined): string {
  return text?.en || text?.ta || '—'
}

/**
 * Create/edit/preview a question (Step 53). One page handles both `/new`
 * and `/:questionId/edit` — `questionId` presence is the only branch point.
 * Every invariant checked here (2-6 options, exactly-one-correct for
 * mcq_single, pyqYear required when isPreviousYear) is re-checked
 * server-side regardless (`validators/question.validator.ts`'s
 * `superRefine`, then `Question.model.ts`'s own Mongoose validators as a
 * second line of defense) — this is a UX nicety, never the real boundary.
 */
export function QuestionEditorPage() {
  const { questionId } = useParams<{ questionId?: string }>()
  const isEditMode = Boolean(questionId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [formError, setFormError] = useState<string | null>(null)

  const [questionTextEn, setQuestionTextEn] = useState('')
  const [questionTextTa, setQuestionTextTa] = useState('')
  const [examIds, setExamIds] = useState<string[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [options, setOptions] = useState<OptionDraft[]>([newOption(1), newOption(2)])
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium')
  const [questionType, setQuestionType] = useState<QuestionType>('mcq_single')
  const [explanationEn, setExplanationEn] = useState('')
  const [explanationTa, setExplanationTa] = useState('')
  const [source, setSource] = useState<QuestionSource>('curated')
  const [isPreviousYear, setIsPreviousYear] = useState(false)
  const [pyqYear, setPyqYear] = useState('')
  const [tnpscExamType, setTnpscExamType] = useState<TnpscExamStage | ''>('')
  const [tagsInput, setTagsInput] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [aiExplanationEligible, setAiExplanationEligible] = useState(true)
  const [questionImageUrl, setQuestionImageUrl] = useState('')

  const { data: exams } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'exams'],
    queryFn: listMetaExams,
  })
  const primaryExamId = examIds[0] ?? ''
  const { data: subjects } = useQuery({
    queryKey: ['admin', 'questions', 'meta', 'subjects', primaryExamId],
    queryFn: () => listMetaSubjects(primaryExamId),
    enabled: Boolean(primaryExamId),
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

  const {
    data: existing,
    isPending: isLoadingExisting,
    isError: isLoadingError,
  } = useQuery({
    queryKey: ['admin', 'questions', questionId],
    queryFn: () => getQuestion(questionId as string),
    enabled: isEditMode,
  })

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!existing || hydratedRef.current) return
    hydratedRef.current = true
    setQuestionTextEn(existing.questionText.en ?? '')
    setQuestionTextTa(existing.questionText.ta ?? '')
    setExamIds(existing.examIds)
    setSubjectId(existing.subjectId)
    setTopicId(existing.topicId)
    setSubtopicId(existing.subtopicId)
    setOptions(
      existing.options.map((option) => ({
        optionId: option.optionId,
        en: option.text.en ?? '',
        ta: option.text.ta ?? '',
        isCorrect: option.isCorrect,
      })),
    )
    setDifficulty(existing.difficulty)
    setQuestionType(existing.questionType)
    setExplanationEn(existing.explanation?.en ?? '')
    setExplanationTa(existing.explanation?.ta ?? '')
    setSource(existing.source)
    setIsPreviousYear(existing.isPreviousYear)
    setPyqYear(existing.pyqYear ? String(existing.pyqYear) : '')
    setTnpscExamType(existing.tnpscExamType ?? '')
    setTagsInput(existing.tags.join(', '))
    setIsActive(existing.isActive)
    setIsPremium(existing.isPremium)
    setAiExplanationEligible(existing.aiExplanationEligible)
    setQuestionImageUrl(existing.questionImageUrl ?? '')
  }, [existing])

  function toggleExam(examId: string) {
    setExamIds((current) =>
      current.includes(examId)
        ? current.filter((id) => id !== examId)
        : [...current, examId],
    )
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    )
  }

  function toggleCorrect(index: number) {
    setOptions((current) =>
      current.map((option, i) => {
        if (questionType === 'mcq_single') {
          return { ...option, isCorrect: i === index }
        }
        return i === index ? { ...option, isCorrect: !option.isCorrect } : option
      }),
    )
  }

  function addOption() {
    setOptions((current) =>
      current.length >= 6 ? current : [...current, newOption(current.length + 1)],
    )
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.length <= 2 ? current : current.filter((_, i) => i !== index),
    )
  }

  function buildPayload(): QuestionInput | null {
    if (examIds.length === 0) return fail('Select at least one exam.')
    if (!subjectId) return fail('Select a subject.')
    if (!topicId) return fail('Select a topic.')
    if (!subtopicId) return fail('Select a subtopic.')
    if (!questionTextEn.trim()) return fail('English question text is required.')
    const filledOptions = options.filter((option) => option.en.trim())
    if (filledOptions.length < 2)
      return fail('At least 2 options with English text are required.')
    const correctCount = filledOptions.filter((option) => option.isCorrect).length
    if (questionType === 'mcq_single' && correctCount !== 1) {
      return fail('Select exactly one correct option for a single-answer question.')
    }
    if (questionType !== 'mcq_single' && correctCount < 1) {
      return fail('Select at least one correct option.')
    }
    if (isPreviousYear && !pyqYear.trim()) {
      return fail('Enter the PYQ year, or turn off "Previous Year Question".')
    }

    setFormError(null)
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    return {
      examIds,
      subjectId,
      topicId,
      subtopicId,
      questionText: {
        en: questionTextEn.trim(),
        ta: questionTextTa.trim() || undefined,
      },
      questionImageUrl: questionImageUrl.trim() || undefined,
      options: filledOptions.map((option) => ({
        optionId: option.optionId,
        text: { en: option.en.trim(), ta: option.ta.trim() || undefined },
        isCorrect: option.isCorrect,
      })),
      difficulty,
      questionType,
      explanation:
        explanationEn.trim() || explanationTa.trim()
          ? {
              en: explanationEn.trim() || undefined,
              ta: explanationTa.trim() || undefined,
            }
          : undefined,
      source,
      isPreviousYear,
      pyqYear: isPreviousYear ? Number(pyqYear) : undefined,
      tnpscExamType: tnpscExamType || undefined,
      tags,
      isActive,
      isPremium,
      aiExplanationEligible,
    }
  }

  function fail(message: string): null {
    setFormError(message)
    return null
  }

  const saveMutation = useMutation({
    mutationFn: (input: QuestionInput) =>
      isEditMode ? updateQuestion(questionId as string, input) : createQuestion(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
      navigate(ROUTES.questions)
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  })

  function handleSave() {
    const payload = buildPayload()
    if (!payload) return
    saveMutation.mutate(payload)
  }

  if (isEditMode && isLoadingError) {
    return <ErrorState title="Couldn't load this question" />
  }

  if (isEditMode && (isLoadingExisting || !existing)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const subjectName = pickText(subjects?.find((s) => s.id === subjectId)?.name)
  const topicName = pickText(topics?.find((t) => t.id === topicId)?.name)
  const subtopicName = pickText(subtopics?.find((s) => s.id === subtopicId)?.name)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(ROUTES.questions)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Questions
        </button>
        <div className="flex gap-2">
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('edit')}
          >
            Edit
          </Button>
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
        </div>
      </div>

      <h1 className="text-lg font-semibold">
        {isEditMode ? 'Edit Question' : 'New Question'}
      </h1>

      {formError && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {formError}
        </p>
      )}

      {mode === 'preview' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {questionTextEn || 'Untitled question'}
            </CardTitle>
            {questionTextTa && (
              <p className="text-muted-foreground text-sm">{questionTextTa}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="capitalize">
                {difficulty}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {source.replace('_', ' ')}
              </Badge>
              {isPreviousYear && <Badge variant="outline">PYQ {pyqYear}</Badge>}
              {isPremium && <Badge variant="warning">Premium</Badge>}
              {!isActive && <Badge variant="destructive">Inactive</Badge>}
              <Badge variant="outline">
                {subjectName} / {topicName} / {subtopicName}
              </Badge>
            </div>
            <ul className="flex flex-col gap-2">
              {options
                .filter((option) => option.en.trim())
                .map((option) => (
                  <li
                    key={option.optionId}
                    className={`rounded-lg border px-3 py-2 text-sm ${option.isCorrect ? 'border-success bg-success/10' : ''}`}
                  >
                    {option.en}{' '}
                    {option.ta && (
                      <span className="text-muted-foreground">— {option.ta}</span>
                    )}
                  </li>
                ))}
            </ul>
            {(explanationEn || explanationTa) && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs font-medium">Explanation</p>
                <p>{explanationEn}</p>
                {explanationTa && (
                  <p className="text-muted-foreground">{explanationTa}</p>
                )}
              </div>
            )}
            {tagsInput && (
              <div className="flex flex-wrap gap-1.5">
                {tagsInput
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question Text</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-en">English *</Label>
                <Textarea
                  id="q-en"
                  value={questionTextEn}
                  onChange={(e) => setQuestionTextEn(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-ta">Tamil</Label>
                <Textarea
                  id="q-ta"
                  value={questionTextTa}
                  onChange={(e) => setQuestionTextTa(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-image">Question Image URL</Label>
                <Input
                  id="q-image"
                  placeholder="https://..."
                  value={questionImageUrl}
                  onChange={(e) => setQuestionImageUrl(e.target.value)}
                />
                {isEditMode && (
                  <p className="text-muted-foreground text-xs">
                    To upload a new image file, use Cloudinary upload from the question
                    detail view.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Exams *</Label>
                <div className="flex flex-wrap gap-3">
                  {exams?.map((exam) => (
                    <label key={exam.id} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={examIds.includes(exam.id)}
                        onChange={() => toggleExam(exam.id)}
                      />
                      {pickText(exam.name)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Subject *</Label>
                  <Select
                    value={subjectId}
                    disabled={!primaryExamId}
                    onChange={(e) => {
                      setSubjectId(e.target.value)
                      setTopicId('')
                      setSubtopicId('')
                    }}
                  >
                    <option value="">Select subject</option>
                    {subjects?.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {pickText(subject.name)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Topic *</Label>
                  <Select
                    value={topicId}
                    disabled={!subjectId}
                    onChange={(e) => {
                      setTopicId(e.target.value)
                      setSubtopicId('')
                    }}
                  >
                    <option value="">Select topic</option>
                    {topics?.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {pickText(topic.name)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Subtopic *</Label>
                  <Select
                    value={subtopicId}
                    disabled={!topicId}
                    onChange={(e) => setSubtopicId(e.target.value)}
                  >
                    <option value="">Select subtopic</option>
                    {subtopics?.map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {pickText(subtopic.name)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Options *</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 6}
              >
                <Plus /> Add option
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Select
                className="w-48"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              >
                <option value="mcq_single">Single correct answer</option>
                <option value="mcq_multiple">Multiple correct answers</option>
                <option value="assertion_reason">Assertion / Reason</option>
                <option value="match_following">Match the following</option>
                <option value="true_false">True / False</option>
              </Select>
              {options.map((option, index) => (
                <div
                  key={option.optionId}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start"
                >
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type={questionType === 'mcq_single' ? 'radio' : 'checkbox'}
                      name="correct-option"
                      checked={option.isCorrect}
                      onChange={() => toggleCorrect(index)}
                      aria-label={`Option ${index + 1} is correct`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder={`Option ${index + 1} (English)`}
                      value={option.en}
                      onChange={(e) => updateOption(index, { en: e.target.value })}
                    />
                    <Input
                      placeholder={`Option ${index + 1} (Tamil)`}
                      value={option.ta}
                      onChange={(e) => updateOption(index, { ta: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <p className="text-muted-foreground text-xs">
                Mark the checkbox/radio next to each option that is correct.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Explanation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-en">English</Label>
                <Textarea
                  id="exp-en"
                  value={explanationEn}
                  onChange={(e) => setExplanationEn(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-ta">Tamil</Label>
                <Textarea
                  id="exp-ta"
                  value={explanationTa}
                  onChange={(e) => setExplanationTa(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Difficulty</Label>
                  <Select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Source</Label>
                  <Select
                    value={source}
                    onChange={(e) => setSource(e.target.value as QuestionSource)}
                  >
                    <option value="curated">Curated</option>
                    <option value="pyq">PYQ</option>
                    <option value="ai_generated">AI Generated</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={isPreviousYear}
                    onChange={(e) => setIsPreviousYear(e.target.checked)}
                  />
                  Previous Year Question
                </label>
                {isPreviousYear && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pyq-year">Year</Label>
                      <Input
                        id="pyq-year"
                        type="number"
                        className="w-28"
                        value={pyqYear}
                        onChange={(e) => setPyqYear(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Exam Stage</Label>
                      <Select
                        className="w-36"
                        value={tnpscExamType}
                        onChange={(e) =>
                          setTnpscExamType(e.target.value as TnpscExamStage | '')
                        }
                      >
                        <option value="">Not specified</option>
                        <option value="prelims">Prelims</option>
                        <option value="mains">Mains</option>
                        <option value="interview">Interview</option>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active (visible to Smart Practice)
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                  />
                  Premium only
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={aiExplanationEligible}
                    onChange={(e) => setAiExplanationEligible(e.target.checked)}
                  />
                  AI explanation eligible
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.questions)}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={handleSave}>
              {isEditMode ? 'Save Changes' : 'Create Question'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
