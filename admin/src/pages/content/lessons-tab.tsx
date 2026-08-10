import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  archiveLesson,
  createLesson,
  listLessons,
  listSubtopics,
  restoreLesson,
  updateLesson,
  updateLessonStatus,
  type AdminLesson,
  type AdminSubtopic,
  type ContentStatus,
  type LessonInput,
} from '@/services/adminContentService'

const STATUS_BADGE: Record<ContentStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  inactive: 'warning',
  archived: 'destructive',
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

export function LessonsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [status, setStatus] = useState<ContentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminLesson | 'new' | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: subtopics } = useQuery({
    queryKey: ['admin', 'subtopics', 'all'],
    queryFn: () => listSubtopics({ limit: 100 }),
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'lessons', { search, subtopicId, status, page }],
    queryFn: () =>
      listLessons({
        search: search || undefined,
        subtopicId: subtopicId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  function subtopicName(id: string): string {
    return pickText(subtopics?.items.find((s) => s.id === id)?.name ?? {})
  }

  async function handleToggle(lesson: AdminLesson) {
    setPendingId(lesson.id)
    try {
      await updateLessonStatus(lesson.id, !lesson.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'lessons'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(lesson: AdminLesson) {
    setPendingId(lesson.id)
    try {
      if (lesson.status === 'archived') await restoreLesson(lesson.id)
      else await archiveLesson(lesson.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'lessons'] })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative sm:max-w-xs">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              placeholder="Search lessons..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
            />
          </div>
          <Select
            className="w-40"
            value={subtopicId}
            onChange={(e) => {
              setPage(1)
              setSubtopicId(e.target.value)
            }}
          >
            <option value="">All subtopics</option>
            {subtopics?.items.map((subtopic) => (
              <option key={subtopic.id} value={subtopic.id}>
                {pickText(subtopic.name)}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value as ContentStatus | '')
            }}
          >
            <option value="">Active + Inactive</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus /> New Lesson
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load lessons" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No lessons match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Type</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Subtopic</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lesson) => (
                    <tr
                      key={lesson.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">
                        {pickText(lesson.title)}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">{lesson.type}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        {subtopicName(lesson.subtopicId)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={STATUS_BADGE[lesson.status]}
                          className="capitalize"
                        >
                          {lesson.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(lesson)}
                          >
                            Edit
                          </Button>
                          {lesson.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === lesson.id}
                              onClick={() => void handleToggle(lesson)}
                            >
                              {lesson.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={
                              lesson.status === 'archived' ? 'outline' : 'destructive'
                            }
                            size="sm"
                            loading={pendingId === lesson.id}
                            onClick={() => void handleArchiveToggle(lesson)}
                          >
                            {lesson.status === 'archived' ? 'Restore' : 'Archive'}
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

      {editing && (
        <LessonForm
          lesson={editing === 'new' ? null : editing}
          subtopics={subtopics?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'lessons'] })
          }}
        />
      )}
    </div>
  )
}

function LessonForm({
  lesson,
  subtopics,
  onClose,
  onSaved,
}: {
  lesson: AdminLesson | null
  subtopics: AdminSubtopic[]
  onClose: () => void
  onSaved: () => void
}) {
  const [subtopicId, setSubtopicId] = useState(
    lesson?.subtopicId ?? subtopics[0]?.id ?? '',
  )
  const [titleEn, setTitleEn] = useState(lesson?.title.en ?? '')
  const [titleTa, setTitleTa] = useState(lesson?.title.ta ?? '')
  const [type, setType] = useState<'video' | 'reading' | 'mixed'>(
    (lesson?.type as 'video' | 'reading' | 'mixed') ?? 'video',
  )
  const [order, setOrder] = useState(String(lesson?.order ?? 0))
  const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.video?.thumbnailUrl ?? '')
  const [cloudinaryAssetId, setCloudinaryAssetId] = useState(
    lesson?.video?.cloudinaryAssetId ?? '',
  )
  const [durationSeconds, setDurationSeconds] = useState(
    String(lesson?.video?.durationSeconds ?? ''),
  )
  const [transcriptEn, setTranscriptEn] = useState(lesson?.transcript?.en ?? '')
  const [isPremium, setIsPremium] = useState(lesson?.isPremium ?? false)
  const [isActive, setIsActive] = useState(lesson?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!subtopicId) throw new Error('Select a subtopic.')
      const input: LessonInput = {
        subtopicId,
        title: { en: titleEn.trim(), ta: titleTa.trim() || undefined },
        type,
        order: Number(order) || 0,
        video:
          thumbnailUrl.trim() || cloudinaryAssetId.trim() || durationSeconds.trim()
            ? {
                thumbnailUrl: thumbnailUrl.trim() || undefined,
                cloudinaryAssetId: cloudinaryAssetId.trim() || undefined,
                durationSeconds: durationSeconds.trim()
                  ? Number(durationSeconds)
                  : undefined,
              }
            : undefined,
        transcript: transcriptEn.trim() ? { en: transcriptEn.trim() } : undefined,
        isPremium,
        isActive,
      }
      return lesson ? updateLesson(lesson.id, input) : createLesson(input)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold">{lesson ? 'Edit Lesson' : 'New Lesson'}</h3>
        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Subtopic *</Label>
            <Select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
              <option value="">Select subtopic</option>
              {subtopics.map((subtopic) => (
                <option key={subtopic.id} value={subtopic.id}>
                  {pickText(subtopic.name)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as 'video' | 'reading' | 'mixed')}
            >
              <option value="video">Video</option>
              <option value="reading">Reading</option>
              <option value="mixed">Mixed</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title (English)</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title (Tamil)</Label>
            <Input value={titleTa} onChange={(e) => setTitleTa(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Order</Label>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Video duration (seconds)</Label>
            <Input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Video thumbnail URL</Label>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cloudinary video asset ID</Label>
            <Input
              value={cloudinaryAssetId}
              onChange={(e) => setCloudinaryAssetId(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Transcript (English)</Label>
          <Textarea
            value={transcriptEn}
            onChange={(e) => setTranscriptEn(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
            />
            Premium
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!titleEn.trim() || !subtopicId}
            onClick={() => mutation.mutate()}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
