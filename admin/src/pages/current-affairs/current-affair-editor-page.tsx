import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
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
import { optimizedCloudinaryUrl } from '@/lib/cloudinary'
import {
  createCurrentAffair,
  getCurrentAffair,
  removeCurrentAffairImage,
  updateCurrentAffair,
  uploadCurrentAffairImage,
  type CurrentAffairInput,
  type CurrentAffairsCategory,
  type CurrentAffairsPeriod,
  type QuizQuestion,
} from '@/services/adminCurrentAffairsService'
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

function newQuizQuestion(): QuizQuestion {
  const id = `qq${Date.now()}`
  return {
    questionId: id,
    questionText: { en: '' },
    options: [
      { optionId: 'opt1', text: { en: '' } },
      { optionId: 'opt2', text: { en: '' } },
    ],
    correctOptionId: 'opt1',
    explanation: { en: '' },
  }
}

export function CurrentAffairEditorPage() {
  const { articleId } = useParams<{ articleId?: string }>()
  const isEditMode = Boolean(articleId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [formError, setFormError] = useState<string | null>(null)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState<CurrentAffairsPeriod>('daily')
  const [category, setCategory] = useState<CurrentAffairsCategory>('national')
  const [titleEn, setTitleEn] = useState('')
  const [titleTa, setTitleTa] = useState('')
  const [excerptEn, setExcerptEn] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [highlightsEn, setHighlightsEn] = useState('')
  const [examRelevanceTagsInput, setExamRelevanceTagsInput] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [publishAt, setPublishAt] = useState('')
  const [quizQuestionIds, setQuizQuestionIds] = useState<string[]>([])
  const [linkedQuestionLabels, setLinkedQuestionLabels] = useState<
    Record<string, string>
  >({})
  const [questionSearch, setQuestionSearch] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)

  const {
    data: existing,
    isPending: isLoadingExisting,
    isError: isLoadingError,
  } = useQuery({
    queryKey: ['admin', 'current-affairs', articleId],
    queryFn: () => getCurrentAffair(articleId as string),
    enabled: isEditMode,
  })

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!existing || hydratedRef.current) return
    hydratedRef.current = true
    setDate(existing.date.slice(0, 10))
    setPeriod(existing.period)
    setCategory(existing.category)
    setTitleEn(existing.title.en ?? '')
    setTitleTa(existing.title.ta ?? '')
    setExcerptEn(existing.excerpt?.en ?? '')
    setBodyEn(existing.body.en.join('\n'))
    setHighlightsEn(existing.highlights.en.join('\n'))
    setExamRelevanceTagsInput(existing.examRelevanceTags.join(', '))
    setTagsInput(existing.tags.join(', '))
    setIsImportant(existing.isImportant)
    setIsActive(existing.isActive)
    setPublishAt(existing.publishAt ? existing.publishAt.slice(0, 16) : '')
    setQuizQuestionIds(existing.quizQuestionIds)
    setQuizQuestions(existing.quizQuestions)
    setImageUrl(existing.imageUrl)
  }, [existing])

  useEffect(() => {
    const missing = quizQuestionIds.filter((id) => !linkedQuestionLabels[id])
    if (missing.length === 0) return
    void Promise.all(missing.map((id) => getQuestion(id).catch(() => null))).then(
      (results) => {
        setLinkedQuestionLabels((current) => {
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
  }, [quizQuestionIds, linkedQuestionLabels])

  const { data: searchResults } = useQuery({
    queryKey: ['admin', 'current-affairs', 'question-search', questionSearch],
    queryFn: () => listQuestions({ search: questionSearch, page: 1, limit: 10 }),
    enabled: questionSearch.trim().length >= 2,
  })

  function addQuestionLink(id: string, label: string) {
    if (quizQuestionIds.includes(id)) return
    setQuizQuestionIds((current) => [...current, id])
    setLinkedQuestionLabels((current) => ({ ...current, [id]: label }))
    setQuestionSearch('')
  }

  function removeQuestionLink(id: string) {
    setQuizQuestionIds((current) => current.filter((qid) => qid !== id))
  }

  function updateQuizQuestion(index: number, patch: Partial<QuizQuestion>) {
    setQuizQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    )
  }

  function updateQuizOption(qIndex: number, oIndex: number, text: string) {
    setQuizQuestions((current) =>
      current.map((q, i) => {
        if (i !== qIndex) return q
        const options = q.options.map((o, oi) =>
          oi === oIndex ? { ...o, text: { en: text } } : o,
        )
        return { ...q, options }
      }),
    )
  }

  function addQuizQuestion() {
    setQuizQuestions((current) => [...current, newQuizQuestion()])
  }

  function removeQuizQuestion(index: number) {
    setQuizQuestions((current) => current.filter((_, i) => i !== index))
  }

  function addQuizOption(qIndex: number) {
    setQuizQuestions((current) =>
      current.map((q, i) => {
        if (i !== qIndex || q.options.length >= 6) return q
        const nextId = `opt${q.options.length + 1}`
        return { ...q, options: [...q.options, { optionId: nextId, text: { en: '' } }] }
      }),
    )
  }

  function buildPayload(): CurrentAffairInput | null {
    if (!titleEn.trim()) {
      setFormError('English title is required.')
      return null
    }
    for (const quiz of quizQuestions) {
      if (!quiz.questionText.en?.trim() || quiz.options.some((o) => !o.text.en?.trim())) {
        setFormError('Every quiz question needs text and text for all its options.')
        return null
      }
      if (!quiz.options.some((o) => o.optionId === quiz.correctOptionId)) {
        setFormError('Every quiz question needs a valid correct option selected.')
        return null
      }
    }
    setFormError(null)
    return {
      date,
      period,
      category,
      title: { en: titleEn.trim(), ta: titleTa.trim() || undefined },
      excerpt: excerptEn.trim() ? { en: excerptEn.trim() } : undefined,
      body: {
        en: bodyEn
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        ta: [],
      },
      highlights: {
        en: highlightsEn
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        ta: [],
      },
      examRelevanceTags: examRelevanceTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isImportant,
      quizQuestionIds,
      quizQuestions,
      isActive,
      publishAt: publishAt || undefined,
    }
  }

  const saveMutation = useMutation({
    mutationFn: (input: CurrentAffairInput) =>
      isEditMode
        ? updateCurrentAffair(articleId as string, input)
        : createCurrentAffair(input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'current-affairs'] })
      if (!isEditMode) navigate(ROUTES.currentAffairEdit(saved.id))
      else navigate(ROUTES.currentAffairs)
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadCurrentAffairImage(articleId as string, file),
    onSuccess: (saved) => setImageUrl(saved.imageUrl),
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const removeImageMutation = useMutation({
    mutationFn: () => removeCurrentAffairImage(articleId as string),
    onSuccess: () => setImageUrl(undefined),
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  function handleSave() {
    const payload = buildPayload()
    if (payload) saveMutation.mutate(payload)
  }

  if (isEditMode && isLoadingError)
    return <ErrorState title="Couldn't load this article" />
  if (isEditMode && (isLoadingExisting || !existing)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(ROUTES.currentAffairs)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to Current Affairs
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
        {isEditMode ? 'Edit Article' : 'New Article'}
      </h1>

      {formError && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {formError}
        </p>
      )}

      {mode === 'preview' ? (
        <Card>
          <CardHeader>
            {imageUrl && (
              <img
                src={optimizedCloudinaryUrl(imageUrl, 640)}
                alt=""
                loading="lazy"
                decoding="async"
                className="mb-2 max-h-56 w-full rounded-lg object-cover"
              />
            )}
            <CardTitle className="text-base">{titleEn || 'Untitled article'}</CardTitle>
            {titleTa && <p className="text-muted-foreground text-sm">{titleTa}</p>}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="capitalize">
                {period}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {category.replace('-', ' ')}
              </Badge>
              {isImportant && <Badge variant="warning">Important</Badge>}
              {!isActive && <Badge variant="destructive">Unpublished</Badge>}
            </div>
            {excerptEn && (
              <p className="text-muted-foreground text-sm italic">{excerptEn}</p>
            )}
            <div className="flex flex-col gap-2 text-sm">
              {bodyEn
                .split('\n')
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
            {highlightsEn && (
              <ul className="list-disc pl-5 text-sm">
                {highlightsEn
                  .split('\n')
                  .filter(Boolean)
                  .map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              {tagsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basics</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Period</Label>
                  <Select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as CurrentAffairsPeriod)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as CurrentAffairsCategory)
                    }
                  >
                    <option value="national">National</option>
                    <option value="tamil-nadu">Tamil Nadu</option>
                    <option value="economy">Economy</option>
                    <option value="environment">Environment</option>
                    <option value="science-tech">Science &amp; Tech</option>
                    <option value="polity-governance">Polity &amp; Governance</option>
                    <option value="international">International</option>
                    <option value="sports-awards">Sports &amp; Awards</option>
                  </Select>
                </div>
              </div>
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
                <Label>Excerpt (English)</Label>
                <Textarea
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                  placeholder="A short hand-written teaser (optional)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Body (English, one paragraph per line)</Label>
                <Textarea
                  value={bodyEn}
                  onChange={(e) => setBodyEn(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Highlights (English, one per line)</Label>
                <Textarea
                  value={highlightsEn}
                  onChange={(e) => setHighlightsEn(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags &amp; Flags</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Exam relevance tags (comma-separated)</Label>
                  <Input
                    value={examRelevanceTagsInput}
                    onChange={(e) => setExamRelevanceTagsInput(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>General tags (comma-separated)</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                />
                Mark as important
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!isEditMode ? (
                <p className="text-muted-foreground text-xs">
                  Save this article first, then attach an image.
                </p>
              ) : (
                <>
                  {imageUrl && (
                    <img
                      src={optimizedCloudinaryUrl(imageUrl, 400)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="max-h-40 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImageMutation.mutate(file)
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={uploadImageMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-3.5" /> {imageUrl ? 'Replace' : 'Upload'}
                    </Button>
                    {imageUrl && (
                      <Button
                        size="sm"
                        variant="destructive"
                        loading={removeImageMutation.isPending}
                        onClick={() => removeImageMutation.mutate()}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Linked Questions (Related Practice)
              </CardTitle>
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
                            addQuestionLink(
                              q.id,
                              q.questionText.en || q.questionText.ta || q.id,
                            )
                          }
                        >
                          {q.questionText.en || q.questionText.ta}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quizQuestionIds.map((id) => (
                  <Badge key={id} variant="outline" className="flex items-center gap-1">
                    {linkedQuestionLabels[id] ?? id}
                    <button
                      type="button"
                      onClick={() => removeQuestionLink(id)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {quizQuestionIds.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    No linked questions yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Comprehension Quiz (self-contained)
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addQuizQuestion}>
                <Plus /> Add question
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {quizQuestions.length === 0 && (
                <p className="text-muted-foreground text-xs">No quiz questions yet.</p>
              )}
              {quizQuestions.map((quiz, qIndex) => (
                <div
                  key={quiz.questionId}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={quiz.questionText.en ?? ''}
                      onChange={(e) =>
                        updateQuizQuestion(qIndex, {
                          questionText: { en: e.target.value },
                        })
                      }
                      placeholder="Question text"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuizQuestion(qIndex)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {quiz.options.map((option, oIndex) => (
                    <div key={option.optionId} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${quiz.questionId}`}
                        checked={quiz.correctOptionId === option.optionId}
                        onChange={() =>
                          updateQuizQuestion(qIndex, { correctOptionId: option.optionId })
                        }
                      />
                      <Input
                        value={option.text.en ?? ''}
                        onChange={(e) => updateQuizOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => addQuizOption(qIndex)}
                    disabled={quiz.options.length >= 6}
                  >
                    <Plus className="size-3.5" /> Add option
                  </Button>
                  <Textarea
                    value={quiz.explanation.en ?? ''}
                    onChange={(e) =>
                      updateQuizQuestion(qIndex, { explanation: { en: e.target.value } })
                    }
                    placeholder="Explanation shown after answering"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Published (visible to students once saved)
              </label>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="publish-at">Schedule for later (optional)</Label>
                <Input
                  id="publish-at"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.currentAffairs)}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={handleSave}>
              {isEditMode ? 'Save Changes' : 'Create Article'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
