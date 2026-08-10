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
  createExam,
  listExams,
  updateExam,
  updateExamStatus,
  type AdminExam,
  type ExamInput,
} from '@/services/adminContentService'

const EXAM_CODES = [
  'group-1',
  'group-2',
  'group-2a',
  'group-4',
  'vao',
  'police',
  'forest',
  'trb',
]

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

export function ExamsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminExam | 'new' | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'exams', { search, status, page }],
    queryFn: () =>
      listExams({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  })

  async function handleToggle(exam: AdminExam) {
    setPendingId(exam.id)
    try {
      await updateExamStatus(exam.id, !exam.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] })
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
              placeholder="Search exams..."
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
              setStatus(e.target.value as 'active' | 'inactive' | '')
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus /> New Exam
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState title="Couldn't load exams" onRetry={() => void refetch()} />
            </div>
          ) : isPending || !data ? (
            <div className="flex flex-col gap-2 p-4 sm:p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState title="No exams match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Code</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Name</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Order</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((exam) => (
                    <tr
                      key={exam.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">{exam.code}</td>
                      <td className="px-4 py-2.5 sm:px-5">{pickText(exam.name)}</td>
                      <td className="px-4 py-2.5 sm:px-5">{exam.order}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge variant={exam.isActive ? 'success' : 'warning'}>
                          {exam.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(exam)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            loading={pendingId === exam.id}
                            onClick={() => void handleToggle(exam)}
                          >
                            {exam.isActive ? 'Deactivate' : 'Activate'}
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
        <ExamForm
          exam={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] })
          }}
        />
      )}
    </div>
  )
}

function ExamForm({
  exam,
  onClose,
  onSaved,
}: {
  exam: AdminExam | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(exam?.code ?? EXAM_CODES[0]!)
  const [nameEn, setNameEn] = useState(exam?.name.en ?? '')
  const [nameTa, setNameTa] = useState(exam?.name.ta ?? '')
  const [icon, setIcon] = useState(exam?.icon ?? '')
  const [order, setOrder] = useState(String(exam?.order ?? 0))
  const [isActive, setIsActive] = useState(exam?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const input: ExamInput = {
        code,
        name: { en: nameEn.trim(), ta: nameTa.trim() || undefined },
        icon: icon.trim() || undefined,
        order: Number(order) || 0,
        isActive,
      }
      return exam ? updateExam(exam.id, input) : createExam(input)
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold">{exam ? 'Edit Exam' : 'New Exam'}</h3>
        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <Select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={Boolean(exam)}
            >
              {EXAM_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Icon (lucide-react name)</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. landmark"
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
          <label className="mt-6 flex items-center gap-1.5 text-sm">
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
            disabled={!nameEn.trim()}
            onClick={() => mutation.mutate()}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
