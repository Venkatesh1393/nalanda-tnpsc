/**
 * Bulk Question Import (Sprint 4 Step 53) — file limits and the canonical
 * column layout for both the downloadable template and the parser. Kept as
 * one source of truth so the template generator and the row parser can
 * never drift apart on a column name.
 */
export const IMPORT_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
export const IMPORT_MAX_ROWS = 2000

export const IMPORT_ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
export const IMPORT_ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx'])

export interface ImportColumnDef {
  /** Internal field key the parser looks the column up by (case-insensitive
   * header match, whitespace-trimmed). */
  key: string
  header: string
  required: boolean
  description: string
  example: string
}

/** Column order here is the exact order used when generating the
 * downloadable template — deliberately groups required fields first so an
 * admin filling the sheet by hand sees what's mandatory immediately. */
export const IMPORT_TEMPLATE_COLUMNS: ImportColumnDef[] = [
  {
    key: 'examCodes',
    header: 'examCodes',
    required: true,
    description:
      'Pipe-separated exam category codes this question applies to (group-1, group-2, group-2a, group-4, vao, police, forest, trb).',
    example: 'group-1|group-2',
  },
  {
    key: 'subjectSlug',
    header: 'subjectSlug',
    required: true,
    description: "The subject's slug (see Admin > Content or GET /subjects).",
    example: 'history',
  },
  {
    key: 'topicSlug',
    header: 'topicSlug',
    required: true,
    description: "The topic's slug, must belong to subjectSlug.",
    example: 'modern-india',
  },
  {
    key: 'subtopicSlug',
    header: 'subtopicSlug',
    required: true,
    description: "The subtopic's slug, must belong to topicSlug.",
    example: 'indian-independence-movement',
  },
  {
    key: 'questionTextEn',
    header: 'questionTextEn',
    required: true,
    description: 'The question text in English.',
    example: 'Who was the first Prime Minister of India?',
  },
  {
    key: 'questionTextTa',
    header: 'questionTextTa',
    required: false,
    description: 'The question text in Tamil (optional — can be added later).',
    example: 'இந்தியாவின் முதல் பிரதமர் யார்?',
  },
  {
    key: 'option1En',
    header: 'option1En',
    required: true,
    description: 'Option 1 text (English).',
    example: 'Jawaharlal Nehru',
  },
  {
    key: 'option1Ta',
    header: 'option1Ta',
    required: false,
    description: 'Option 1 text (Tamil).',
    example: 'ஜவகர்லால் நேரு',
  },
  {
    key: 'option2En',
    header: 'option2En',
    required: true,
    description: 'Option 2 text (English).',
    example: 'Mahatma Gandhi',
  },
  {
    key: 'option2Ta',
    header: 'option2Ta',
    required: false,
    description: 'Option 2 text (Tamil).',
    example: 'மகாத்மா காந்தி',
  },
  {
    key: 'option3En',
    header: 'option3En',
    required: false,
    description: 'Option 3 text (English).',
    example: 'Sardar Patel',
  },
  {
    key: 'option3Ta',
    header: 'option3Ta',
    required: false,
    description: 'Option 3 text (Tamil).',
    example: 'சர்தார் படேல்',
  },
  {
    key: 'option4En',
    header: 'option4En',
    required: false,
    description: 'Option 4 text (English).',
    example: 'Rajendra Prasad',
  },
  {
    key: 'option4Ta',
    header: 'option4Ta',
    required: false,
    description: 'Option 4 text (Tamil).',
    example: 'ராஜேந்திர பிரசாத்',
  },
  {
    key: 'option5En',
    header: 'option5En',
    required: false,
    description: 'Option 5 text (English, optional).',
    example: '',
  },
  {
    key: 'option5Ta',
    header: 'option5Ta',
    required: false,
    description: 'Option 5 text (Tamil, optional).',
    example: '',
  },
  {
    key: 'option6En',
    header: 'option6En',
    required: false,
    description: 'Option 6 text (English, optional).',
    example: '',
  },
  {
    key: 'option6Ta',
    header: 'option6Ta',
    required: false,
    description: 'Option 6 text (Tamil, optional).',
    example: '',
  },
  {
    key: 'correctOption',
    header: 'correctOption',
    required: true,
    description:
      'Number (1-6) of the correct option, matching an option column that is filled in.',
    example: '1',
  },
  {
    key: 'difficulty',
    header: 'difficulty',
    required: true,
    description: 'easy, medium, or hard.',
    example: 'medium',
  },
  {
    key: 'explanationEn',
    header: 'explanationEn',
    required: false,
    description: 'Standard explanation shown after answering (English).',
    example:
      'Jawaharlal Nehru served as the first Prime Minister of independent India from 1947.',
  },
  {
    key: 'explanationTa',
    header: 'explanationTa',
    required: false,
    description: 'Standard explanation (Tamil).',
    example: '',
  },
  {
    key: 'source',
    header: 'source',
    required: false,
    description: 'pyq, ai_generated, or curated. Defaults to curated.',
    example: 'curated',
  },
  {
    key: 'isPreviousYear',
    header: 'isPreviousYear',
    required: false,
    description: 'true/false. Defaults to false.',
    example: 'false',
  },
  {
    key: 'pyqYear',
    header: 'pyqYear',
    required: false,
    description: 'Required when isPreviousYear is true (e.g. 2022).',
    example: '',
  },
  {
    key: 'tnpscExamType',
    header: 'tnpscExamType',
    required: false,
    description: 'prelims, mains, or interview — the stage this PYQ was asked in.',
    example: '',
  },
  {
    key: 'tags',
    header: 'tags',
    required: false,
    description: 'Pipe-separated free-form tags.',
    example: 'modern-history|freedom-struggle',
  },
  {
    key: 'isActive',
    header: 'isActive',
    required: false,
    description:
      'true/false. Defaults to true. Inactive questions are never served to Smart Practice.',
    example: 'true',
  },
  {
    key: 'isPremium',
    header: 'isPremium',
    required: false,
    description: 'true/false. Defaults to false.',
    example: 'false',
  },
  {
    key: 'aiExplanationEligible',
    header: 'aiExplanationEligible',
    required: false,
    description: 'true/false. Defaults to true.',
    example: 'true',
  },
  {
    key: 'questionImageUrl',
    header: 'questionImageUrl',
    required: false,
    description:
      'An already-hosted image URL (optional). Use the question editor to upload a new image instead.',
    example: '',
  },
]
