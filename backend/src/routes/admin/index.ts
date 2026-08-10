import { Router } from 'express'

import { ADMIN_ACCESS_ROLES } from '../../constants/roles'
import { authenticate } from '../../middleware/auth.middleware'
import { authorizeRoles } from '../../middleware/rbac.middleware'
import aiQuestionGeneratorRoutes from './aiQuestionGenerator.routes'
import aiUsageRoutes from './aiUsage.routes'
import auditLogsRoutes from './auditLogs.routes'
import currentAffairsRoutes from './currentAffairs.routes'
import dashboardRoutes from './dashboard.routes'
import invitesRoutes from './invites.routes'
import learningContentRoutes from './learningContent.routes'
import liveExamsRoutes from './liveExams.routes'
import notificationsRoutes from './notifications.routes'
import paymentsRoutes from './payments.routes'
import questionsRoutes from './questions.routes'
import subscriptionsRoutes from './subscriptions.routes'
import syllabusRoutes from './syllabus.routes'
import usersRoutes from './users.routes'

/**
 * The single mount point for every `/admin/*` route (Sprint 4 Step 52 —
 * docs/FolderStructure.md §6's `routes/admin/` namespace). `authenticate` +
 * a coarse `authorizeRoles(...ADMIN_ACCESS_ROLES)` are applied here, once,
 * so **every** admin route — including any added later — is unreachable by
 * a plain `user` (student) role by construction, not by each route
 * remembering to add the check itself. Individual routers below layer a
 * narrower `authorizeRoles(...)` on top where the permission matrix
 * (docs/Authentication.md §7) requires a smaller allowed set than the full
 * admin-staff baseline (e.g. only `super_admin` may change a role).
 *
 * This is the backend half of "students must never access admin routes" —
 * it holds even if the frontend's route guard were ever bypassed, removed,
 * or has a bug, per this step's explicit "never rely only on hidden
 * frontend buttons" instruction.
 */
const router = Router()

router.use(authenticate, authorizeRoles(...ADMIN_ACCESS_ROLES))

router.use('/dashboard', dashboardRoutes)
router.use('/users', usersRoutes)
router.use('/audit-logs', auditLogsRoutes)
router.use('/invites', invitesRoutes)
router.use('/questions', questionsRoutes)
// Sprint 4 Step 54 — Admin Content Management System. `syllabusRoutes`/
// `learningContentRoutes` mount with no prefix (their own paths are already
// fully qualified: `/exams`, `/subjects`, `/topics`, `/subtopics`,
// `/lessons`, `/study-materials`), so the resulting URLs are
// `/admin/exams`, `/admin/subjects`, etc.
router.use(syllabusRoutes)
router.use(learningContentRoutes)
router.use('/current-affairs', currentAffairsRoutes)
router.use('/live-exams', liveExamsRoutes)
// Sprint 4 Step 55 — Premium Plans + Entitlement Engine
router.use('/subscriptions', subscriptionsRoutes)
// Sprint 4 Step 56 — Razorpay Payment + Subscription Integration
router.use('/payments', paymentsRoutes)
// Sprint 4 Step 58 — AI Explanation Quality + Cost Optimization
router.use('/ai-usage', aiUsageRoutes)
// Sprint 4 Step 65 — Admin AI Question Generator
router.use('/ai-question-drafts', aiQuestionGeneratorRoutes)
// Sprint 4 Step 62 — Notification Engine (Admin Announcements)
router.use('/notifications', notificationsRoutes)

export default router
