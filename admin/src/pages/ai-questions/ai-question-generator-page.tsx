import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ROUTES } from '@/constants/routes'
import {
  generateQuestions,
  type GenerateQuestionsInput,
} from '@/services/adminAiQuestionGeneratorService'
import {
  listMetaExams,
  listMetaSubjects,
  listMetaSubtopics,
  listMetaTopics,
  type QuestionDifficulty,
  type TnpscExamStage,
} from '@/services/adminQuestionsService'

const MAX_QUESTIONS_PER_BATCH = 5

function pickText(text: { en?: string; ta?: string }): string {
  return text.en || text.ta || '—'
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
 * Sprint 4 Step 65 — Admin AI Question Generator. Generation only ever
 * writes `AiQuestionDraft` rows (`status: 'pending'`) — nothing here can
 * make a question live; that's the Review Queue's job
 * (`ai-question-review-queue-page.tsx`), and only via an explicit Approve.
 * Cascading exam→subject→topic→subtopic pickers reuse the exact same
 * `adminQuestionsService` meta endpoints `questions-list-page.tsx` already
 * uses, so this generator can only ever target real, existing content.
 */
export function AiQuestionGeneratorPage() {
  const navigate = useNavigate()

  const [examId, setExamId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium')
  const [count, setCount] = useState(3)
  const [isPreviousYear, setIsPreviousYear] = useState(false)
  const [tnpscExamType, setTnpscExamType] = useState<TnpscExamStage | ''>('')
  const [language, setLanguage] = useState<'en' | 'ta'>('en')
  const [customInstructions, setCustomInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const generateMutation = useMutation({
    mutationFn: (input: GenerateQuestionsInput) => generateQuestions(input),
    onSuccess: (result) => {
      setError(null)
      navigate(`${ROUTES.aiQuestionReview}?batchId=${result.batchId}`)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const canGenerate = Boolean(examId && subjectId && topicId && subtopicId) && count >= 1

  function handleGenerate() {
    setError(null)
    generateMutation.mutate({
      examIds: [examId],
      subjectId,
      topicId,
      subtopicId,
      difficulty,
      count,
      isPreviousYear,
      tnpscExamType: tnpscExamType || undefined,
      language,
      customInstructions: customInstructions.trim() || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(ROUTES.questions)}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to Questions
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="text-primary size-4" aria-hidden="true" />
            AI Question Generator
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate MCQs by topic and difficulty, previous-year style, in English and
            Tamil. Nothing here is published automatically — every generated question goes
            to the Review Queue and needs your explicit approval.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(ROUTES.aiQuestionReview)}
        >
          Review Queue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:max-w-md">
          <div className="flex flex-col gap-1.5">
            <Label>Exam</Label>
            <Select
              value={examId}
              onChange={(e) => {
                setExamId(e.target.value)
                setSubjectId('')
                setTopicId('')
                setSubtopicId('')
              }}
            >
              <option value="">Select an exam...</option>
              {exams?.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {pickText(exam.name)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              disabled={!examId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setTopicId('')
                setSubtopicId('')
              }}
            >
              <option value="">Select a subject...</option>
              {subjects?.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {pickText(subject.name)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Topic</Label>
            <Select
              value={topicId}
              disabled={!subjectId}
              onChange={(e) => {
                setTopicId(e.target.value)
                setSubtopicId('')
              }}
            >
              <option value="">Select a topic...</option>
              {topics?.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {pickText(topic.name)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Subtopic</Label>
            <Select
              value={subtopicId}
              disabled={!topicId}
              onChange={(e) => setSubtopicId(e.target.value)}
            >
              <option value="">Select a subtopic...</option>
              {subtopics?.map((subtopic) => (
                <option key={subtopic.id} value={subtopic.id}>
                  {pickText(subtopic.name)}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:max-w-md">
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
            <Label>Number of questions (max {MAX_QUESTIONS_PER_BATCH})</Label>
            <Input
              type="number"
              min={1}
              max={MAX_QUESTIONS_PER_BATCH}
              value={count}
              onChange={(e) =>
                setCount(
                  Math.min(
                    MAX_QUESTIONS_PER_BATCH,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                )
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Language emphasis</Label>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ta')}
            >
              <option value="en">English</option>
              <option value="ta">Tamil</option>
            </Select>
            <p className="text-muted-foreground text-xs">
              Every question is generated in both English and Tamil regardless — this
              picks which language's phrasing is prioritized.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isPreviousYear}
              onChange={(e) => setIsPreviousYear(e.target.checked)}
            />
            <Label>Previous-year exam style</Label>
          </div>
          {isPreviousYear && (
            <div className="flex flex-col gap-1.5">
              <Label>Exam stage</Label>
              <Select
                value={tnpscExamType}
                onChange={(e) => setTnpscExamType(e.target.value as TnpscExamStage | '')}
              >
                <option value="">Any stage</option>
                <option value="prelims">Prelims</option>
                <option value="mains">Mains</option>
                <option value="interview">Interview</option>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Additional instructions (optional)</Label>
            <Textarea
              placeholder="e.g. focus on Article 370, or on post-independence timeline events"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          loading={generateMutation.isPending}
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          <Sparkles /> Generate {count} question{count === 1 ? '' : 's'}
        </Button>
        <Badge variant="outline">Admin-only · Never published automatically</Badge>
      </div>
    </div>
  )
}
