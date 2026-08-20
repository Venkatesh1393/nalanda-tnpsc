import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/layouts/admin-layout'
import { ROUTES } from '@/constants/routes'
import { AccessDeniedPage } from '@/pages/access-denied/access-denied-page'
import { AiQuestionGeneratorPage } from '@/pages/ai-questions/ai-question-generator-page'
import { AiQuestionReviewQueuePage } from '@/pages/ai-questions/ai-question-review-queue-page'
import { ContentManagementPage } from '@/pages/content/content-management-page'
import { CurrentAffairEditorPage } from '@/pages/current-affairs/current-affair-editor-page'
import { CurrentAffairsListPage } from '@/pages/current-affairs/current-affairs-list-page'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'
import { LiveExamEditorPage } from '@/pages/live-exams/live-exam-editor-page'
import { LiveExamsListPage } from '@/pages/live-exams/live-exams-list-page'
import { LoginPage } from '@/pages/login/login-page'
import { PlaceholderPage } from '@/pages/placeholder/placeholder-page'
import { QuestionPaperEditorPage } from '@/pages/question-papers/question-paper-editor-page'
import { QuestionPapersListPage } from '@/pages/question-papers/question-papers-list-page'
import { QuestionEditorPage } from '@/pages/questions/question-editor-page'
import { QuestionImportPage } from '@/pages/questions/question-import-page'
import { QuestionsListPage } from '@/pages/questions/questions-list-page'
import { SubscriptionsListPage } from '@/pages/subscriptions/subscriptions-list-page'
import { UserDetailPage } from '@/pages/users/user-detail-page'
import { UsersListPage } from '@/pages/users/users-list-page'
import { ProtectedRoute, PublicOnlyRoute } from './protected-route'

/**
 * The full Admin Panel route table (Step 52's requested route list:
 * /admin, /admin/dashboard, /admin/users, /admin/content, /admin/questions,
 * /admin/exams, /admin/current-affairs, /admin/live-exams,
 * /admin/subscriptions, /admin/analytics, /admin/settings). Every `/admin/*`
 * path renders inside `AdminLayout` and behind `ProtectedRoute` — the
 * frontend convenience half of "students must never access admin routes,"
 * mirrored (and actually enforced) server-side per route.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
      </Route>

      <Route path={ROUTES.accessDenied} element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route
            path={ROUTES.root}
            element={<Navigate to={ROUTES.dashboard} replace />}
          />
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.users} element={<UsersListPage />} />
          <Route path={ROUTES.userDetail(':userId')} element={<UserDetailPage />} />
          <Route path={ROUTES.content} element={<ContentManagementPage />} />
          <Route path={ROUTES.questions} element={<QuestionsListPage />} />
          <Route path={ROUTES.questionNew} element={<QuestionEditorPage />} />
          <Route
            path={ROUTES.questionEdit(':questionId')}
            element={<QuestionEditorPage />}
          />
          <Route path={ROUTES.questionImport} element={<QuestionImportPage />} />
          <Route path={ROUTES.aiQuestionGenerate} element={<AiQuestionGeneratorPage />} />
          <Route path={ROUTES.aiQuestionReview} element={<AiQuestionReviewQueuePage />} />
          <Route path={ROUTES.currentAffairs} element={<CurrentAffairsListPage />} />
          <Route path={ROUTES.currentAffairNew} element={<CurrentAffairEditorPage />} />
          <Route
            path={ROUTES.currentAffairEdit(':articleId')}
            element={<CurrentAffairEditorPage />}
          />
          <Route path={ROUTES.liveExams} element={<LiveExamsListPage />} />
          <Route path={ROUTES.liveExamNew} element={<LiveExamEditorPage />} />
          <Route
            path={ROUTES.liveExamEdit(':liveExamId')}
            element={<LiveExamEditorPage />}
          />
          <Route path={ROUTES.questionPapers} element={<QuestionPapersListPage />} />
          <Route path={ROUTES.questionPaperNew} element={<QuestionPaperEditorPage />} />
          <Route
            path={ROUTES.questionPaperEdit(':paperId')}
            element={<QuestionPaperEditorPage />}
          />
          <Route path={ROUTES.subscriptions} element={<SubscriptionsListPage />} />
          <Route
            path={ROUTES.analytics}
            element={<PlaceholderPage title="Analytics" />}
          />
          <Route path={ROUTES.settings} element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  )
}
