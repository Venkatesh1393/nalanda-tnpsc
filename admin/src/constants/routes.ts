/** Admin Panel route path constants — matches Step 52's requested route
 * list. Never hand-type a path string at the call site. */
export const ROUTES = {
  login: '/login',
  accessDenied: '/access-denied',
  root: '/admin',
  dashboard: '/admin/dashboard',
  users: '/admin/users',
  userDetail: (userId: string) => `/admin/users/${userId}`,
  /** Sprint 4 Step 54 — one hub page (tab-switched) for the whole
   * Exam → Subject → Topic → Subtopic → Lesson hierarchy + Study Materials.
   * The old standalone `/admin/exams` placeholder route was folded into
   * this page's "Exams" tab rather than kept as a separate page. */
  content: '/admin/content',
  questions: '/admin/questions',
  questionNew: '/admin/questions/new',
  questionEdit: (questionId: string) => `/admin/questions/${questionId}/edit`,
  questionImport: '/admin/questions/import',
  /** Sprint 4 Step 65 — Admin AI Question Generator. Generation and review
   * are two separate pages (generate → land on the review queue filtered
   * to the new batch) rather than one combined screen, matching the Bulk
   * Import wizard's own "generate a batch, then separately review it"
   * shape. */
  aiQuestionGenerate: '/admin/ai-questions/generate',
  aiQuestionReview: '/admin/ai-questions/review',
  currentAffairs: '/admin/current-affairs',
  currentAffairNew: '/admin/current-affairs/new',
  currentAffairEdit: (articleId: string) => `/admin/current-affairs/${articleId}/edit`,
  liveExams: '/admin/live-exams',
  liveExamNew: '/admin/live-exams/new',
  liveExamEdit: (liveExamId: string) => `/admin/live-exams/${liveExamId}/edit`,
  questionPapers: '/admin/question-papers',
  questionPaperNew: '/admin/question-papers/new',
  questionPaperEdit: (paperId: string) => `/admin/question-papers/${paperId}/edit`,
  subscriptions: '/admin/subscriptions',
  analytics: '/admin/analytics',
  settings: '/admin/settings',
} as const
