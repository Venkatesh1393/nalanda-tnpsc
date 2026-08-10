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
  archiveSubject,
  createSubject,
  listExams,
  listSubjects,
  restoreSubject,
  updateSubject,
  updateSubjectStatus,
  type AdminSubject,
  type ContentStatus,
  type SubjectInput,
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

export function SubjectsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminSubject | 'new' | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: exams } = useQuery({
    queryKey: ['admin', 'exams', 'all'],
    queryFn: () => listExams({ limit: 100 }),
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'subjects', { search, status, page }],
    queryFn: () =>
      listSubjects({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  async function handleToggle(subject: AdminSubject) {
    setPendingId(subject.id)
    try {
      await updateSubjectStatus(subject.id, !subject.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(subject: AdminSubject) {
    setPendingId(subject.id)
    try {
      if (subject.status === 'archived') await restoreSubject(subject.id)
      else await archiveSubject(subject.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] })
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
              placeholder="Search subjects..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
            />
          </div>
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
          <Plus /> New Subject
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load subjects" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No subjects match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Slug</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Order</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((subject) => (
                    <tr
                      key={subject.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">{subject.slug}</td>
                      <td className="px-4 py-2.5 sm:px-5">{pickText(subject.name)}</td>
                      <td className="px-4 py-2.5 sm:px-5">{subject.order}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={STATUS_BADGE[subject.status]}
                          className="capitalize"
                        >
                          {subject.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(subject)}
                          >
                            Edit
                          </Button>
                          {subject.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === subject.id}
                              onClick={() => void handleToggle(subject)}
                            >
                              {subject.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={
                              subject.status === 'archived' ? 'outline' : 'destructive'
                            }
                            size="sm"
                            loading={pendingId === subject.id}
                            onClick={() => void handleArchiveToggle(subject)}
                          >
                            {subject.status === 'archived' ? 'Restore' : 'Archive'}
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
        <SubjectForm
          subject={editing === 'new' ? null : editing}
          exams={exams?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] })
          }}
        />
      )}
    </div>
  )
}

function SubjectForm({
  subject,
  exams,
  onClose,
  onSaved,
}: {
  subject: AdminSubject | null
  exams: { id: string; name: { en?: string; ta?: string }; code: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState(subject?.slug ?? '')
  const [nameEn, setNameEn] = useState(subject?.name.en ?? '')
  const [nameTa, setNameTa] = useState(subject?.name.ta ?? '')
  const [examIds, setExamIds] = useState<string[]>(subject?.examIds ?? [])
  const [icon, setIcon] = useState(subject?.icon ?? '')
  const [order, setOrder] = useState(String(subject?.order ?? 0))
  const [isActive, setIsActive] = useState(subject?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  function toggleExam(examId: string) {
    setExamIds((current) =>
      current.includes(examId)
        ? current.filter((id) => id !== examId)
        : [...current, examId],
    )
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (examIds.length === 0) throw new Error('Select at least one exam.')
      const input: SubjectInput = {
        slug: slug.trim(),
        name: { en: nameEn.trim(), ta: nameTa.trim() || undefined },
        examIds,
        icon: icon.trim() || undefined,
        order: Number(order) || 0,
        isActive,
      }
      return subject ? updateSubject(subject.id, input) : createSubject(input)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold">
          {subject ? 'Edit Subject' : 'New Subject'}
        </h3>
        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. general-science"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Icon (lucide-react name)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
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
          <label className="mt-6 flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Exams *</Label>
          <div className="flex flex-wrap gap-3">
            {exams.map((exam) => (
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!nameEn.trim() || !slug.trim()}
            onClick={() => mutation.mutate()}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
