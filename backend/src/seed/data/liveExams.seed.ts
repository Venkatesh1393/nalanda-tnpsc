import type { BilingualText } from '../../models/shared/bilingualText'

/**
 * Representative DEVELOPMENT Live Exams (Step 48) — small and deliberately
 * scheduled **relative to seed-run time** (`offsetMinutes` from `now`), not
 * hardcoded absolute dates, so "Upcoming"/"Live Now"/"Completed" are always
 * true regardless of when this seed is actually run. Question sets are
 * assembled at seed time from the existing syllabus questions (Step 46),
 * matched by their `tags` field — no duplicate question content is
 * authored here, per this step's "don't duplicate models/content" spirit.
 */
export interface LiveExamSeed {
  title: BilingualText
  description: BilingualText
  examCode: string
  subjectSlugs: string[]
  /** Question tag(s) to pull this exam's `questionIds` from (Step 46's
   * syllabus questions are already tagged by subject/topic). */
  questionTags: string[]
  questionCount: number
  /** Minutes from seed-run time the exam window opens/closes. */
  startOffsetMinutes: number
  endOffsetMinutes: number
  durationMinutes: number
  marksPerQuestion: number
  negativeMarking: { enabled: boolean; marksPerWrongAnswer: number }
  instructions: { en: string[]; ta: string[] }
  resultPublication: { mode: 'immediate' | 'scheduled'; publishAfterEndMinutes?: number }
  status: 'draft' | 'scheduled' | 'cancelled'
}

const STANDARD_INSTRUCTIONS = {
  en: [
    'This is a timed, cohort-wide Live Exam — once started, your personal countdown cannot be paused.',
    'Each question has exactly one correct answer. There is no partial credit.',
    'Use "Mark for Review" to flag a question and return to it later before submitting.',
    'Your exam auto-submits the moment your time (or the exam window) expires — save your answers as you go.',
    'Correct answers and your result are only shown after the exam window closes and results are published.',
  ],
  ta: [],
}

export const liveExamsSeedData: LiveExamSeed[] = [
  {
    title: { en: 'Weekly General Science Mock — Group 4', ta: '' },
    description: {
      en: 'A 10-question timed mock covering Physics fundamentals, in the exact format of the TNPSC Group 4 prelims.',
      ta: '',
    },
    examCode: 'group-4',
    subjectSlugs: ['general-science'],
    questionTags: ['physics'],
    questionCount: 10,
    startOffsetMinutes: 60 * 24 * 2, // 2 days from now
    endOffsetMinutes: 60 * 24 * 2 + 180, // 3-hour join/completion window
    durationMinutes: 60,
    marksPerQuestion: 1,
    negativeMarking: { enabled: true, marksPerWrongAnswer: 0.25 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'immediate' },
    status: 'scheduled',
  },
  {
    title: { en: 'Weekly Aptitude & Reasoning Booster — Group 2', ta: '' },
    description: {
      en: 'A live, cohort-wide Aptitude & Reasoning mock — sharpen your numerical ability and logical reasoning under real exam time pressure.',
      ta: '',
    },
    examCode: 'group-2',
    subjectSlugs: ['aptitude-and-mental-ability'],
    questionTags: ['aptitude', 'reasoning'],
    questionCount: 10,
    // Currently live at seed time: started 30 minutes ago, closes in 90.
    startOffsetMinutes: -30,
    endOffsetMinutes: 90,
    durationMinutes: 45,
    marksPerQuestion: 1,
    negativeMarking: { enabled: true, marksPerWrongAnswer: 0.25 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'immediate' },
    status: 'scheduled',
  },
  {
    title: { en: 'General Studies Mixed Mock — Group 4', ta: '' },
    description: {
      en: 'A completed cohort mock spanning Biology, Tamil Grammar, and Indian Polity — results are published immediately after close.',
      ta: '',
    },
    examCode: 'group-4',
    subjectSlugs: ['general-science', 'tamil', 'indian-polity'],
    questionTags: ['biology', 'tamil', 'polity'],
    questionCount: 9,
    startOffsetMinutes: -60 * 24 * 2, // started 2 days ago
    endOffsetMinutes: -60 * 24 * 2 + 120, // 2-hour window, long closed
    durationMinutes: 40,
    marksPerQuestion: 1,
    negativeMarking: { enabled: false, marksPerWrongAnswer: 0 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'immediate' },
    status: 'scheduled',
  },
  {
    title: { en: 'Full Length Mock #12 — VAO (Cancelled)', ta: '' },
    description: {
      en: 'This scheduled mock was cancelled by the content team — kept visible under Completed for transparency, per the platform\'s "never silently disappear a scheduled event" rule.',
      ta: '',
    },
    examCode: 'vao',
    subjectSlugs: ['general-science'],
    questionTags: ['physics'],
    questionCount: 10,
    startOffsetMinutes: 60 * 24, // was scheduled for tomorrow
    endOffsetMinutes: 60 * 24 + 120,
    durationMinutes: 60,
    marksPerQuestion: 1,
    negativeMarking: { enabled: true, marksPerWrongAnswer: 0.25 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'immediate' },
    status: 'cancelled',
  },
  {
    title: { en: 'Sunday National Mock — Group 1', ta: '' },
    description: {
      en: 'A full-length Reasoning & Aptitude mock for Group 1 aspirants — results are published a day after the exam window closes, all at once, for a fair cohort-wide comparison.',
      ta: '',
    },
    examCode: 'group-1',
    subjectSlugs: ['aptitude-and-mental-ability'],
    questionTags: ['reasoning', 'aptitude'],
    questionCount: 10,
    startOffsetMinutes: 60 * 24 * 5, // 5 days out
    endOffsetMinutes: 60 * 24 * 5 + 150,
    durationMinutes: 90,
    marksPerQuestion: 2,
    negativeMarking: { enabled: true, marksPerWrongAnswer: 0.5 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'scheduled', publishAfterEndMinutes: 60 * 24 },
    status: 'scheduled',
  },
  {
    title: { en: 'Draft — Unpublished Trial Exam', ta: '' },
    description: { en: 'Content-team draft — never shown to students.', ta: '' },
    examCode: 'group-4',
    subjectSlugs: ['general-science'],
    questionTags: ['physics'],
    questionCount: 5,
    startOffsetMinutes: 60 * 24 * 10,
    endOffsetMinutes: 60 * 24 * 10 + 60,
    durationMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: { enabled: false, marksPerWrongAnswer: 0 },
    instructions: STANDARD_INSTRUCTIONS,
    resultPublication: { mode: 'immediate' },
    status: 'draft',
  },
]
