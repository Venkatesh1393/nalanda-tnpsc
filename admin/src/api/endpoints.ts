/**
 * Every endpoint path this app calls, centralized so a path string is never
 * typed twice — same convention as frontend/src/api/endpoints.ts. Paths are
 * relative to VITE_API_BASE_URL (already versioned, e.g. `/api/v1`).
 */
export const endpoints = {
  auth: {
    google: '/auth/google',
    email: '/auth/email',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    userDetail: (userId: string) => `/admin/users/${userId}`,
    updateUserStatus: (userId: string) => `/admin/users/${userId}/status`,
    updateUserRole: (userId: string) => `/admin/users/${userId}/role`,
    auditLogs: '/admin/audit-logs',
    invites: '/admin/invites',
    revokeInvite: (inviteId: string) => `/admin/invites/${inviteId}`,
    questions: '/admin/questions',
    questionDetail: (id: string) => `/admin/questions/${id}`,
    updateQuestionStatus: (id: string) => `/admin/questions/${id}/status`,
    archiveQuestion: (id: string) => `/admin/questions/${id}/archive`,
    restoreQuestion: (id: string) => `/admin/questions/${id}/restore`,
    questionMetaExams: '/admin/questions/meta/exams',
    questionMetaSubjects: '/admin/questions/meta/subjects',
    questionMetaTopics: '/admin/questions/meta/topics',
    questionMetaSubtopics: '/admin/questions/meta/subtopics',
    questionImportTemplate: '/admin/questions/import/template',
    questionImportPreview: '/admin/questions/import/preview',
    questionImportConfirm: '/admin/questions/import/confirm',

    // Sprint 4 Step 54 — Content Management System
    exams: '/admin/exams',
    examDetail: (id: string) => `/admin/exams/${id}`,
    updateExamStatus: (id: string) => `/admin/exams/${id}/status`,

    subjects: '/admin/subjects',
    subjectDetail: (id: string) => `/admin/subjects/${id}`,
    updateSubjectStatus: (id: string) => `/admin/subjects/${id}/status`,
    archiveSubject: (id: string) => `/admin/subjects/${id}/archive`,
    restoreSubject: (id: string) => `/admin/subjects/${id}/restore`,

    topics: '/admin/topics',
    topicDetail: (id: string) => `/admin/topics/${id}`,
    updateTopicStatus: (id: string) => `/admin/topics/${id}/status`,
    archiveTopic: (id: string) => `/admin/topics/${id}/archive`,
    restoreTopic: (id: string) => `/admin/topics/${id}/restore`,

    subtopics: '/admin/subtopics',
    subtopicDetail: (id: string) => `/admin/subtopics/${id}`,
    updateSubtopicStatus: (id: string) => `/admin/subtopics/${id}/status`,
    archiveSubtopic: (id: string) => `/admin/subtopics/${id}/archive`,
    restoreSubtopic: (id: string) => `/admin/subtopics/${id}/restore`,

    lessons: '/admin/lessons',
    lessonDetail: (id: string) => `/admin/lessons/${id}`,
    updateLessonStatus: (id: string) => `/admin/lessons/${id}/status`,
    archiveLesson: (id: string) => `/admin/lessons/${id}/archive`,
    restoreLesson: (id: string) => `/admin/lessons/${id}/restore`,

    studyMaterials: '/admin/study-materials',
    studyMaterialDetail: (id: string) => `/admin/study-materials/${id}`,
    updateStudyMaterialStatus: (id: string) => `/admin/study-materials/${id}/status`,
    archiveStudyMaterial: (id: string) => `/admin/study-materials/${id}/archive`,
    restoreStudyMaterial: (id: string) => `/admin/study-materials/${id}/restore`,
    /** Not under `/admin` — the existing Step 50 Cloudinary attach/detach
     * route, reused unchanged (see `backend/src/routes/studyMaterials.routes.ts`). */
    studyMaterialFile: (id: string) => `/study-materials/${id}/file`,

    currentAffairs: '/admin/current-affairs',
    currentAffairDetail: (id: string) => `/admin/current-affairs/${id}`,
    updateCurrentAffairStatus: (id: string) => `/admin/current-affairs/${id}/status`,
    archiveCurrentAffair: (id: string) => `/admin/current-affairs/${id}/archive`,
    restoreCurrentAffair: (id: string) => `/admin/current-affairs/${id}/restore`,
    /** Not under `/admin` — the existing Step 50 Cloudinary attach/detach
     * route, reused unchanged (see `backend/src/routes/currentAffairs.routes.ts`). */
    currentAffairImage: (id: string) => `/current-affairs/${id}/image`,

    liveExams: '/admin/live-exams',
    liveExamDetail: (id: string) => `/admin/live-exams/${id}`,
    publishLiveExam: (id: string) => `/admin/live-exams/${id}/publish`,
    cancelLiveExam: (id: string) => `/admin/live-exams/${id}/cancel`,
    publishLiveExamResults: (id: string) => `/admin/live-exams/${id}/publish-results`,

    // Sprint 4 Step 65 — Admin AI Question Generator
    aiQuestionDraftsGenerate: '/admin/ai-question-drafts/generate',
    aiQuestionDrafts: '/admin/ai-question-drafts',
    aiQuestionDraftDetail: (id: string) => `/admin/ai-question-drafts/${id}`,
    approveAiQuestionDraft: (id: string) => `/admin/ai-question-drafts/${id}/approve`,
    rejectAiQuestionDraft: (id: string) => `/admin/ai-question-drafts/${id}/reject`,

    // Sprint 4 Step 55 — Premium Plans + Entitlement Engine (read-only)
    subscriptions: '/admin/subscriptions',
    subscriptionDetail: (userId: string) => `/admin/subscriptions/${userId}`,

    // Sprint 4 Step 56 — Razorpay Payment + Subscription Integration (read-only)
    payments: '/admin/payments',
    paymentDetail: (paymentId: string) => `/admin/payments/${paymentId}`,
  },
} as const
