/**
 * Every endpoint path from docs/API.md, centralized here so a path string
 * never gets typed twice — a typo in one service file's URL and a typo in
 * this file are equally possible, but only this file's typo breaks every
 * caller loudly (via a 404 in dev) instead of one caller silently.
 *
 * Paths are relative to VITE_API_BASE_URL (already versioned, e.g. `/api/v1`)
 * — do not repeat the `/api/v1` prefix here.
 */
export const endpoints = {
  auth: {
    register: '/auth/register',
    otpVerify: '/auth/otp/verify',
    otpResend: '/auth/otp/resend',
    google: '/auth/google',
    /** Firebase Email/Password session establishment — same shape/response
     * as `google` above (`{firebaseIdToken, rememberMe}` in, `{accessToken,
     * user, isNewUser}` out), added alongside the still-mocked Email OTP
     * path per this session's Firebase Authentication step. */
    email: '/auth/email',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/dashboard/summary',
    todayTasks: '/dashboard/today-tasks',
    completeTask: (taskId: string) => `/dashboard/tasks/${taskId}/complete`,
    /** Step 44's real, combined `GET /dashboard` — one response covering
     * every section `services/dashboardService.ts`'s functions read from,
     * replacing the illustrative per-section paths above (still kept, in
     * case a future session splits the combined endpoint back out). */
    root: '/dashboard',
  },
  /** Step 45's real Learning module — `subjectId`/`topicId`/`subtopicId`
   * below are always the real Mongo document's `slug` (never a raw
   * ObjectId), so every existing `ROUTES.learn*` URL keeps working
   * unchanged (`backend/src/services/learn.service.ts`'s header comment
   * explains why). */
  exams: {
    list: '/exams',
  },
  subjects: {
    list: '/subjects',
    detail: (subjectId: string) => `/subjects/${subjectId}`,
    topics: (subjectId: string) => `/subjects/${subjectId}/topics`,
    subtopics: (subjectId: string, topicId: string) =>
      `/subjects/${subjectId}/topics/${topicId}/subtopics`,
    lessonDetail: (subjectId: string, topicId: string, subtopicId: string) =>
      `/subjects/${subjectId}/topics/${topicId}/subtopics/${subtopicId}`,
    lessons: (subjectId: string, topicId: string, subtopicId: string) =>
      `/subjects/${subjectId}/topics/${topicId}/subtopics/${subtopicId}/lessons`,
    video: (subjectId: string, topicId: string, subtopicId: string) =>
      `/subjects/${subjectId}/topics/${topicId}/subtopics/${subtopicId}/video`,
    notes: (subjectId: string, topicId: string, subtopicId: string) =>
      `/subjects/${subjectId}/topics/${topicId}/subtopics/${subtopicId}/notes`,
  },
  lessons: {
    detail: (lessonId: string) => `/lessons/${lessonId}`,
  },
  studyMaterials: {
    detail: (studyMaterialId: string) => `/study-materials/${studyMaterialId}`,
  },
  learn: {
    search: '/learn/search',
    subtopicLocation: (subtopicId: string) => `/learn/subtopic-location/${subtopicId}`,
  },
  learningProgress: {
    list: '/learning-progress',
    lastVisited: '/learning-progress/last-visited',
    update: (subtopicId: string) => `/learning-progress/${subtopicId}`,
  },
  questions: {
    list: '/questions',
    detail: (questionId: string) => `/questions/${questionId}`,
    explanation: (questionId: string) => `/questions/${questionId}/explanation`,
    report: (questionId: string) => `/questions/${questionId}/report`,
  },
  /** Step 46's real Smart Practice backend — `answer`/`finish`/`review`
   * match the actual mounted routes (`backend/src/routes/practice.routes.ts`),
   * not `docs/API.md` §6's illustrative `PUT .../answers/{questionId}` +
   * `POST .../submit` shapes (this step's build instruction specified the
   * real paths directly). Only Topic Quiz (`mode: 'quiz'`) is backed by
   * these — Sectional/Mock/PYQ/100 Questions stay on the mock question bank
   * (`services/mock/questionsMockService.ts`), out of this step's scope. */
  practice: {
    createSession: '/practice/sessions',
    session: (sessionId: string) => `/practice/sessions/${sessionId}`,
    answer: (sessionId: string) => `/practice/sessions/${sessionId}/answers`,
    finish: (sessionId: string) => `/practice/sessions/${sessionId}/finish`,
    result: (sessionId: string) => `/practice/sessions/${sessionId}/result`,
    review: (sessionId: string) => `/practice/sessions/${sessionId}/review`,
    history: '/practice/history',
  },
  /** Step 48's real Weekly Live Exam backend
   * (`backend/src/routes/liveExam.routes.ts`). `/attempts` is a distinct,
   * static path from `/:liveExamId` — mirrored on the backend router,
   * which registers it first for the same reason. */
  liveExams: {
    list: '/live-exams',
    detail: (liveExamId: string) => `/live-exams/${liveExamId}`,
    join: (liveExamId: string) => `/live-exams/${liveExamId}/join`,
    attempt: (liveExamId: string) => `/live-exams/${liveExamId}/attempt`,
    answer: (liveExamId: string) => `/live-exams/${liveExamId}/attempt/answers`,
    finish: (liveExamId: string) => `/live-exams/${liveExamId}/attempt/finish`,
    result: (liveExamId: string) => `/live-exams/${liveExamId}/result`,
    myAttempts: '/live-exams/attempts',
  },
  /** Step 47's real Individual Student Analytics backend
   * (`backend/src/routes/analytics.routes.ts`) — every path here is
   * computed live via MongoDB aggregation from `QuestionAttempt`/
   * `PracticeSession`/`LearningProgress`, replacing `docs/API.md` §7's
   * illustrative materialized-view shape (`/trends` split into purpose-built
   * `/weekly-study-time` + `/monthly-progress` instead), same "real build
   * instruction overrides illustrative doc shape" precedent this project has
   * set repeatedly. */
  analytics: {
    overview: '/analytics/overview',
    subjects: '/analytics/subjects',
    topics: '/analytics/topics',
    weakAreas: '/analytics/weak-areas',
    strongAreas: '/analytics/strong-areas',
    subjectAccuracy: '/analytics/subject-accuracy',
    weeklyStudyTime: '/analytics/weekly-study-time',
    monthlyProgress: '/analytics/monthly-progress',
    practiceHistory: '/analytics/practice-history',
    speedAnalysis: '/analytics/speed-analysis',
    rank: '/analytics/rank',
    goalCompletion: '/analytics/goal-completion',
    difficulty: '/analytics/difficulty',
  },
  payments: {
    plans: '/payments/plans',
    createOrder: '/payments/orders',
    verify: '/payments/verify',
    subscription: '/payments/subscription',
    cancelSubscription: '/payments/subscription/cancel',
    invoices: '/payments/invoices',
    invoice: (invoiceId: string) => `/payments/invoices/${invoiceId}`,
  },
  leaderboard: {
    list: '/leaderboard',
    me: '/leaderboard/me',
  },
  bookmarks: {
    list: '/bookmarks',
    create: '/bookmarks',
    /** Step 45 — the real backend's create-or-remove-in-one-call endpoint,
     * matching `services/learnProgressService.ts`'s existing
     * `toggleBookmark(): Promise<boolean>` contract exactly. */
    toggle: '/bookmarks/toggle',
    update: (bookmarkId: string) => `/bookmarks/${bookmarkId}`,
    remove: (bookmarkId: string) => `/bookmarks/${bookmarkId}`,
  },
  profile: {
    get: '/profile',
    update: '/profile',
    photoUploadSignature: '/profile/photo-upload-signature',
    examGoals: '/profile/exam-goals',
    notificationPreferences: '/profile/notification-preferences',
    dataExport: '/profile/data-export',
    delete: '/profile',
  },
  /** Step 44's real user-profile module — distinct from `profile.*` above,
   * which docs/API.md §11 specified but which no backend controller
   * implements yet; `users.*` is what the real backend actually exposes. */
  users: {
    me: '/users/me',
    preferences: '/users/me/preferences',
  },
  /** Step 44's real Onboarding backend (docs/Onboarding.md) — persists the
   * wizard's draft state after every step and finalizes it on completion. */
  onboarding: {
    get: '/onboarding',
    saveDraft: '/onboarding',
    complete: '/onboarding/complete',
  },
  studyPlans: {
    get: (examCategory: string) => `/study-plans/${examCategory}`,
    create: '/study-plans',
    updateTask: (planId: string, taskId: string) =>
      `/study-plans/${planId}/tasks/${taskId}`,
    regenerate: (planId: string) => `/study-plans/${planId}/regenerate`,
  },
  /** Real Current Affairs backend — `docs/API.md` §13's illustrative shape
   * plus `preview`/`search`/`archive/*`, matching the already-shipped
   * frontend module's full feature set (Today/Weekly/Monthly feeds,
   * Categories, Search, Monthly Archive) directly, not just the doc's
   * bare list/detail/quiz trio. */
  currentAffairs: {
    preview: '/current-affairs/preview',
    list: '/current-affairs',
    detail: (id: string) => `/current-affairs/${id}`,
    quiz: (id: string) => `/current-affairs/${id}/quiz`,
    relatedQuestions: (id: string) => `/current-affairs/${id}/related-questions`,
    search: '/current-affairs/search',
    archiveMonths: '/current-affairs/archive/months',
    archiveForMonth: (month: string) => `/current-affairs/archive/${month}`,
  },
  /** Sprint 4 Step 63's real Global Search backend
   * (`backend/src/routes/search.routes.ts`) — spans Subjects/Topics/
   * Lessons/Questions/Current Affairs/Live Exams in one query, with
   * autocomplete and per-user Recent/Popular search history. */
  search: {
    root: '/search',
    autocomplete: '/search/autocomplete',
    recentHistory: '/search/history/recent',
    popularHistory: '/search/history/popular',
    removeHistory: '/search/history',
    clearHistory: '/search/history/all',
  },
  notifications: {
    list: '/notifications',
    markRead: (notificationId: string) => `/notifications/${notificationId}/read`,
    markAllRead: '/notifications/read-all',
    unreadCount: '/notifications/unread-count',
    /** Sprint 4 Step 62 — non-destructive "tidy away," distinct from `remove`. */
    archive: (notificationId: string) => `/notifications/${notificationId}/archive`,
    unarchive: (notificationId: string) => `/notifications/${notificationId}/unarchive`,
    remove: (notificationId: string) => `/notifications/${notificationId}`,
  },
  ai: {
    explain: '/ai/explain',
    chat: '/ai/chat',
    mainsEvaluation: '/ai/mains-evaluation',
    mainsEvaluationJob: (jobId: string) => `/ai/mains-evaluation/${jobId}`,
    feedback: '/ai/feedback',
  },
  /** Sprint 4 Step 64's real Nalanda AI Tutor backend
   * (`backend/src/routes/aiTutor.routes.ts`) — gated server-side by the
   * `ai_tutor` entitlement (Sprint 4 Step 55), Pro/Institutional only. */
  aiTutor: {
    usage: '/ai/tutor/usage',
    conversations: '/ai/tutor/conversations',
    conversation: (conversationId: string) =>
      `/ai/tutor/conversations/${conversationId}`,
    messages: (conversationId: string) =>
      `/ai/tutor/conversations/${conversationId}/messages`,
    pin: (conversationId: string) => `/ai/tutor/conversations/${conversationId}/pin`,
    unpin: (conversationId: string) => `/ai/tutor/conversations/${conversationId}/unpin`,
  },
  /** Public, unauthenticated, bounded marketing endpoints (docs/API.md §17)
   * — never the authoritative data source inside the authenticated product,
   * only for pre-signup proof sections (Landing Page stats/testimonials/
   * success stories/top-rankers preview). */
  public: {
    stats: '/public/stats',
    testimonials: '/public/testimonials',
    successStories: '/public/success-stories',
    topRankers: '/public/top-rankers',
  },
  admin: {
    createQuestion: '/admin/questions',
    updateQuestion: (questionId: string) => `/admin/questions/${questionId}`,
    bulkUploadQuestions: '/admin/questions/bulk-upload',
    createLiveExam: '/admin/live-exams',
    users: '/admin/users',
    updateUserRole: (userId: string) => `/admin/users/${userId}/role`,
    updateUserStatus: (userId: string) => `/admin/users/${userId}/status`,
    subscriptions: '/admin/subscriptions',
    refundSubscription: (subscriptionId: string) =>
      `/admin/subscriptions/${subscriptionId}/refund`,
    broadcastNotification: '/admin/notifications/broadcast',
    auditLogs: '/admin/audit-logs',
  },
} as const
