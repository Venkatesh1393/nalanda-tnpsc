import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { FileText, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

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
  archiveStudyMaterial,
  createStudyMaterial,
  listStudyMaterials,
  listSubtopics,
  removeStudyMaterialFile,
  restoreStudyMaterial,
  updateStudyMaterial,
  updateStudyMaterialStatus,
  uploadStudyMaterialFile,
  type AdminStudyMaterial,
  type AdminSubtopic,
  type ContentStatus,
  type StudyMaterialInput,
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

export function StudyMaterialsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [status, setStatus] = useState<ContentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminStudyMaterial | 'new' | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: subtopics } = useQuery({
    queryKey: ['admin', 'subtopics', 'all'],
    queryFn: () => listSubtopics({ limit: 100 }),
  })

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'study-materials', { search, subtopicId, status, page }],
    queryFn: () =>
      listStudyMaterials({
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

  async function handleToggle(material: AdminStudyMaterial) {
    setPendingId(material.id)
    try {
      await updateStudyMaterialStatus(material.id, !material.isActive)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'study-materials'] })
    } finally {
      setPendingId(null)
    }
  }

  async function handleArchiveToggle(material: AdminStudyMaterial) {
    setPendingId(material.id)
    try {
      if (material.status === 'archived') await restoreStudyMaterial(material.id)
      else await archiveStudyMaterial(material.id)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'study-materials'] })
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
              placeholder="Search study materials..."
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
          <Plus /> New Study Material
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isError ? (
            <div className="p-4 sm:p-5">
              <ErrorState
                title="Couldn't load study materials"
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
              <EmptyState title="No study materials match these filters" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Title</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Type</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Subtopic</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">File</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((material) => (
                    <tr
                      key={material.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium sm:px-5">
                        {pickText(material.title)}
                      </td>
                      <td className="px-4 py-2.5 capitalize sm:px-5">{material.type}</td>
                      <td className="px-4 py-2.5 sm:px-5">
                        {subtopicName(material.subtopicId)}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        {material.fileUrl ? (
                          <a
                            href={material.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            <FileText className="size-3.5" />{' '}
                            {material.fileFormat ?? 'file'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">none</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <Badge
                          variant={STATUS_BADGE[material.status]}
                          className="capitalize"
                        >
                          {material.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 sm:px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(material)}
                          >
                            Edit
                          </Button>
                          {material.status !== 'archived' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={pendingId === material.id}
                              onClick={() => void handleToggle(material)}
                            >
                              {material.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                          <Button
                            variant={
                              material.status === 'archived' ? 'outline' : 'destructive'
                            }
                            size="sm"
                            loading={pendingId === material.id}
                            onClick={() => void handleArchiveToggle(material)}
                          >
                            {material.status === 'archived' ? 'Restore' : 'Archive'}
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
        <StudyMaterialForm
          material={editing === 'new' ? null : editing}
          subtopics={subtopics?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'study-materials'] })
          }}
          onFullyClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function StudyMaterialForm({
  material,
  subtopics,
  onClose,
  onSaved,
  onFullyClose,
}: {
  material: AdminStudyMaterial | null
  subtopics: AdminSubtopic[]
  onClose: () => void
  onSaved: () => void
  onFullyClose: () => void
}) {
  const [current, setCurrent] = useState(material)
  const [subtopicId, setSubtopicId] = useState(
    current?.subtopicId ?? subtopics[0]?.id ?? '',
  )
  const [titleEn, setTitleEn] = useState(current?.title.en ?? '')
  const [titleTa, setTitleTa] = useState(current?.title.ta ?? '')
  const [type, setType] = useState<'notes' | 'pdf' | 'reference'>(
    (current?.type as 'notes' | 'pdf' | 'reference') ?? 'notes',
  )
  const [bodyEn, setBodyEn] = useState(current?.body.en.join('\n') ?? '')
  const [isPremium, setIsPremium] = useState(current?.isPremium ?? false)
  const [isActive, setIsActive] = useState(current?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!subtopicId) throw new Error('Select a subtopic.')
      const input: StudyMaterialInput = {
        subtopicId,
        title: { en: titleEn.trim(), ta: titleTa.trim() || undefined },
        body: {
          en: bodyEn
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          ta: [],
        },
        type,
        isPremium,
        isActive,
      }
      return current ? updateStudyMaterial(current.id, input) : createStudyMaterial(input)
    },
    onSuccess: (saved) => {
      setCurrent(saved)
      onSaved()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadStudyMaterialFile(current!.id, file),
    onSuccess: (saved) => {
      setCurrent(saved)
      onSaved()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const removeFileMutation = useMutation({
    mutationFn: () => removeStudyMaterialFile(current!.id),
    onSuccess: (saved) => {
      setCurrent(saved)
      onSaved()
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-sm font-semibold">
          {current ? 'Edit Study Material' : 'New Study Material'}
        </h3>
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
              onChange={(e) => setType(e.target.value as 'notes' | 'pdf' | 'reference')}
            >
              <option value="notes">Notes</option>
              <option value="pdf">PDF</option>
              <option value="reference">Reference</option>
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
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Body (English, one paragraph per line)</Label>
          <Textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            className="min-h-32"
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
            Close
          </Button>
          <Button
            loading={saveMutation.isPending}
            disabled={!titleEn.trim() || !subtopicId}
            onClick={() => saveMutation.mutate()}
          >
            {current ? 'Save Changes' : 'Create'}
          </Button>
        </div>

        {current && (
          <div className="mt-2 flex flex-col gap-2 border-t pt-3">
            <Label>File (Cloudinary — upload / replace / preview / remove)</Label>
            {current.fileUrl ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <a
                  href={current.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <FileText className="size-3.5" /> Preview current file (
                  {current.fileFormat}, {Math.round((current.fileBytes ?? 0) / 1024)} KB)
                </a>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={removeFileMutation.isPending}
                  onClick={() => removeFileMutation.mutate()}
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No file uploaded yet.</p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                loading={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />{' '}
                {current.fileUrl ? 'Replace file' : 'Upload file'}
              </Button>
            </div>
          </div>
        )}

        {!current && (
          <p className="text-muted-foreground text-xs">
            Save this record first, then upload its file.
          </p>
        )}

        <Button variant="ghost" size="sm" className="w-fit" onClick={onFullyClose}>
          Done
        </Button>
      </CardContent>
    </Card>
  )
}
