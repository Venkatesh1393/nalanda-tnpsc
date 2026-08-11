import mammoth from 'mammoth'

import { ApiError } from '../../utils/ApiError'

/**
 * Sprint 4 Step 71.5 — Word (.docx) Bulk Import. A structured, documented
 * line-based convention (confirmed with the user: a freeform Word document
 * has no reliable machine-parseable structure, so — same spirit as the
 * existing CSV/XLSX template — admins fill in a specific downloadable
 * template rather than any arbitrary document being accepted).
 *
 * One question per block, blocks separated by a line containing only `---`.
 * Field lines are `KEY: value`; options are `A) text` (English) /
 * `ATA) text` (Tamil), letters A-F mapping to option 1-6 (matching
 * `correctOption`'s existing 1-6 numbering) — `ANSWER: B` selects the
 * correct option by the same letter.
 *
 * ```
 * EXAM: group-1|group-2
 * SUBJECT: history
 * TOPIC: modern-india
 * SUBTOPIC: indian-independence-movement
 * Q: Who was the first Prime Minister of India?
 * QTA: இந்தியாவின் முதல் பிரதமர் யார்?
 * A) Jawaharlal Nehru
 * ATA) ஜவகர்லால் நேரு
 * B) Mahatma Gandhi
 * ANSWER: A
 * DIFFICULTY: medium
 * EXPLANATION: Jawaharlal Nehru served as the first Prime Minister...
 * SOURCE: curated
 * PYQ: false
 * TAGS: modern-history|freedom-struggle
 * ---
 * ```
 *
 * Produces the *exact same* `{rowNumber, raw}` shape the CSV/XLSX parsers
 * already produce (`raw`'s keys are the same internal field keys
 * `constants/questionImport.ts`'s `IMPORT_TEMPLATE_COLUMNS` define) — every
 * downstream step (`processRow`'s validation/reference-resolution,
 * duplicate detection, preview, confirm) is completely format-agnostic and
 * reused as-is, unchanged, for a Word import.
 */

export interface WordRawRow {
  rowNumber: number
  raw: Record<string, string>
}

const FIELD_LINE = /^([A-Z]+)\s*:\s*(.*)$/
const OPTION_LINE = /^([A-Fa-f])(TA)?\)\s*(.*)$/

const KEY_MAP: Record<string, string> = {
  EXAM: 'examCodes',
  SUBJECT: 'subjectSlug',
  TOPIC: 'topicSlug',
  SUBTOPIC: 'subtopicSlug',
  Q: 'questionTextEn',
  QTA: 'questionTextTa',
  ANSWER: '__answer', // resolved to correctOption after option letters are known
  DIFFICULTY: 'difficulty',
  EXPLANATION: 'explanationEn',
  EXPLANATIONTA: 'explanationTa',
  SOURCE: 'source',
  PYQ: 'isPreviousYear',
  PYQYEAR: 'pyqYear',
  EXAMSTAGE: 'tnpscExamType',
  TAGS: 'tags',
  ACTIVE: 'isActive',
  PREMIUM: 'isPremium',
  AIEXPLANATION: 'aiExplanationEligible',
  IMAGE: 'questionImageUrl',
}

const LETTER_TO_NUMBER: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }

function parseBlock(lines: string[], rowNumber: number): WordRawRow {
  const raw: Record<string, string> = {}
  let answerLetter: string | undefined

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const optionMatch = OPTION_LINE.exec(line)
    if (optionMatch) {
      const letter = optionMatch[1]
      const taSuffix = optionMatch[2]
      const text = optionMatch[3] ?? ''
      const optionNumber = letter ? LETTER_TO_NUMBER[letter.toLowerCase()] : undefined
      if (optionNumber) {
        const key = taSuffix ? `option${optionNumber}Ta` : `option${optionNumber}En`
        raw[key] = text
      }
      continue
    }

    const fieldMatch = FIELD_LINE.exec(line)
    if (fieldMatch) {
      const keyRaw = fieldMatch[1]
      const value = fieldMatch[2] ?? ''
      const key = keyRaw ? KEY_MAP[keyRaw] : undefined
      if (key === '__answer') {
        answerLetter = value.trim()
      } else if (key) {
        raw[key] = value
      }
    }
  }

  if (answerLetter) {
    const optionNumber = LETTER_TO_NUMBER[answerLetter.toLowerCase()]
    if (optionNumber) raw.correctOption = String(optionNumber)
  }

  return { rowNumber, raw }
}

export async function parseWordBuffer(buffer: Buffer): Promise<WordRawRow[]> {
  let text: string
  try {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } catch {
    throw ApiError.badRequest(
      'The Word file could not be read. Please make sure it is a valid .docx file.',
    )
  }

  const lines = text.split(/\r?\n/)
  const blocks: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.trim() === '---') {
      if (current.some((l) => l.trim() !== '')) blocks.push(current)
      current = []
    } else {
      current.push(line)
    }
  }
  if (current.some((l) => l.trim() !== '')) blocks.push(current)

  return blocks.map((block, index) => parseBlock(block, index + 1))
}
