import pdfParse from 'pdf-parse'

import { ApiError } from '../../utils/ApiError'

/**
 * Sprint 4 Step 71.5 — "PDF metadata" (confirmed scope: document properties
 * only, never an attempt to extract question text/options from PDF pages —
 * that needs real OCR/layout-detection, a separate, much larger project
 * with a real failure rate on the scanned PYQ papers this would actually
 * see). A read-only assistive utility: the admin reads the extracted
 * title/author/date and manually applies it to `source`/`pyqYear`/`tags` on
 * a subsequent import or edit — nothing here writes to MongoDB, so unlike
 * every mutation elsewhere in this module, this deliberately has no
 * `auditLogService` call (matches the existing "reads aren't audited, only
 * mutations are" convention).
 */

export interface PdfMetadataResult {
  title?: string
  author?: string
  subject?: string
  creationDate?: string
  producer?: string
  pageCount: number
  /** A best-effort guess at a PYQ year, parsed from `creationDate` when it
   * falls in a plausible exam-paper range — the admin still confirms it
   * manually, this is a suggestion, not an applied value. */
  suggestedPyqYear?: number
}

/** PDF `Info` dictionary dates are stored as `D:YYYYMMDDHHmmSS...` — this
 * pulls out just the 4-digit year, tolerant of the field being absent or in
 * an unexpected format (a malformed date here should degrade to "no
 * suggestion," never throw). */
function extractYear(pdfDate: unknown): number | undefined {
  if (typeof pdfDate !== 'string') return undefined
  const match = /D:(\d{4})/.exec(pdfDate)
  if (!match) return undefined
  const year = Number(match[1])
  const currentYear = new Date().getFullYear()
  return year >= 1990 && year <= currentYear + 1 ? year : undefined
}

export async function extractMetadata(buffer: Buffer): Promise<PdfMetadataResult> {
  let parsed: Awaited<ReturnType<typeof pdfParse>>
  try {
    // `max: 1` — this only ever reads the document Info dictionary, never
    // page text; capping page rendering to 1 keeps a large PDF cheap to
    // process for a metadata-only read.
    parsed = await pdfParse(buffer, { max: 1 })
  } catch {
    throw ApiError.badRequest(
      'The PDF file could not be read. Please make sure it is a valid PDF file.',
    )
  }

  const info = (parsed.info ?? {}) as Record<string, unknown>
  const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined

  return {
    title: asString(info.Title),
    author: asString(info.Author),
    subject: asString(info.Subject),
    creationDate: asString(info.CreationDate),
    producer: asString(info.Producer),
    pageCount: parsed.numpages,
    suggestedPyqYear: extractYear(info.CreationDate),
  }
}
