import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import {
  createQuestionPaper,
  getQuestionPaper,
  updateQuestionPaper,
  uploadQuestionPaperFile,
  type QuestionPaperInput,
  type TnpscExamStage,
} from '@/services/adminQuestionPapersService'
import { listMetaExams } from '@/services/adminQuestionsService'

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)
      ?.error?.message
    if (message) return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Previous Year Question Paper create/edit — mirrors
 * `current-affair-editor-page.tsx`'s save/upload conventions, considerably
 * simpler (no quiz builder, no linked-question picker): exam + year +
 * bilingual title + optional exam stage + a single PDF file.
 */
export function QuestionPaperEditorPage() {
  const { paperId } = useParams<{ paperId?: string }>()
  const isEditMode = Boolean(paperId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formError, setFormError] = useState<string | null>(null)
  const [examId, setExamId] = useState('')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [titleEn, setTitleEn] = useState('')
  const [titleTa, setTitleTa] = useState('')
  const [tnpscExamType, setTnpscExamType] = useState<TnpscExamStage | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined)

  const { data: exams } = useQuery({
    queryKey: ['admin', 'question-papers', 'meta', 'exams'],
    queryFn: listMetaExams,
  })

  const {
    data: existing,
    isPending: isLoadingExisting,
    isError: isLoadingError,
  } = useQuery({
    queryKey: ['admin', 'question-papers', paperId],
    queryFn: () => getQuestionPaper(paperId as string),
    enabled: isEditMode,
  })

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!existing || hydratedRef.current) return
    hydratedRef.current = true
    setExamId(existing.examId)
    setYear(existing.year)
    setTitleEn(existing.title.en ?? '')
    setTitleTa(existing.title.ta ?? '')
    setTnpscExamType(existing.tnpscExamType ?? '')
    setIsActive(existing.isActive)
    setFileUrl(existing.fileUrl)
  }, [existing])

  function buildPayload(): QuestionPaperInput | null {
    if (!examId) {
      setFormError('Please select an exam.')
      return null
    }
    if (!titleEn.trim()) {
      setFormError('English title is required.')
      return null
    }
    setFormError(null)
    return {
      examId,
      year,
      title: { en: titleEn.trim(), ta: titleTa.trim() || undefined },
      tnpscExamType: tnpscExamType || undefined,
      isActive,
    }
  }

  const saveMutation = useMutation({
    mutationFn: (input: QuestionPaperInput) =>
      isEditMode ? updateQuestionPaper(paperId as string, input) : createQuestionPaper(input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'question-papers'] })
      if (!isEditMode) navigate(ROUTES.questionPaperEdit(saved.id))
      else navigate(ROUTES.questionPapers)
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => uploadQuestionPaperFile(paperId as string, file),
    onSuccess: (saved) => setFileUrl(saved.fileUrl),
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  function handleSave() {
    const payload = buildPayload()
    if (payload) saveMutation.mutate(payload)
  }

  if (isEditMode && isLoadingError) return <ErrorState title="Couldn't load this paper" />
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
      <button
        type="button"
        onClick={() => navigate(ROUTES.questionPapers)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to Question Papers
      </button>

      <h1 className="text-lg font-semibold">
        {isEditMode ? 'Edit Question Paper' : 'New Question Paper'}
      </h1>

      {formError && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {formError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Exam *</Label>
              <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
                <option value="">Select an exam</option>
                {exams?.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name.en || exam.name.ta}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Year *</Label>
              <Input
                type="number"
                min={1990}
                max={CURRENT_YEAR + 1}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Exam Stage</Label>
              <Select
                value={tnpscExamType}
                onChange={(e) => setTnpscExamType(e.target.value as TnpscExamStage | '')}
              >
                <option value="">Not specified</option>
                <option value="prelims">Prelims</option>
                <option value="mains">Mains</option>
                <option value="interview">Interview</option>
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
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible to students, subject to the free-limit/unlock gate)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF File</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!isEditMode ? (
            <p className="text-muted-foreground text-xs">
              Save this paper first, then upload its PDF.
            </p>
          ) : (
            <>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  View current file
                </a>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadFileMutation.mutate(file)
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  loading={uploadFileMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" /> {fileUrl ? 'Replace' : 'Upload'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(ROUTES.questionPapers)}>
          Cancel
        </Button>
        <Button loading={saveMutation.isPending} onClick={handleSave}>
          {isEditMode ? 'Save Changes' : 'Create Paper'}
        </Button>
      </div>
    </div>
  )
}
