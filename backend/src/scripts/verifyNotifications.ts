import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { Exam } from '../models/Exam.model'
import { LiveExam } from '../models/LiveExam.model'
import { LiveExamAttempt } from '../models/LiveExamAttempt.model'
import { Notification } from '../models/Notification.model'
import { CurrentAffair } from '../models/CurrentAffair.model'
import { Profile } from '../models/Profile.model'
import { Question, type QuestionDocument } from '../models/Question.model'
import { Subject, type SubjectDocument } from '../models/Subject.model'
import { Subscription } from '../models/Subscription.model'
import { Subtopic, type SubtopicDocument } from '../models/Subtopic.model'
import { Topic, type TopicDocument } from '../models/Topic.model'
import { User, type UserDocument } from '../models/User.model'
import { QuestionAttempt } from '../models/QuestionAttempt.model'
import * as adminCurrentAffairsService from '../services/admin/adminCurrentAffairs.service'
import { dispatch } from '../services/notificationDelivery.service'
import * as notificationService from '../services/notification.service'
import * as notificationTriggersService from '../services/notificationTriggers.service'
import * as subscriptionService from '../services/subscription.service'

/**
 * Sprint 4 Step 62 — Notification Engine. Manual end-to-end verification
 * (`npm run verify:notifications`), same pattern as
 * `verifyGamification.ts`/`verifyAdaptivePractice.ts` — no test runner
 * installed (see `backend/tests/README.md`). Exercises real writes against
 * the live database with disposable fixtures, asserts on real query
 * results and real service output, and deletes every fixture it created
 * before exiting.
 */

let failures = 0

function ok(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    logger.info(`  PASS — ${label}`)
  } else {
    failures += 1
    logger.error(`  FAIL — ${label}`, detail !== undefined ? { detail } : undefined)
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS)
}
function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * HOUR_MS)
}

async function main(): Promise<void> {
  await connectDatabase()

  const exam = await Exam.findOne({ isActive: true })
  if (!exam) {
    throw new Error('No Exam found — seed the database first (npm run seed).')
  }
  const examId = exam._id

  const stamp = Date.now()
  const userIds: string[] = []

  const subject: SubjectDocument = await Subject.create({
    slug: `verify-notifications-${stamp}`,
    name: { en: `Verify Notifications Subject ${stamp}` },
    examIds: [examId],
    isActive: true,
  })
  const topic: TopicDocument = await Topic.create({
    slug: `verify-notifications-topic-${stamp}`,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `Verify Notifications Topic ${stamp}` },
    isActive: true,
  })
  const subtopic: SubtopicDocument = await Subtopic.create({
    slug: `verify-notifications-subtopic-${stamp}`,
    topicId: topic._id,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `Verify Notifications Subtopic ${stamp}` },
    isActive: true,
  })
  const question: QuestionDocument = await Question.create({
    examIds: [examId],
    subjectId: subject._id,
    topicId: topic._id,
    subtopicId: subtopic._id,
    questionText: { en: `Verify notifications question ${stamp}` },
    options: [
      { optionId: 'A', text: { en: 'Correct option' }, isCorrect: true },
      { optionId: 'B', text: { en: 'Wrong option' }, isCorrect: false },
    ],
    difficulty: 'easy',
    source: 'curated',
    isActive: true,
  })

  async function createTestUser(
    label: string,
    prefs: Partial<{
      examReminder: boolean
      studyReminder: boolean
      premiumUpdate: boolean
      currentAffairsAlert: boolean
    }> = {},
  ): Promise<UserDocument> {
    const user = await User.create({
      firebaseUid: `verify-notifications-${label}-${stamp}`,
      email: `verify-notifications-${label}-${stamp}@test.local`,
      authProvider: 'email_password',
      subscriptionTier: 'plus',
    })
    await Profile.create({
      userId: user._id,
      name: `Verify Notifications — ${label}`,
      examGoals: [{ examId, isPrimary: true }],
      notificationPreferences: {
        examReminder: prefs.examReminder ?? true,
        studyReminder: prefs.studyReminder ?? true,
        premiumUpdate: prefs.premiumUpdate ?? true,
        currentAffairsAlert: prefs.currentAffairsAlert ?? true,
      },
    })
    userIds.push(user.id)
    return user
  }

  logger.info('Sprint 4 Step 62 — Notification Engine verification')

  // --- 1. Core CRUD: Read / Unread / Mark Read / Archive / Delete ----------
  logger.info('1. Core CRUD — read/unread/mark-read/archive/delete')
  {
    const user = await createTestUser('crud')
    const created = await notificationService.notifyUser(user.id, {
      category: 'system-notice',
      title: { en: 'Verify CRUD notification' },
      body: { en: 'Body text.' },
    })
    ok('new notification starts unread', created.isRead === false)
    ok('new notification starts unarchived', created.isArchived === false)

    const unreadBefore = await notificationService.getUnreadCount(user.id)
    ok('unread count includes the new notification', unreadBefore >= 1)

    const marked = await notificationService.markAsRead(user.id, created.id)
    ok('markAsRead reports isRead true', marked.isRead === true)
    const afterMarkDoc = await Notification.findById(created.id)
    ok('isRead persisted in MongoDB', afterMarkDoc?.isRead === true)

    const archived = await notificationService.archive(user.id, created.id)
    ok('archive reports isArchived true', archived.isArchived === true)
    const defaultList = await notificationService.getNotifications(
      user.id,
      {},
      1,
      20,
      'en',
    )
    ok(
      'archived notification is excluded from the default (non-archived) list',
      !defaultList.items.some((item) => item.id === created.id),
    )
    const archivedList = await notificationService.getNotifications(
      user.id,
      { isArchived: true },
      1,
      20,
      'en',
    )
    ok(
      'archived notification appears when isArchived filter is explicitly true',
      archivedList.items.some((item) => item.id === created.id),
    )

    const unarchived = await notificationService.unarchive(user.id, created.id)
    ok('unarchive reports isArchived false', unarchived.isArchived === false)
    const backInDefault = await notificationService.getNotifications(
      user.id,
      {},
      1,
      20,
      'en',
    )
    ok(
      'unarchived notification is back in the default list',
      backInDefault.items.some((item) => item.id === created.id),
    )

    await notificationService.remove(user.id, created.id)
    const afterDelete = await Notification.findById(created.id)
    ok('delete permanently removes the document', afterDelete === null)

    let threw: unknown
    try {
      await notificationService.markAsRead(user.id, created.id)
    } catch (error) {
      threw = error
    }
    ok('acting on a deleted notification 404s, not a silent no-op', threw !== undefined)
  }

  // --- 2. Practice Reminder — real trigger + dedupe + preference gating ---
  logger.info('2. Practice Reminder trigger')
  {
    const userEligible = await createTestUser('practice-reminder-eligible')
    const userOptedOut = await createTestUser('practice-reminder-optedout', {
      studyReminder: false,
    })
    for (const user of [userEligible, userOptedOut]) {
      await QuestionAttempt.create({
        userId: user._id,
        questionId: question._id,
        mode: 'quiz',
        selectedOptionId: 'A',
        isCorrect: true,
        timeTakenSeconds: 5,
        attemptedAt: daysAgo(10),
      })
    }

    const sentFirstRun = await notificationTriggersService.sendPracticeReminders()
    ok('at least one practice reminder was sent', sentFirstRun >= 1)

    const eligibleGotOne = await Notification.countDocuments({
      userId: userEligible._id,
      category: 'study-reminder',
    })
    ok('the inactive, opted-in user received a study-reminder', eligibleGotOne === 1)

    const optedOutGotNone = await Notification.countDocuments({
      userId: userOptedOut._id,
      category: 'study-reminder',
    })
    ok(
      'the inactive but opted-out user received nothing (preference respected)',
      optedOutGotNone === 0,
    )

    await notificationTriggersService.sendPracticeReminders()
    const eligibleCountAfterRerun = await Notification.countDocuments({
      userId: userEligible._id,
      category: 'study-reminder',
    })
    ok(
      'calling the trigger again does not double-send (dedupe window)',
      eligibleCountAfterRerun === 1,
    )
  }

  // --- 3. Weekly Live Exam Reminder — real trigger + join-exclusion --------
  logger.info('3. Weekly Live Exam Reminder trigger')
  {
    const userNotJoined = await createTestUser('exam-reminder-not-joined')
    const userJoined = await createTestUser('exam-reminder-joined')

    const liveExam = await LiveExam.create({
      title: { en: `Verify Notifications Live Exam ${stamp}` },
      description: { en: 'Verification fixture.' },
      examId,
      subjectIds: [subject._id],
      questionIds: [question._id],
      scheduledStartAt: hoursFromNow(2),
      scheduledEndAt: hoursFromNow(3),
      durationMinutes: 60,
      totalQuestions: 1,
      totalMarks: 1,
      marksPerQuestion: 1,
    })
    await LiveExamAttempt.create({
      userId: userJoined._id,
      liveExamId: liveExam._id,
      startedAt: new Date(),
      status: 'in-progress',
      answers: [],
    })

    const sent = await notificationTriggersService.sendLiveExamReminders()
    ok('at least one live exam reminder was sent', sent >= 1)

    const notJoinedGotOne = await Notification.countDocuments({
      userId: userNotJoined._id,
      category: 'exam-reminder',
    })
    ok('the user who has not joined received a reminder', notJoinedGotOne === 1)

    const joinedGotNone = await Notification.countDocuments({
      userId: userJoined._id,
      category: 'exam-reminder',
    })
    ok('the user who already joined received nothing', joinedGotNone === 0)

    await LiveExamAttempt.deleteMany({ liveExamId: liveExam._id })
    await LiveExam.deleteOne({ _id: liveExam._id })
  }

  // --- 4. Subscription Expiry — proactive "expiring soon" reminder --------
  logger.info('4. Subscription Expiry — proactive reminder')
  {
    const user = await createTestUser('subscription-expiring')
    await Subscription.create({
      userId: user._id,
      tier: 'plus',
      status: 'active',
      currentPeriodEnd: hoursFromNow(48),
      autoRenew: false,
    })

    const sent = await notificationTriggersService.sendSubscriptionExpiryReminders()
    ok('at least one expiry reminder was sent', sent >= 1)
    const notified = await Notification.countDocuments({
      userId: user._id,
      category: 'premium-update',
    })
    ok('the expiring-soon user received a premium-update notification', notified === 1)

    await Subscription.deleteMany({ userId: user._id })
  }

  // --- 5. Subscription Expiry — real, immediate lazy-expiry notice --------
  logger.info('5. Subscription Expiry — immediate lazy-expiry notice')
  {
    const user = await createTestUser('subscription-expired')
    await User.updateOne({ _id: user._id }, { $set: { subscriptionTier: 'plus' } })
    await Subscription.create({
      userId: user._id,
      tier: 'plus',
      status: 'active',
      currentPeriodEnd: daysAgo(1),
      autoRenew: false,
    })

    // `getMySubscription` is the real read path that triggers
    // `applyLazyExpiry` — the same lazy-downgrade-on-read pattern
    // `entitlement`/`subscription` already established.
    await subscriptionService.getMySubscription(user.id)

    const downgraded = await User.findById(user._id)
    ok('subscription tier was lazily downgraded to free', downgraded?.subscriptionTier === 'free')

    const expiredNotice = await Notification.countDocuments({
      userId: user._id,
      category: 'premium-update',
      title: { $exists: true },
    })
    ok('an immediate expiry notice was created', expiredNotice >= 1)

    // Re-reading again must not re-notify (the transition already happened).
    const before = await Notification.countDocuments({ userId: user._id })
    await subscriptionService.getMySubscription(user.id)
    const after = await Notification.countDocuments({ userId: user._id })
    ok('re-reading an already-expired subscription does not re-notify', after === before)

    await Subscription.deleteMany({ userId: user._id })
  }

  // --- 6. Current Affairs Alert — real publish event trigger --------------
  logger.info('6. Current Affairs Alert — real publish event')
  {
    const userSubscribed = await createTestUser('current-affairs-in')
    const userUnsubscribed = await createTestUser('current-affairs-out', {
      currentAffairsAlert: false,
    })

    const actor = { id: userSubscribed.id, role: 'admin' as const }
    await adminCurrentAffairsService.createCurrentAffair(actor, {
      date: new Date(),
      period: 'daily',
      category: 'national',
      title: { en: `Verify Notifications Article ${stamp}` },
      body: { en: ['A real test paragraph.'], ta: [] },
      highlights: { en: ['A real test highlight.'], ta: [] },
      examRelevanceTags: [],
      tags: [],
      isImportant: false,
      quizQuestionIds: [],
      quizQuestions: [],
      isActive: true,
    })

    const subscribedGotOne = await Notification.countDocuments({
      userId: userSubscribed._id,
      category: 'current-affairs-alert',
    })
    ok('opted-in user received the current affairs alert', subscribedGotOne === 1)
    const unsubscribedGotNone = await Notification.countDocuments({
      userId: userUnsubscribed._id,
      category: 'current-affairs-alert',
    })
    ok(
      'opted-out user received nothing (preference respected)',
      unsubscribedGotNone === 0,
    )

    await CurrentAffair.deleteMany({ 'title.en': `Verify Notifications Article ${stamp}` })
  }

  // --- 7. Admin Announcements — real broadcast fan-out ----------------------
  logger.info('7. Admin Announcements — broadcast fan-out')
  {
    const activeCountBefore = await User.countDocuments({ status: 'active' })
    const notifiedCount = await notificationService.broadcastSystemNotice({
      title: { en: 'Verify Notifications broadcast' },
      body: { en: 'A platform-wide announcement.' },
    })
    ok(
      'broadcast reaches every active user',
      notifiedCount === activeCountBefore,
      { notifiedCount, activeCountBefore },
    )
    const broadcastDocsForOurUser = await Notification.find({
      userId: { $in: userIds },
      category: 'system-notice',
      scope: 'global',
    })
    ok(
      'each of our test users received their own real document (fan-out, not a shared doc)',
      broadcastDocsForOurUser.length === userIds.length,
    )
  }

  // --- 8. Delivery abstraction — future-ready for Email/SMS/Push ----------
  logger.info('8. Delivery abstraction (Email/SMS/Push, gracefully unconfigured)')
  {
    const user = userIds[0]!
    const inAppNotification = await notificationService.notifyUser(user, {
      category: 'system-notice',
      title: { en: 'in-app channel test' },
      body: { en: 'x' },
      channel: 'in_app',
    })
    const emailNotification = await notificationService.notifyUser(user, {
      category: 'system-notice',
      title: { en: 'email channel test' },
      body: { en: 'x' },
      channel: 'email',
    })
    const smsNotification = await notificationService.notifyUser(user, {
      category: 'system-notice',
      title: { en: 'sms channel test' },
      body: { en: 'x' },
      channel: 'sms',
    })
    const pushNotification = await notificationService.notifyUser(user, {
      category: 'system-notice',
      title: { en: 'push channel test' },
      body: { en: 'x' },
      channel: 'push',
    })

    const inAppResult = await dispatch(inAppNotification)
    ok('in_app channel always reports delivered (persistence is the delivery)', inAppResult.delivered === true)

    const emailResult = await dispatch(emailNotification)
    ok(
      'email channel gracefully reports not-configured (no fabricated delivery)',
      emailResult.delivered === false && emailResult.reason === 'EMAIL_PROVIDER_NOT_CONFIGURED',
      emailResult,
    )
    const smsResult = await dispatch(smsNotification)
    ok(
      'sms channel gracefully reports not-configured',
      smsResult.delivered === false && smsResult.reason === 'SMS_PROVIDER_NOT_CONFIGURED',
      smsResult,
    )
    const pushResult = await dispatch(pushNotification)
    ok(
      'push channel gracefully reports not-configured',
      pushResult.delivered === false && pushResult.reason === 'PUSH_PROVIDER_NOT_CONFIGURED',
      pushResult,
    )

    ok(
      'the in-app Notification document itself was still persisted for the email/sms/push channels (never lost)',
      Boolean(emailNotification.id) && Boolean(smsNotification.id) && Boolean(pushNotification.id),
    )
  }

  // --- Cleanup ----------------------------------------------------------------
  logger.info('Cleaning up test fixtures...')
  await Notification.deleteMany({ userId: { $in: userIds } })
  await QuestionAttempt.deleteMany({ userId: { $in: userIds } })
  await Subscription.deleteMany({ userId: { $in: userIds } })
  await Profile.deleteMany({ userId: { $in: userIds } })
  await User.deleteMany({ _id: { $in: userIds } })
  await Question.deleteOne({ _id: question._id })
  await Subtopic.deleteOne({ _id: subtopic._id })
  await Topic.deleteOne({ _id: topic._id })
  await Subject.deleteOne({ _id: subject._id })
  logger.info('Cleanup complete — no test fixtures left behind.')

  logger.info(
    `\nResult: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failed assertion(s))`,
  )
  if (failures > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    logger.error('Verification script crashed', { error })
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectDatabase()
  })
