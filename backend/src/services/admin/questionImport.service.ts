import path from 'node:path'

import { parse as parseCsvSync } from 'csv-parse/sync'
import { stringify as stringifyCsvSync } from 'csv-stringify/sync'
import ExcelJS from 'exceljs'
import type { Types } from 'mongoose'

import { EXAM_CATEGORY_CODES, type ExamCategoryCode } from '../../constants/exam'
import {
  QUESTION_DIFFICULTIES,
  QUESTION_SOURCES,
  TNPSC_EXAM_STAGES,
  type QuestionDifficulty,
  type QuestionSource,
  type TnpscExamStage,
} from '../../constants/practice'
import { IMPORT_MAX_ROWS, IMPORT_TEMPLATE_COLUMNS } from '../../constants/questionImport'
import type { Role } from '../../constants/roles'
import type { IQuestion } from '../../models/Question.model'
import * as examRepository from '../../repositories/exam.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as subjectRepository from '../../repositories/subject.repository'
import * as subtopicRepository from '../../repositories/subtopic.repository'
import * as topicRepository from '../../repositories/topic.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import * as auditLogService from '../auditLog.service'

export type ImportActor = { id: string; role: Role }

async function resolveAuditActor(actor: ImportActor) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

// --- Row/file shapes -----------------------------------------------------

interface RawRow {
  rowNumber: number
  raw: Record<string, string>
}

export interface ImportRowIssue {
  field: string
  message: string
  suggestion?: string
}

interface ResolvedQuestionData extends Partial<IQuestion> {
  examIds: Types.ObjectId[]
  subjectId: Types.ObjectId
  topicId: Types.ObjectId
  subtopicId: Types.ObjectId
  questionText: { en: string; ta?: string }
}

export interface ImportRowPreview {
  questionTextEn: string
  questionTextTa?: string
  examCodes: string[]
  subjectName: string
  topicName: string
  subtopicName: string
  difficulty: string
  optionsCount: number
  correctOptionNumber: number
  isPreviousYear: boolean
}

export type ImportRowDuplicateOf =
  { type: 'file'; rowNumber: number } | { type: 'database'; questionId: string }

interface InternalImportRow {
  rowNumber: number
  raw: Record<string, string>
  status: 'valid' | 'invalid' | 'duplicate'
  errors: ImportRowIssue[]
  warnings: string[]
  preview?: ImportRowPreview
  resolved?: ResolvedQuestionData
  duplicateOf?: ImportRowDuplicateOf
  dedupeKey?: string
}

export interface ParsedImportFile {
  fileName: string
  totalRows: number
  rows: InternalImportRow[]
}

export interface ImportRowClientView {
  rowNumber: number
  raw: Record<string, string>
  status: 'valid' | 'invalid' | 'duplicate'
  errors: ImportRowIssue[]
  warnings: string[]
  preview?: ImportRowPreview
  duplicateOf?: ImportRowDuplicateOf
}

export interface ImportPreviewResult {
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  rows: ImportRowClientView[]
}

export interface ImportConfirmResult {
  insertedCount: number
  skippedCount: number
  failures: { rowNumber: number; message: string }[]
}

// --- File parsing ----------------------------------------------------------

function parseCsvBuffer(buffer: Buffer): RawRow[] {
  let records: Record<string, string>[]
  try {
    records = parseCsvSync(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[]
  } catch {
    throw ApiError.badRequest(
      'The CSV file could not be read. Please make sure it is a valid, comma-separated CSV file.',
    )
  }
  return records.map((raw, index) => ({ rowNumber: index + 2, raw }))
}

/** Reads only a cell's rendered text/computed result, never a raw formula
 * string — protects against formula-injection payloads being carried
 * through into stored content or a later re-exported file. */
function cellToText(cell: ExcelJS.Cell): string {
  if (cell.type === ExcelJS.ValueType.Formula) {
    const formulaValue = cell.value as ExcelJS.CellFormulaValue
    return formulaValue.result === undefined || formulaValue.result === null
      ? ''
      : String(formulaValue.result)
  }
  return (cell.text ?? '').toString()
}

async function parseXlsxBuffer(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook()
  try {
    // exceljs bundles its own `@types/node`-derived `Buffer` type, which TS
    // treats as nominally distinct from this project's — the underlying
    // bytes are identical, this is a type-level mismatch only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  } catch {
    throw ApiError.badRequest(
      'The XLSX file could not be read. Please make sure it is a valid .xlsx file.',
    )
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw ApiError.badRequest('The XLSX file has no worksheets.')

  const headers: string[] = []
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cellToText(cell).trim()
  })

  const rows: RawRow[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const raw: Record<string, string> = {}
    let hasContent = false
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber]
      if (!header) return
      const text = cellToText(cell)
      if (text.trim() !== '') hasContent = true
      raw[header] = text
    })
    if (hasContent) rows.push({ rowNumber, raw })
  })
  return rows
}

const HEADER_KEY_BY_NORMALIZED = new Map(
  IMPORT_TEMPLATE_COLUMNS.map((column) => [normalizeHeader(column.header), column.key]),
)

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Maps a row's literal spreadsheet headers onto the internal field keys
 * (case/spacing-insensitive) — columns the template doesn't recognize are
 * kept in `raw` for display but simply ignored for validation. */
function extractFields(raw: Record<string, string>): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_KEY_BY_NORMALIZED.get(normalizeHeader(header))
    if (key) fields[key] = (value ?? '').toString().trim()
  }
  return fields
}

// --- Field-level parsing helpers -----------------------------------------

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'n'])

function parseBooleanField(
  raw: string | undefined,
  defaultValue: boolean,
): { value: boolean; error?: string } {
  if (raw === undefined || raw.trim() === '') return { value: defaultValue }
  const normalized = raw.trim().toLowerCase()
  if (TRUE_VALUES.has(normalized)) return { value: true }
  if (FALSE_VALUES.has(normalized)) return { value: false }
  return {
    value: defaultValue,
    error: `"${raw}" is not a recognized true/false value — use true or false.`,
  }
}

function matchEnumValue<T extends string>(
  raw: string,
  allowed: readonly T[],
): { value?: T; corrected: boolean; suggestion?: T } {
  const trimmed = raw.trim()
  const exactCase = allowed.find((candidate) => candidate === trimmed)
  if (exactCase) return { value: exactCase, corrected: false }
  const lower = trimmed.toLowerCase()
  const caseInsensitive = allowed.find((candidate) => candidate.toLowerCase() === lower)
  if (caseInsensitive) return { value: caseInsensitive, corrected: true }
  const partial = allowed.find(
    (candidate) => lower.length > 0 && candidate.toLowerCase().startsWith(lower),
  )
  return { corrected: false, suggestion: partial }
}

function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

// --- Reference resolution (cached per file) -------------------------------

interface ResolutionCaches {
  examByCode: Map<string, Awaited<ReturnType<typeof examRepository.findByCode>>>
  subjectBySlug: Map<string, Awaited<ReturnType<typeof subjectRepository.findBySlug>>>
  topicBySlug: Map<string, Awaited<ReturnType<typeof topicRepository.findBySlug>>>
  subtopicBySlug: Map<string, Awaited<ReturnType<typeof subtopicRepository.findBySlug>>>
}

function createCaches(): ResolutionCaches {
  return {
    examByCode: new Map(),
    subjectBySlug: new Map(),
    topicBySlug: new Map(),
    subtopicBySlug: new Map(),
  }
}

async function resolveCached<V>(
  cache: Map<string, V | null>,
  key: string,
  fetcher: () => Promise<V | null>,
): Promise<V | null> {
  if (cache.has(key)) return cache.get(key) ?? null
  const value = await fetcher()
  cache.set(key, value)
  return value
}

// --- Per-row validation ----------------------------------------------------

async function processRow(
  row: RawRow,
  caches: ResolutionCaches,
): Promise<InternalImportRow> {
  const fields = extractFields(row.raw)
  const errors: ImportRowIssue[] = []
  const warnings: string[] = []

  const questionTextEn = fields.questionTextEn ?? ''
  if (!questionTextEn) {
    errors.push({ field: 'questionTextEn', message: 'questionTextEn is required.' })
  }
  const questionTextTa = fields.questionTextTa || undefined

  const options: { index: number; en: string; ta?: string }[] = []
  for (let index = 1; index <= 6; index += 1) {
    const en = fields[`option${index}En`]
    if (en) options.push({ index, en, ta: fields[`option${index}Ta`] || undefined })
  }
  if (options.length < 2) {
    errors.push({
      field: 'options',
      message: 'At least option1En and option2En are required.',
    })
  }

  let correctOptionNumber: number | undefined
  const correctOptionRaw = fields.correctOption ?? ''
  if (!correctOptionRaw) {
    errors.push({ field: 'correctOption', message: 'correctOption is required.' })
  } else {
    const parsed = Number(correctOptionRaw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
      errors.push({
        field: 'correctOption',
        message: `correctOption must be a whole number from 1 to 6 (got "${correctOptionRaw}").`,
      })
    } else if (!options.some((option) => option.index === parsed)) {
      errors.push({
        field: 'correctOption',
        message: `correctOption is ${parsed}, but option${parsed}En is empty.`,
        suggestion:
          options.length > 0 ? `Use a number between 1 and ${options.length}` : undefined,
      })
    } else {
      correctOptionNumber = parsed
    }
  }

  let difficulty: QuestionDifficulty | undefined
  if (!fields.difficulty) {
    errors.push({
      field: 'difficulty',
      message: 'difficulty is required (easy, medium, or hard).',
    })
  } else {
    const match = matchEnumValue(fields.difficulty, QUESTION_DIFFICULTIES)
    if (match.value) {
      difficulty = match.value
      if (match.corrected)
        warnings.push(
          `difficulty "${fields.difficulty}" was matched to "${match.value}".`,
        )
    } else {
      errors.push({
        field: 'difficulty',
        message: `"${fields.difficulty}" is not a recognized difficulty.`,
        suggestion: match.suggestion ?? 'easy, medium, or hard',
      })
    }
  }

  let source: QuestionSource = 'curated'
  if (fields.source) {
    const match = matchEnumValue(fields.source, QUESTION_SOURCES)
    if (match.value) {
      source = match.value
      if (match.corrected)
        warnings.push(`source "${fields.source}" was matched to "${match.value}".`)
    } else {
      errors.push({
        field: 'source',
        message: `"${fields.source}" is not a recognized source.`,
        suggestion: match.suggestion ?? 'pyq, ai_generated, or curated',
      })
    }
  }

  const isPreviousYearResult = parseBooleanField(fields.isPreviousYear, false)
  if (isPreviousYearResult.error) {
    errors.push({
      field: 'isPreviousYear',
      message: isPreviousYearResult.error,
      suggestion: 'true or false',
    })
  }
  const isPreviousYear = isPreviousYearResult.value

  let pyqYear: number | undefined
  if (isPreviousYear) {
    const raw = fields.pyqYear ?? ''
    const currentYear = new Date().getFullYear()
    const parsed = Number(raw)
    if (!raw) {
      errors.push({
        field: 'pyqYear',
        message: 'pyqYear is required when isPreviousYear is true.',
      })
    } else if (!Number.isInteger(parsed) || parsed < 1990 || parsed > currentYear + 1) {
      errors.push({
        field: 'pyqYear',
        message: `pyqYear must be a year between 1990 and ${currentYear + 1} (got "${raw}").`,
      })
    } else {
      pyqYear = parsed
    }
  } else if (fields.pyqYear) {
    warnings.push('pyqYear was ignored because isPreviousYear is false.')
  }

  let tnpscExamType: TnpscExamStage | undefined
  if (fields.tnpscExamType) {
    const match = matchEnumValue(fields.tnpscExamType, TNPSC_EXAM_STAGES)
    if (match.value) {
      tnpscExamType = match.value
      if (match.corrected) {
        warnings.push(
          `tnpscExamType "${fields.tnpscExamType}" was matched to "${match.value}".`,
        )
      }
    } else {
      errors.push({
        field: 'tnpscExamType',
        message: `"${fields.tnpscExamType}" is not a recognized exam stage.`,
        suggestion: match.suggestion ?? 'prelims, mains, or interview',
      })
    }
  }

  const tags = (fields.tags ?? '')
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  const isActiveResult = parseBooleanField(fields.isActive, true)
  if (isActiveResult.error)
    errors.push({
      field: 'isActive',
      message: isActiveResult.error,
      suggestion: 'true or false',
    })
  const isPremiumResult = parseBooleanField(fields.isPremium, false)
  if (isPremiumResult.error)
    errors.push({
      field: 'isPremium',
      message: isPremiumResult.error,
      suggestion: 'true or false',
    })
  const aiEligibleResult = parseBooleanField(fields.aiExplanationEligible, true)
  if (aiEligibleResult.error) {
    errors.push({
      field: 'aiExplanationEligible',
      message: aiEligibleResult.error,
      suggestion: 'true or false',
    })
  }

  let questionImageUrl: string | undefined
  if (fields.questionImageUrl) {
    if (/^https?:\/\/\S+$/i.test(fields.questionImageUrl)) {
      questionImageUrl = fields.questionImageUrl
    } else {
      errors.push({
        field: 'questionImageUrl',
        message: `"${fields.questionImageUrl}" is not a valid http(s) URL.`,
      })
    }
  }

  // --- Reference fields ---
  const examCodeTokens = (fields.examCodes ?? '')
    .split(/[|,]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  if (examCodeTokens.length === 0) {
    errors.push({
      field: 'examCodes',
      message: 'examCodes is required (at least one exam code).',
    })
  }

  const resolvedExamIds: Types.ObjectId[] = []
  for (const token of examCodeTokens) {
    const match = matchEnumValue(token, EXAM_CATEGORY_CODES)
    if (!match.value) {
      errors.push({
        field: 'examCodes',
        message: `"${token}" is not a recognized exam code.`,
        suggestion: match.suggestion ?? EXAM_CATEGORY_CODES.join(', '),
      })
      continue
    }
    if (match.corrected)
      warnings.push(`examCodes "${token}" was matched to "${match.value}".`)
    const exam = await resolveCached(caches.examByCode, match.value, () =>
      examRepository.findByCode(match.value as ExamCategoryCode),
    )
    if (!exam) {
      errors.push({
        field: 'examCodes',
        message: `"${match.value}" does not match a real exam.`,
      })
      continue
    }
    resolvedExamIds.push(exam._id)
  }

  const subjectSlug = fields.subjectSlug
  const topicSlug = fields.topicSlug
  const subtopicSlug = fields.subtopicSlug
  if (!subjectSlug)
    errors.push({ field: 'subjectSlug', message: 'subjectSlug is required.' })
  if (!topicSlug) errors.push({ field: 'topicSlug', message: 'topicSlug is required.' })
  if (!subtopicSlug)
    errors.push({ field: 'subtopicSlug', message: 'subtopicSlug is required.' })

  const subject = subjectSlug
    ? await resolveCached(caches.subjectBySlug, subjectSlug, () =>
        subjectRepository.findBySlug(subjectSlug),
      )
    : null
  if (subjectSlug && !subject) {
    errors.push({
      field: 'subjectSlug',
      message: `"${subjectSlug}" does not match any active subject.`,
    })
  }

  const topic = topicSlug
    ? await resolveCached(caches.topicBySlug, topicSlug, () =>
        topicRepository.findBySlug(topicSlug),
      )
    : null
  if (topicSlug && !topic) {
    errors.push({
      field: 'topicSlug',
      message: `"${topicSlug}" does not match any active topic.`,
    })
  }

  const subtopic = subtopicSlug
    ? await resolveCached(caches.subtopicBySlug, subtopicSlug, () =>
        subtopicRepository.findBySlug(subtopicSlug),
      )
    : null
  if (subtopicSlug && !subtopic) {
    errors.push({
      field: 'subtopicSlug',
      message: `"${subtopicSlug}" does not match any active subtopic.`,
    })
  }

  if (subject && topic && topic.subjectId.toString() !== subject.id) {
    errors.push({
      field: 'topicSlug',
      message: `"${topicSlug}" does not belong to subject "${subjectSlug}".`,
    })
  }
  if (topic && subtopic && subtopic.topicId.toString() !== topic.id) {
    errors.push({
      field: 'subtopicSlug',
      message: `"${subtopicSlug}" does not belong to topic "${topicSlug}".`,
    })
  }

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, raw: row.raw, status: 'invalid', errors, warnings }
  }

  // Every required field parsed and every reference resolved — safe to
  // assert non-null below (TypeScript can't see through the error-array
  // checks above, but the errors.length===0 guard already proved it).
  const resolved: ResolvedQuestionData = {
    examIds: resolvedExamIds,
    subjectId: subject!._id,
    topicId: topic!._id,
    subtopicId: subtopic!._id,
    questionText: { en: questionTextEn, ta: questionTextTa },
    questionImageUrl,
    options: options.map((option) => ({
      optionId: `opt${option.index}`,
      text: { en: option.en, ta: option.ta },
      isCorrect: option.index === correctOptionNumber,
    })),
    difficulty: difficulty!,
    questionType: 'mcq_single',
    explanation:
      fields.explanationEn || fields.explanationTa
        ? { en: fields.explanationEn || undefined, ta: fields.explanationTa || undefined }
        : undefined,
    source,
    isPreviousYear,
    pyqYear,
    tnpscExamType,
    tags,
    isActive: isActiveResult.value,
    isPremium: isPremiumResult.value,
    aiExplanationEligible: aiEligibleResult.value,
  }

  const preview: ImportRowPreview = {
    questionTextEn,
    questionTextTa,
    examCodes: examCodeTokens,
    subjectName: subject!.name.en ?? subject!.slug,
    topicName: topic!.name.en ?? topic!.slug,
    subtopicName: subtopic!.name.en ?? subtopic!.slug,
    difficulty: difficulty!,
    optionsCount: options.length,
    correctOptionNumber: correctOptionNumber!,
    isPreviousYear,
  }

  return {
    rowNumber: row.rowNumber,
    raw: row.raw,
    status: 'valid',
    errors: [],
    warnings,
    preview,
    resolved,
    dedupeKey: `${subtopic!.id}::${normalizeQuestionText(questionTextEn)}`,
  }
}

/** Two dedupe passes over the provisionally-valid rows: first against each
 * other (a spreadsheet with the same question pasted twice), then against
 * what's already live in MongoDB for the same subtopic — Step 53's explicit
 * "duplicate detection" requirement. A duplicate is excluded from import by
 * default (never silently merged, never silently re-imported). */
async function applyDuplicateDetection(rows: InternalImportRow[]): Promise<void> {
  const seenInFile = new Map<string, number>()
  for (const row of rows) {
    if (row.status !== 'valid' || !row.dedupeKey) continue
    const firstRowNumber = seenInFile.get(row.dedupeKey)
    if (firstRowNumber !== undefined) {
      row.status = 'duplicate'
      row.duplicateOf = { type: 'file', rowNumber: firstRowNumber }
      row.warnings.push(
        `Duplicate of row ${firstRowNumber} in this file (same subtopic + question text).`,
      )
    } else {
      seenInFile.set(row.dedupeKey, row.rowNumber)
    }
  }

  const dbTextCache = new Map<string, { id: string; textEn: string }[]>()
  for (const row of rows) {
    if (row.status !== 'valid' || !row.resolved) continue
    const subtopicId = row.resolved.subtopicId.toString()
    let existing = dbTextCache.get(subtopicId)
    if (!existing) {
      existing = await questionRepository.findQuestionTextsBySubtopic(subtopicId)
      dbTextCache.set(subtopicId, existing)
    }
    const normalizedNew = normalizeQuestionText(row.resolved.questionText.en)
    const match = existing.find(
      (entry) => normalizeQuestionText(entry.textEn) === normalizedNew,
    )
    if (match) {
      row.status = 'duplicate'
      row.duplicateOf = { type: 'database', questionId: match.id }
      row.warnings.push(
        `Duplicate of an existing question already in the database (id ${match.id}).`,
      )
    }
  }
}

// --- Public API --------------------------------------------------------

export async function parseImportFile(
  buffer: Buffer,
  originalName: string,
): Promise<ParsedImportFile> {
  const extension = path.extname(originalName).toLowerCase()
  const rawRows =
    extension === '.xlsx' ? await parseXlsxBuffer(buffer) : parseCsvBuffer(buffer)

  if (rawRows.length === 0) {
    throw ApiError.badRequest('The file has no data rows.')
  }
  if (rawRows.length > IMPORT_MAX_ROWS) {
    throw ApiError.badRequest(
      `The file has ${rawRows.length} rows, which exceeds the ${IMPORT_MAX_ROWS}-row limit per import. Split it into smaller files.`,
    )
  }

  const caches = createCaches()
  const rows: InternalImportRow[] = []
  for (const rawRow of rawRows) {
    rows.push(await processRow(rawRow, caches))
  }
  await applyDuplicateDetection(rows)

  return { fileName: originalName, totalRows: rows.length, rows }
}

export function toPreviewResult(parsed: ParsedImportFile): ImportPreviewResult {
  const rows: ImportRowClientView[] = parsed.rows.map((row) => ({
    rowNumber: row.rowNumber,
    raw: row.raw,
    status: row.status,
    errors: row.errors,
    warnings: row.warnings,
    preview: row.preview,
    duplicateOf: row.duplicateOf,
  }))
  return {
    fileName: parsed.fileName,
    totalRows: parsed.totalRows,
    validCount: rows.filter((row) => row.status === 'valid').length,
    invalidCount: rows.filter((row) => row.status === 'invalid').length,
    duplicateCount: rows.filter((row) => row.status === 'duplicate').length,
    rows,
  }
}

/**
 * Commits only the rows the caller explicitly selected AND that are still
 * `valid` after a fresh re-parse of the same file (the file is always
 * re-uploaded for confirm, never trusted from a client-held JSON blob — see
 * `routes/admin/questions.routes.ts`'s header comment) — this is the "no
 * silent import of invalid rows, no reliance on client-supplied resolved
 * data" guarantee.
 */
export async function confirmImport(
  actor: ImportActor,
  parsed: ParsedImportFile,
  rowNumbers: number[],
): Promise<ImportConfirmResult> {
  const requested = new Set(rowNumbers)
  const toInsert = parsed.rows.filter(
    (row) => requested.has(row.rowNumber) && row.status === 'valid' && row.resolved,
  )
  const docs = toInsert.map((row) => row.resolved as Partial<IQuestion>)

  const { insertedCount, failures } = await questionRepository.bulkInsert(docs)

  const failureByIndex = new Map(
    failures.map((failure) => [failure.index, failure.message]),
  )
  const rowFailures = toInsert
    .map((row, index) => ({
      rowNumber: row.rowNumber,
      message: failureByIndex.get(index),
    }))
    .filter((failure): failure is { rowNumber: number; message: string } =>
      Boolean(failure.message),
    )

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'question.bulkImport',
    'Question',
    'batch',
    {
      fileName: parsed.fileName,
      requestedRows: rowNumbers.length,
      insertedCount,
      failedCount: rowFailures.length,
    },
  )

  return {
    insertedCount,
    skippedCount: rowNumbers.length - toInsert.length,
    failures: rowFailures,
  }
}

// --- Template generation ---------------------------------------------------

export function generateTemplateCsv(): string {
  const header = IMPORT_TEMPLATE_COLUMNS.map((column) => column.header)
  const exampleRow = IMPORT_TEMPLATE_COLUMNS.map((column) => column.example)
  return stringifyCsvSync([header, exampleRow])
}

export async function generateTemplateXlsx(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  const sheet = workbook.addWorksheet('Questions')
  sheet.addRow(IMPORT_TEMPLATE_COLUMNS.map((column) => column.header))
  sheet.addRow(IMPORT_TEMPLATE_COLUMNS.map((column) => column.example))
  sheet.getRow(1).font = { bold: true }
  sheet.columns = IMPORT_TEMPLATE_COLUMNS.map(() => ({ width: 24 }))

  const instructions = workbook.addWorksheet('Instructions')
  instructions.addRow(['Column', 'Required', 'Description'])
  instructions.getRow(1).font = { bold: true }
  for (const column of IMPORT_TEMPLATE_COLUMNS) {
    instructions.addRow([
      column.header,
      column.required ? 'Required' : 'Optional',
      column.description,
    ])
  }
  instructions.columns = [{ width: 22 }, { width: 12 }, { width: 90 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
