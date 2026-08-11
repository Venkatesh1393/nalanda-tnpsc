import type { Request, Response } from 'express'

import * as pdfMetadataService from '../../services/admin/pdfMetadata.service'
import * as questionImportService from '../../services/admin/questionImport.service'
import { ApiError } from '../../utils/ApiError'
import { sendSuccess } from '../../utils/ApiResponse'
import type { ImportConfirmBody } from '../../validators/question.validator'

function requireActor(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  return { id: req.user.sub, role: req.user.role }
}

function requireFile(req: Request): Express.Multer.File {
  if (!req.file) throw ApiError.badRequest('A file is required (field name "file").')
  return req.file
}

export async function downloadTemplate(req: Request, res: Response): Promise<void> {
  const format = req.query.format as string

  if (format === 'docx') {
    const buffer = await questionImportService.generateTemplateDocx()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-import-template.docx"',
    )
    res.send(buffer)
    return
  }

  if (format === 'xlsx') {
    const buffer = await questionImportService.generateTemplateXlsx()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-import-template.xlsx"',
    )
    res.send(buffer)
    return
  }

  const csv = questionImportService.generateTemplateCsv()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="question-import-template.csv"',
  )
  res.send(csv)
}

/**
 * Sprint 4 Step 71.5 — PDF metadata extraction only, never question-text
 * parsing (confirmed scope, `services/admin/pdfMetadata.service.ts`'s
 * header comment). Read-only — nothing is written to MongoDB, so unlike
 * every other handler in this file, no audit log entry.
 */
export async function extractPdfMetadata(req: Request, res: Response): Promise<void> {
  const file = requireFile(req)
  const metadata = await pdfMetadataService.extractMetadata(file.buffer)
  sendSuccess(res, metadata)
}

/**
 * Parses + validates the uploaded file and returns a preview — never writes
 * anything to MongoDB. Stateless by design (see `routes/admin/questions.routes.ts`'s
 * header comment): nothing about this upload is retained server-side between
 * this call and a later `POST /import/confirm`.
 */
export async function previewImport(req: Request, res: Response): Promise<void> {
  const file = requireFile(req)
  const parsed = await questionImportService.parseImportFile(
    file.buffer,
    file.originalname,
  )
  sendSuccess(res, questionImportService.toPreviewResult(parsed))
}

/**
 * Re-parses the same freshly-uploaded file (never trusts a client-held,
 * previously-returned "resolved" payload) and inserts only the rows the
 * caller selected that are still `valid` after re-validation — the "no
 * silent import of invalid questions, partial import of the rest" contract.
 */
export async function confirmImportHandler(req: Request, res: Response): Promise<void> {
  const actor = requireActor(req)
  const file = requireFile(req)
  const { rowNumbers } = req.body as ImportConfirmBody

  const parsed = await questionImportService.parseImportFile(
    file.buffer,
    file.originalname,
  )
  const result = await questionImportService.confirmImport(actor, parsed, rowNumbers)
  sendSuccess(res, result)
}
