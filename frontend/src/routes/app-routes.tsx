import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { NotFound } from '@/components/not-found'
import { PageLoader } from '@/components/page-loader'
import { AuthLayout } from '@/layouts/auth-layout'
import { CurrentAffairsLayout } from '@/layouts/current-affairs-layout'
import { LearnLayout } from '@/layouts/learn-layout'
import { LiveExamsLayout } from '@/layouts/live-exams-layout'
import { PracticeLayout } from '@/layouts/practice-layout'
import { WebsiteLayout } from '@/layouts/website-layout'
import { ROUTES } from '@/constants/routes'
import { useScrollToHash } from '@/hooks/use-scroll-to-hash'
import { ProtectedRoute } from '@/routes/protected-route'
import { PublicOnlyRoute } from '@/routes/public-only-route'

/**
 * Sprint 4 Step 67 — every real page is now a separate lazy-loaded chunk
 * instead of one eagerly-imported bundle (the pre-Step-67 baseline shipped
 * a single 2 MB / ~572 KB gzip JS chunk regardless of which page a visitor
 * landed on). `React.lazy` + the single `<Suspense>` boundary below is the
 * whole mechanism — layouts stay eager (they're the shell every nested page
 * renders inside, so splitting them would just add a second waterfall hop
 * for zero benefit) and `App.tsx`'s `/dev/preview` design-system screen
 * (never visited by a real user) is lazy too, keeping every design-system-
 * only dependency it pulls in out of every real page's path entirely.
 */
const HomePage = lazy(() =>
  import('@/pages/website/home/home-page').then((m) => ({ default: m.HomePage })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/auth/register-page').then((m) => ({ default: m.RegisterPage })),
)
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/verify-email-page').then((m) => ({ default: m.VerifyEmailPage })),
)
const OnboardingPage = lazy(() =>
  import('@/pages/onboarding/onboarding-page').then((m) => ({
    default: m.OnboardingPage,
  })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics/analytics-page').then((m) => ({ default: m.AnalyticsPage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/notifications-page').then((m) => ({
    default: m.NotificationsPage,
  })),
)
const SearchPage = lazy(() =>
  import('@/pages/search/search-page').then((m) => ({ default: m.SearchPage })),
)
const AiTutorPage = lazy(() =>
  import('@/pages/ai-tutor/ai-tutor-page').then((m) => ({ default: m.AiTutorPage })),
)
const QuestionPapersPage = lazy(() =>
  import('@/pages/question-papers/question-papers-page').then((m) => ({
    default: m.QuestionPapersPage,
  })),
)
const SubscriptionPage = lazy(() =>
  import('@/pages/payments/subscription-page').then((m) => ({
    default: m.SubscriptionPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/settings-page').then((m) => ({ default: m.SettingsPage })),
)
const SubjectsPage = lazy(() =>
  import('@/pages/learn/subjects-page').then((m) => ({ default: m.SubjectsPage })),
)
const BookmarksPage = lazy(() =>
  import('@/pages/learn/bookmarks-page').then((m) => ({ default: m.BookmarksPage })),
)
const RevisionPage = lazy(() =>
  import('@/pages/learn/revision-page').then((m) => ({ default: m.RevisionPage })),
)
const TopicsPage = lazy(() =>
  import('@/pages/learn/topics-page').then((m) => ({ default: m.TopicsPage })),
)
const SubtopicsPage = lazy(() =>
  import('@/pages/learn/subtopics-page').then((m) => ({ default: m.SubtopicsPage })),
)
const LessonDetailPage = lazy(() =>
  import('@/pages/learn/lesson-detail-page').then((m) => ({
    default: m.LessonDetailPage,
  })),
)
const VideoPage = lazy(() =>
  import('@/pages/learn/video-page').then((m) => ({ default: m.VideoPage })),
)
const NotesPage = lazy(() =>
  import('@/pages/learn/notes-page').then((m) => ({ default: m.NotesPage })),
)
const PracticeHistoryPage = lazy(() =>
  import('@/pages/practice/practice-history-page').then((m) => ({
    default: m.PracticeHistoryPage,
  })),
)
const ModePickerPage = lazy(() =>
  import('@/pages/practice/mode-picker-page').then((m) => ({
    default: m.ModePickerPage,
  })),
)
const PracticeSessionPage = lazy(() =>
  import('@/pages/practice/practice-session-page').then((m) => ({
    default: m.PracticeSessionPage,
  })),
)
const PracticeSummaryPage = lazy(() =>
  import('@/pages/practice/practice-summary-page').then((m) => ({
    default: m.PracticeSummaryPage,
  })),
)
const PracticeReviewPage = lazy(() =>
  import('@/pages/practice/practice-review-page').then((m) => ({
    default: m.PracticeReviewPage,
  })),
)
const LiveExamsPage = lazy(() =>
  import('@/pages/live-exams/live-exams-page').then((m) => ({
    default: m.LiveExamsPage,
  })),
)
const LiveExamDetailPage = lazy(() =>
  import('@/pages/live-exams/live-exam-detail-page').then((m) => ({
    default: m.LiveExamDetailPage,
  })),
)
const LiveExamSessionPage = lazy(() =>
  import('@/pages/live-exams/live-exam-session-page').then((m) => ({
    default: m.LiveExamSessionPage,
  })),
)
const LiveExamResultPage = lazy(() =>
  import('@/pages/live-exams/live-exam-result-page').then((m) => ({
    default: m.LiveExamResultPage,
  })),
)
const CurrentAffairsPage = lazy(() =>
  import('@/pages/current-affairs/current-affairs-page').then((m) => ({
    default: m.CurrentAffairsPage,
  })),
)
const ArticleDetailPage = lazy(() =>
  import('@/pages/current-affairs/article-detail-page').then((m) => ({
    default: m.ArticleDetailPage,
  })),
)
/** Design-system preview only (`/dev/preview`, never linked from real UI) —
 * lazy so its many component-library imports never touch a real user's
 * bundle. */
const DevPreviewPage = lazy(() => import('@/App.tsx'))

/** The catch-all 404 (docs/Dashboard.md's several Dashboard widgets already
 * link toward Learn/Practice/Analytics/etc. paths that don't have a page
 * behind them yet — this is what those hit today instead of a blank router
 * screen, the same known-gap pattern already accepted for Navbar/Footer
 * links in docs/MASTER_ROADMAP.md Phase 3). */
function NotFoundRoute() {
  const navigate = useNavigate()
  return <NotFound onAction={() => navigate(ROUTES.dashboard)} />
}

/**
 * The real route table (docs/InformationArchitecture.md §4, §9's illustrative
 * route map) — only wired for routes that have an actual page behind them
 * today. `/dev/preview` keeps the design-system verification screen
 * (`App.tsx`, docs/PROJECT_CONTEXT.md §14) reachable without occupying the
 * production home route it used to sit at. Every other route in the
 * illustrative map gets added here as its page is built — never stubbed
 * ahead of time with a placeholder screen, per CLAUDE.md's "never use dummy
 * data/UI" rule.
 */
export function AppRoutes() {
  useScrollToHash()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<WebsiteLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
        </Route>

        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
            <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.analytics} element={<AnalyticsPage />} />
          <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          <Route path={ROUTES.search} element={<SearchPage />} />
          <Route path={ROUTES.aiTutor} element={<AiTutorPage />} />
          <Route path={ROUTES.questionPapers} element={<QuestionPapersPage />} />
          <Route path={ROUTES.subscription} element={<SubscriptionPage />} />
          <Route path={ROUTES.settings(':section')} element={<SettingsPage />} />

          {/* Learn (docs/Learn_Module.md) — route patterns are built from the
           * same `ROUTES.learn*` functions used everywhere else (called with
           * literal `:param` placeholders) so the path template can never
           * drift from the builders that construct real links to it. React
           * Router ranks static segments (bookmarks/revision) above dynamic
           * ones (:subjectId) at the same depth, so declaration order here
           * doesn't matter for that collision. */}
          <Route element={<LearnLayout />}>
            <Route path={ROUTES.learnSubjects} element={<SubjectsPage />} />
            <Route path={ROUTES.learnBookmarks} element={<BookmarksPage />} />
            <Route path={ROUTES.learnRevision} element={<RevisionPage />} />
            <Route path={ROUTES.learnTopics(':subjectId')} element={<TopicsPage />} />
            <Route
              path={ROUTES.learnSubtopics(':subjectId', ':topicId')}
              element={<SubtopicsPage />}
            />
            <Route
              path={ROUTES.learnLesson(':subjectId', ':topicId', ':subtopicId')}
              element={<LessonDetailPage />}
            />
            <Route
              path={ROUTES.learnVideo(':subjectId', ':topicId', ':subtopicId')}
              element={<VideoPage />}
            />
            <Route
              path={ROUTES.learnNotes(':subjectId', ':topicId', ':subtopicId')}
              element={<NotesPage />}
            />
          </Route>

          {/* Smart Practice (docs/Smart_Practice.md) — same
           * builder-called-with-`:param` pattern as Learn above. */}
          <Route element={<PracticeLayout />}>
            <Route path={ROUTES.practiceHistory} element={<PracticeHistoryPage />} />
            <Route path={ROUTES.practice(':mode')} element={<ModePickerPage />} />
            <Route
              path={ROUTES.practiceSession(':sessionId')}
              element={<PracticeSessionPage />}
            />
            <Route
              path={ROUTES.practiceSummary(':sessionId')}
              element={<PracticeSummaryPage />}
            />
            <Route
              path={ROUTES.practiceReview(':sessionId')}
              element={<PracticeReviewPage />}
            />
          </Route>

          {/* Weekly Live Exam (Step 48, docs/InformationArchitecture.md
           * §7.10) — `exam/:liveExamId` is a literal-prefixed static segment
           * so it never collides with the `:tab` param above it, the same
           * `currentAffairsArticle` vs. `currentAffairs(period)` precedent
           * below. */}
          <Route element={<LiveExamsLayout />}>
            <Route path={ROUTES.liveExams(':tab')} element={<LiveExamsPage />} />
            <Route
              path={ROUTES.liveExamDetail(':liveExamId')}
              element={<LiveExamDetailPage />}
            />
            <Route
              path={ROUTES.liveExamSession(':liveExamId')}
              element={<LiveExamSessionPage />}
            />
            <Route
              path={ROUTES.liveExamResult(':liveExamId')}
              element={<LiveExamResultPage />}
            />
          </Route>

          {/* Current Affairs (docs/InformationArchitecture.md §7.9) — same
           * builder-called-with-`:param` pattern as Learn/Practice above.
           * `article/:id` is a static-segment-before-dynamic path relative to
           * `:period`, so it can never collide with it (same reasoning as
           * Learn's bookmarks/revision routes above). A bare
           * `/app/current-affairs` redirects to the Daily feed rather than
           * 404ing. */}
          <Route element={<CurrentAffairsLayout />}>
            <Route
              path="/app/current-affairs"
              element={<Navigate to={ROUTES.currentAffairs('daily')} replace />}
            />
            <Route
              path={ROUTES.currentAffairsArticle(':id')}
              element={<ArticleDetailPage />}
            />
            <Route
              path={ROUTES.currentAffairs(':period')}
              element={<CurrentAffairsPage />}
            />
          </Route>
        </Route>

        {/* Sprint 4 Step 71 — a production build no longer wires this route
         * up at all (the catch-all below now owns `/dev/preview` there too),
         * so the internal design-system preview screen has no reachable,
         * navigable URL in production. `import.meta.env.DEV` is the same
         * build-time constant `providers/app-providers.tsx` already uses to
         * gate `ReactQueryDevtools`. Note this only removes the *route* —
         * `DevPreviewPage`'s lazy chunk still ships as an unlinked file in
         * `dist/assets/` (Rollup can't prove a dynamic `import()` is
         * unreachable from a conditional JSX branch alone), so this is a
         * "no live URL" fix, not a "zero bytes shipped" one. */}
        {import.meta.env.DEV && (
          <Route path="/dev/preview" element={<DevPreviewPage />} />
        )}
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </Suspense>
  )
}
