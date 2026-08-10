import { Router } from 'express'

import adaptivePracticeRoutes from './adaptivePractice.routes'
import adminRoutes from './admin'
import aiRoutes from './ai.routes'
import analyticsRoutes from './analytics.routes'
import authRoutes from './auth.routes'
import bookmarksRoutes from './bookmarks.routes'
import currentAffairsRoutes from './currentAffairs.routes'
import dashboardRoutes from './dashboard.routes'
import examsRoutes from './exams.routes'
import gamificationRoutes from './gamification.routes'
import leaderboardRoutes from './leaderboard.routes'
import learnRoutes from './learn.routes'
import learningProgressRoutes from './learningProgress.routes'
import lessonsRoutes from './lessons.routes'
import liveExamRoutes from './liveExam.routes'
import notificationsRoutes from './notifications.routes'
import onboardingRoutes from './onboarding.routes'
import paymentsRoutes from './payments.routes'
import practiceRoutes from './practice.routes'
import publicRoutes from './public.routes'
import questionsRoutes from './questions.routes'
import searchRoutes from './search.routes'
import studyMaterialsRoutes from './studyMaterials.routes'
import subjectsRoutes from './subjects.routes'
import userRoutes from './user.routes'

/**
 * The single mount point for every versioned route module — app.ts mounts
 * this once at `/api/{API_VERSION}`. Future domain routers (practice, ...)
 * register here as they're built, per docs/FolderStructure.md §6. (The
 * unauthenticated health probe lives outside this versioned namespace —
 * see `routes/health.routes.ts` and its direct mount in `app.ts`.)
 */
const router = Router()

router.use('/adaptive-practice', adaptivePracticeRoutes)
router.use('/ai', aiRoutes)
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/onboarding', onboardingRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/exams', examsRoutes)
router.use('/subjects', subjectsRoutes)
router.use('/lessons', lessonsRoutes)
router.use('/study-materials', studyMaterialsRoutes)
router.use('/learn', learnRoutes)
router.use('/learning-progress', learningProgressRoutes)
router.use('/bookmarks', bookmarksRoutes)
router.use('/questions', questionsRoutes)
router.use('/practice', practiceRoutes)
router.use('/live-exams', liveExamRoutes)
router.use('/gamification', gamificationRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/current-affairs', currentAffairsRoutes)
router.use('/leaderboard', leaderboardRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/search', searchRoutes)
router.use('/payments', paymentsRoutes)
router.use('/public', publicRoutes)
router.use('/admin', adminRoutes)

export default router
