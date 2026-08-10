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
import {
  archiveSubtopic,
  createSubtopic,
  listSubtopics,
  listTopics,
  restoreSubtopic,
  updateSubtopic,
  updateSubtopicStatus,
  type AdminSubtopic,
  type AdminTopic,
  type ContentStatus,
  type SubtopicInput,
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

export function SubtopicsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [topicId, setTopicId] = useState('')
  const [status, setStatus] = useState<ContentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminSubtopic | 'new' | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: topics } = useQuery({
    queryKey: ['admin', 'topics', 'all'],
    queryFn: () => listTopics({ limit: 100 }),
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'subtopics', { search, topicId, status, page }],
    queryFn: () =>
      listSubtopics({
        search: search || undefined,
        topicId: topicId || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  function topicName(id: string): string {
    return pickText(topics?.items.find((t) => t.id === id)?.name ?? {})
  }

  async function handleToggle(subtopic: AdminSubtopic) {
    setPendingId(subtopic.id)
    try {
      await updateSubtopicStatus(subtopic.id, !subtopic.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subtopics'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(subtopic: AdminSubtopic) {
    setPendingId(subtopic.id)
    try {
      if (subtopic.status === 'archived') await restoreSubtopic(subtopic.id)
      else await archiveSubtopic(subtopic.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subtopics'] })
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
              placeholder="Search subtopics..."
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
            value={topicId}
            onChange={(e) => {
              setPage(1)
              setTopicId(e.target.value)
            }}
          >
            <option value="">All topics</option>
            {topics?.items.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {pickText(topic.name)}
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
          <Plus /> New Subtopic
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState
                title="Couldn't load subtopics"
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
              <EmptyState title="No subtopics match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Slug</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Topic</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((subtopic) => (
                    <tr
                      key={subtopic.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">{subtopic.slug}</td>
                      <td className="px-4 py-2.5 sm:px-5">{pickText(subtopic.name)}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        {topicName(subtopic.topicId)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={STATUS_BADGE[subtopic.status]}
                          className="capitalize"
                        >
                          {subtopic.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(subtopic)}
                          >
                            Edit
                          </Button>
                          {subtopic.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === subtopic.id}
                              onClick={() => void handleToggle(subtopic)}
                            >
                              {subtopic.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={
                              subtopic.status === 'archived' ? 'outline' : 'destructive'
                            }
                            size="sm"
                            loading={pendingId === subtopic.id}
                            onClick={() => void handleArchiveToggle(subtopic)}
                          >
                            {subtopic.status === 'archived' ? 'Restore' : 'Archive'}
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
        <SubtopicForm
          subtopic={editing === 'new' ? null : editing}
          topics={topics?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'subtopics'] })
          }}
        />
      )}
    </div>
  )
}

function SubtopicForm({
  subtopic,
  topics,
  onClose,
  onSaved,
}: {
  subtopic: AdminSubtopic | null
  topics: AdminTopic[]
  onClose: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState(subtopic?.slug ?? '')
  const [nameEn, setNameEn] = useState(subtopic?.name.en ?? '')
  const [nameTa, setNameTa] = useState(subtopic?.name.ta ?? '')
  const [topicId, setTopicId] = useState(subtopic?.topicId ?? topics[0]?.id ?? '')
  const [order, setOrder] = useState(String(subtopic?.order ?? 0))
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(subtopic?.estimatedMinutes ?? ''),
  )
  const [isActive, setIsActive] = useState(subtopic?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!topicId) throw new Error('Select a topic.')
      const input: SubtopicInput = {
        slug: slug.trim(),
        topicId,
        name: { en: nameEn.trim(), ta: nameTa.trim() || undefined },
        order: Number(order) || 0,
        estimatedMinutes: estimatedMinutes.trim() ? Number(estimatedMinutes) : undefined,
        isActive,
      }
      return subtopic ? updateSubtopic(subtopic.id, input) : createSubtopic(input)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold">
          {subtopic ? 'Edit Subtopic' : 'New Subtopic'}
        </h3>
        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Topic *</Label>
            <Select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Select topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {pickText(topic.name)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. newtons-laws-of-motion"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Name (English)</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Name (Tamil)</Label>
            <Input value={nameTa} onChange={(e) => setNameTa(e.target.value)} />
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
            <Label>Estimated minutes</Label>
            <Input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          </div>
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
            disabled={!nameEn.trim() || !slug.trim() || !topicId}
            onClick={() => mutation.mutate()}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
