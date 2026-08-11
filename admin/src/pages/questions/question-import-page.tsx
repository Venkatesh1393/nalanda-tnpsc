import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  FileWarning,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ROUTES } from '@/constants/routes'
import {
  confirmImport,
  downloadImportTemplate,
  extractPdfMetadata,
  previewImport,
  type ImportConfirmResult,
  type ImportPreviewResult,
  type ImportRowClientView,
  type PdfMetadataResult,
} from '@/services/adminQuestionsService'

type RowFilter = 'all' | 'valid' | 'invalid' | 'duplicate'

const STATUS_BADGE: Record<
  ImportRowClientView['status'],
  'success' | 'warning' | 'destructive'
> = {
  valid: 'success',
  duplicate: 'warning',
  invalid: 'destructive',
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

/** Prefixes any cell that starts with a formula-trigger character with a
 * single quote before it ever reaches a CSV a human might reopen in Excel —
 * the formula-injection defense for the client-generated error report
 * (Step 53's "protect against formula injection" requirement). Backend
 * ingestion already never trusts a raw formula cell either — see
 * `questionImport.service.ts`'s `cellToText`. */
function sanitizeCsvCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function toCsvField(value: string): string {
  const sanitized = sanitizeCsvCell(value)
  return /[",\n]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized
}

function downloadErrorReport(preview: ImportPreviewResult) {
  const lines = [['Row', 'Field', 'Error', 'Suggestion'].join(',')]
  for (const row of preview.rows) {
    if (row.status !== 'invalid') continue
    for (const issue of row.errors) {
      lines.push(
        [String(row.rowNumber), issue.field, issue.message, issue.suggestion ?? '']
          .map(toCsvField)
          .join(','),
      )
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'question-import-errors.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Bulk Question Import wizard (Step 53): Upload → Preview (parse + validate
 * server-side, nothing written yet) → review valid/invalid/duplicate rows →
 * Confirm Import (re-uploads the same file; only the rows the admin left
 * checked, and that are still valid, are written). Only
 * `content_editor`/`admin`/`super_admin` can even reach this page's backend
 * calls — independently enforced server-side regardless of this page's own
 * route guard.
 */
export function QuestionImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [filterTab, setFilterTab] = useState<RowFilter>('all')
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadataResult | null>(null)
  const pdfMetadataMutation = useMutation({
    mutationFn: (selectedFile: File) => extractPdfMetadata(selectedFile),
    onSuccess: (result) => setPdfMetadata(result),
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const previewMutation = useMutation({
    mutationFn: (selectedFile: File) => previewImport(selectedFile),
    onSuccess: (result) => {
      setPreview(result)
      setConfirmResult(null)
      setError(null)
      setSelectedRows(
        new Set(
          result.rows.filter((row) => row.status === 'valid').map((row) => row.rowNumber),
        ),
      )
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmImport(file as File, Array.from(selectedRows)),
    onSuccess: async (result) => {
      setConfirmResult(result)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  function handleFileChange(selected: File | null) {
    setFile(selected)
    setPreview(null)
    setConfirmResult(null)
    setError(null)
    setSelectedRows(new Set())
  }

  function toggleRow(rowNumber: number) {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const rows = preview?.rows ?? []
  const filteredRows = rows.filter(
    (row) => filterTab === 'all' || row.status === filterTab,
  )
  const selectedValidCount = rows.filter(
    (row) => row.status === 'valid' && selectedRows.has(row.rowNumber),
  ).length

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

      <div>
        <h1 className="text-lg font-semibold">Bulk Import Questions</h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or XLSX file, review the parsed rows, then confirm the import.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadImportTemplate('csv')}
          >
            <Download /> Download CSV template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadImportTemplate('xlsx')}
          >
            <Download /> Download XLSX template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadImportTemplate('docx')}
          >
            <Download /> Download Word template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Upload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.docx"
            className="text-sm"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-muted-foreground text-xs">
            CSV, XLSX, or Word (.docx — must follow the downloadable Word template's
            structure; a freeform document won't parse).
          </p>
          <div>
            <Button
              size="sm"
              disabled={!file}
              loading={previewMutation.isPending}
              onClick={() => file && previewMutation.mutate(file)}
            >
              <Upload /> Parse &amp; Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Extract PDF Metadata{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Reads a PDF's document properties only (title/author/date) — never attempts to
            extract question text from PDF pages. Use it to look up a source PYQ paper's
            year/title before filling in a CSV/XLSX/Word import.
          </p>
          <input
            type="file"
            accept=".pdf"
            className="text-sm"
            onChange={(e) => {
              setPdfFile(e.target.files?.[0] ?? null)
              setPdfMetadata(null)
            }}
          />
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={!pdfFile}
              loading={pdfMetadataMutation.isPending}
              onClick={() => pdfFile && pdfMetadataMutation.mutate(pdfFile)}
            >
              <FileText /> Extract Metadata
            </Button>
          </div>
          {pdfMetadata && (
            <dl className="bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md p-3 text-sm">
              <dt className="text-muted-foreground">Title</dt>
              <dd>{pdfMetadata.title ?? '—'}</dd>
              <dt className="text-muted-foreground">Author</dt>
              <dd>{pdfMetadata.author ?? '—'}</dd>
              <dt className="text-muted-foreground">Creation date</dt>
              <dd>{pdfMetadata.creationDate ?? '—'}</dd>
              <dt className="text-muted-foreground">Pages</dt>
              <dd>{pdfMetadata.pageCount}</dd>
              {pdfMetadata.suggestedPyqYear && (
                <>
                  <dt className="text-muted-foreground">Suggested PYQ year</dt>
                  <dd>{pdfMetadata.suggestedPyqYear}</dd>
                </>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2.5 text-sm">
          {error}
        </p>
      )}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Preview — {preview.fileName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{preview.totalRows} total rows</Badge>
              <Badge variant="success">{preview.validCount} valid</Badge>
              <Badge variant="destructive">{preview.invalidCount} invalid</Badge>
              <Badge variant="warning">{preview.duplicateCount} duplicate</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'valid', 'invalid', 'duplicate'] as RowFilter[]).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={filterTab === tab ? 'default' : 'outline'}
                  onClick={() => setFilterTab(tab)}
                  className="capitalize"
                >
                  {tab}
                </Button>
              ))}
              {preview.invalidCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadErrorReport(preview)}
                >
                  <FileWarning /> Download error report
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {filteredRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No rows in this category.</p>
              ) : (
                filteredRows.map((row) => (
                  <div key={row.rowNumber} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {row.status === 'valid' && (
                          <Checkbox
                            className="mt-1"
                            checked={selectedRows.has(row.rowNumber)}
                            onChange={() => toggleRow(row.rowNumber)}
                          />
                        )}
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Row {row.rowNumber}
                          </span>
                          {row.preview ? (
                            <p className="font-medium">{row.preview.questionTextEn}</p>
                          ) : (
                            <p className="text-muted-foreground italic">
                              {row.raw.questionTextEn || '(no question text)'}
                            </p>
                          )}
                          {row.preview && (
                            <p className="text-muted-foreground text-xs">
                              {row.preview.subjectName} / {row.preview.topicName} /{' '}
                              {row.preview.subtopicName} · {row.preview.optionsCount}{' '}
                              options · {row.preview.difficulty}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={STATUS_BADGE[row.status]}
                        className="shrink-0 capitalize"
                      >
                        {row.status}
                      </Badge>
                    </div>
                    {row.errors.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {row.errors.map((issue, i) => (
                          <li
                            key={i}
                            className="text-destructive flex items-start gap-1.5 text-xs"
                          >
                            <AlertTriangle
                              className="mt-0.5 size-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              <strong>{issue.field}:</strong> {issue.message}
                              {issue.suggestion && ` (suggestion: ${issue.suggestion})`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.warnings.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {row.warnings.map((warning, i) => (
                          <li key={i} className="text-muted-foreground text-xs">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-muted-foreground text-sm">
                {selectedValidCount} row{selectedValidCount === 1 ? '' : 's'} selected for
                import
              </p>
              <Button
                loading={confirmMutation.isPending}
                disabled={selectedValidCount === 0}
                onClick={() => confirmMutation.mutate()}
              >
                <CheckCircle2 /> Confirm Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {confirmResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Result</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-success text-sm">
              {confirmResult.insertedCount} question
              {confirmResult.insertedCount === 1 ? '' : 's'} imported.
            </p>
            {confirmResult.skippedCount > 0 && (
              <p className="text-muted-foreground text-sm">
                {confirmResult.skippedCount} row(s) skipped (not selected or no longer
                valid).
              </p>
            )}
            {confirmResult.failures.length > 0 && (
              <div>
                <p className="text-destructive text-sm font-medium">
                  {confirmResult.failures.length} row(s) failed to insert:
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {confirmResult.failures.map((failure) => (
                    <li key={failure.rowNumber} className="text-destructive text-xs">
                      Row {failure.rowNumber}: {failure.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => navigate(ROUTES.questions)}
            >
              Go to Questions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
