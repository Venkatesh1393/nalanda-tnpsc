import { connectDatabase, disconnectDatabase } from '../config/database'
import { GAMIFICATION_CONFIG } from '../config/gamification.config'
import { logger } from '../config/logger'
import { Achievement } from '../models/Achievement.model'
import { CurrentAffair } from '../models/CurrentAffair.model'
import { CurrentAffairRead } from '../models/CurrentAffairRead.model'
import { Exam } from '../models/Exam.model'
import { LearningProgress } from '../models/LearningProgress.model'
import { LiveExam } from '../models/LiveExam.model'
import { LiveExamAttempt } from '../models/LiveExamAttempt.model'
import { PracticeSession } from '../models/PracticeSession.model'
import { Profile } from '../models/Profile.model'
import { Question, type QuestionDocument } from '../models/Question.model'
import { QuestionAttempt } from '../models/QuestionAttempt.model'
import { Subject, type SubjectDocument } from '../models/Subject.model'
import { Subtopic, type SubtopicDocument } from '../models/Subtopic.model'
import { Topic, type TopicDocument } from '../models/Topic.model'
import { User } from '../models/User.model'
import { XpTransaction } from '../models/XpTransaction.model'
import * as currentAffairService from '../services/currentAffair.service'
import * as gamificationService from '../services/gamification.service'
import * as leaderboardService from '../services/leaderboard.service'
import * as learningProgressService from '../services/learningProgress.service'
import * as liveExamService from '../services/liveExam.service'
import * as practiceService from '../services/practice.service'
import { getDashboard } from '../services/dashboard.service'

/**
 * Sprint 4 Step 61 — Gamification System (XP, Coins, Daily Streak,
 * Achievements, Badges, Level System). Manual end-to-end verification
 * (`npm run verify:gamification`), same pattern as `verifyAdaptivePractice.ts`/
 * `verifyAiTutor.ts` — no test runner installed (see `backend/tests/
 * README.md`). Exercises real writes against the live database with
 * disposable fixtures, asserts on real query results and real service
 * output, and deletes every fixture it created before exiting.
 *
 * Leaderboard (Weekly/Monthly/Overall) already existed before this step
 * (`services/leaderboard.service.ts`, live-aggregated) — this script only
 * sanity-checks it still works, it doesn't re-verify logic this step didn't
 * touch.
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
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS)
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
    slug: `verify-gamification-${stamp}`,
    name: { en: `Verify Gamification Subject ${stamp}` },
    examIds: [examId],
    isActive: true,
  })
  const topic: TopicDocument = await Topic.create({
    slug: `verify-gamification-topic-${stamp}`,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `Verify Gamification Topic ${stamp}` },
    isActive: true,
  })
  const subtopic: SubtopicDocument = await Subtopic.create({
    slug: `verify-gamification-subtopic-${stamp}`,
    topicId: topic._id,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `Verify Gamification Subtopic ${stamp}` },
    isActive: true,
  })

  async function createQuestion(): Promise<QuestionDocument> {
    return Question.create({
      examIds: [examId],
      subjectId: subject._id,
      topicId: topic._id,
      subtopicId: subtopic._id,
      questionText: { en: `Verify gamification question ${stamp} ${Math.random()}` },
      options: [
        { optionId: 'A', text: { en: 'Correct option' }, isCorrect: true },
        { optionId: 'B', text: { en: 'Wrong option' }, isCorrect: false },
      ],
      difficulty: 'easy',
      source: 'curated',
      isActive: true,
    })
  }
  // 5 distinct questions — enough for a fully-correct 5-question session
  // (the Perfect Score achievement's own minimum sample size).
  const questions = await Promise.all(Array.from({ length: 5 }, () => createQuestion()))

  async function createTestUser(
    label: string,
    subscriptionTier: 'free' | 'plus' = 'free',
  ): Promise<{ id: string }> {
    const user = await User.create({
      firebaseUid: `verify-gamification-${label}-${stamp}`,
      email: `verify-gamification-${label}-${stamp}@test.local`,
      authProvider: 'email_password',
      subscriptionTier,
    })
    await Profile.create({
      userId: user._id,
      name: `Verify Gamification — ${label}`,
      examGoals: [{ examId: examId, isPrimary: true }],
    })
    userIds.push(user.id)
    return { id: user.id }
  }

  logger.info('Sprint 4 Step 61 — Gamification System verification')

  // --- 1. Practice completion: real XP/coins formula, First Practice +
  // Perfect Score achievements, idempotent re-finish ------------------------
  logger.info('1. Practice completion — XP/coins formula, achievements, idempotency')
  {
    const user = await createTestUser('practice')
    const session = await practiceService.createSession(
      user.id,
      {
        subjectSlug: subject.slug,
        topicSlug: topic.slug,
        questionCount: 5,
        difficulty: 'all',
      },
      'en',
    )
    ok('session has the expected 5 questions', session.questions.length === 5)

    for (const question of session.questions) {
      await practiceService.submitAnswer(
        user.id,
        session.id,
        { questionId: question.id, selectedOptionId: 'A', responseTime: 10 },
        'en',
      )
    }

    const expectedXp =
      5 * GAMIFICATION_CONFIG.xp.practicePerQuestionAnswered +
      5 * GAMIFICATION_CONFIG.xp.practicePerCorrectBonus +
      GAMIFICATION_CONFIG.xp.practiceSessionCompletionBonus
    const expectedCoins =
      5 * GAMIFICATION_CONFIG.coins.practicePerCorrectAnswer +
      GAMIFICATION_CONFIG.coins.practiceSessionCompletionBonus

    const result = await practiceService.finishSession(user.id, session.id, 'en')
    ok('xpAwarded matches the documented formula exactly', result.xpAwarded === expectedXp, {
      expectedXp,
      got: result.xpAwarded,
    })
    ok('coinsAwarded matches the documented formula exactly', result.coinsAwarded === expectedCoins)

    const profileDoc = await Profile.findOne({ userId: user.id })
    ok('Profile.xp reflects the award', profileDoc?.xp === expectedXp)
    ok('Profile.coins reflects the award', profileDoc?.coins === expectedCoins)

    const ledgerRows = await XpTransaction.find({ reason: 'practice_completion' }).sort({
      createdAt: -1,
    })
    const myLedgerRow = ledgerRows.find((row) => row.userId.toString() === user.id)
    ok('an XpTransaction audit row was written', Boolean(myLedgerRow))
    ok('ledger row amount matches the award', myLedgerRow?.xpAmount === expectedXp)

    const unlockedCodes = result.newlyUnlockedAchievements.map((a) => a.code)
    ok('First Practice achievement unlocked', unlockedCodes.includes('first-practice'))
    ok('Perfect Score achievement unlocked (5/5, >= min sample size)', unlockedCodes.includes('perfect-score'))

    const achievementDocs = await Achievement.find({ userId: user.id })
    ok(
      'both achievements persisted in the Achievement collection',
      achievementDocs.some((a) => a.badgeCode === 'first-practice') &&
        achievementDocs.some((a) => a.badgeCode === 'perfect-score'),
    )

    // Idempotency — resubmitting an already-submitted session must never
    // double-award XP or re-unlock the same achievements.
    const xpBeforeRefetch = profileDoc!.xp
    const refetched = await practiceService.finishSession(user.id, session.id, 'en')
    const profileAfterRefetch = await Profile.findOne({ userId: user.id })
    ok(
      'resubmitting an already-submitted session does not double-award XP',
      profileAfterRefetch?.xp === xpBeforeRefetch,
    )
    ok(
      'resubmitting reports no newly-unlocked achievements',
      refetched.newlyUnlockedAchievements.length === 0,
    )
    const ledgerCountAfter = await XpTransaction.countDocuments({
      userId: user.id,
      reason: 'practice_completion',
    })
    ok('resubmitting did not write a second ledger row', ledgerCountAfter === 1)
  }

  // --- 2. Daily streak — increments, resets on a gap, never double-counts
  // the same day; 7-day and 30-day streak achievements -----------------------
  logger.info('2. Daily streak progression + streak achievements')
  {
    const user = await createTestUser('streak')

    // Day 1.
    await gamificationService.awardXp(user.id, {
      reason: 'lesson_completion',
      xpAmount: 1,
      coinsAmount: 0,
    })
    let profile = await Profile.findOne({ userId: user.id })
    ok('streak starts at 1 after the first award', profile?.streak.current === 1)

    // A second award the same real day must not double-count.
    await gamificationService.awardXp(user.id, {
      reason: 'lesson_completion',
      xpAmount: 1,
      coinsAmount: 0,
    })
    profile = await Profile.findOne({ userId: user.id })
    ok('a second award the same day does not increment the streak again', profile?.streak.current === 1)

    // Simulate 6 more consecutive days by back-dating lastActiveDate to
    // "yesterday" before each award — the same technique
    // `verifyAdaptivePractice.ts` used to control `attemptedAt` directly.
    for (let day = 2; day <= 7; day++) {
      await Profile.updateOne({ userId: user.id }, { $set: { 'streak.lastActiveDate': daysAgo(1) } })
      await gamificationService.awardXp(user.id, {
        reason: 'lesson_completion',
        xpAmount: 1,
        coinsAmount: 0,
      })
    }
    profile = await Profile.findOne({ userId: user.id })
    ok('streak reached exactly 7 after 7 simulated consecutive days', profile?.streak.current === 7)
    ok('longest streak tracks current when it is the best run', profile?.streak.longest === 7)

    let earnedCodes = (await Achievement.find({ userId: user.id })).map((a) => a.badgeCode)
    ok('7-Day Streak achievement unlocked at streak = 7', earnedCodes.includes('seven-day-streak'))
    ok('30-Day Streak not yet unlocked at streak = 7', !earnedCodes.includes('thirty-day-streak'))

    // A gap of several days resets the streak to 1, not 0 (today counts).
    await Profile.updateOne({ userId: user.id }, { $set: { 'streak.lastActiveDate': daysAgo(5) } })
    await gamificationService.awardXp(user.id, {
      reason: 'lesson_completion',
      xpAmount: 1,
      coinsAmount: 0,
    })
    profile = await Profile.findOne({ userId: user.id })
    ok('a multi-day gap resets current streak to 1 (today still counts)', profile?.streak.current === 1)
    ok('longest streak is preserved through the reset', profile?.streak.longest === 7)

    // Fast-forward to 30 by repeating the back-date trick.
    for (let day = 2; day <= 30; day++) {
      await Profile.updateOne({ userId: user.id }, { $set: { 'streak.lastActiveDate': daysAgo(1) } })
      await gamificationService.awardXp(user.id, {
        reason: 'lesson_completion',
        xpAmount: 1,
        coinsAmount: 0,
      })
    }
    profile = await Profile.findOne({ userId: user.id })
    ok('streak reached 30 after simulating 30 consecutive days', profile?.streak.current === 30)
    earnedCodes = (await Achievement.find({ userId: user.id })).map((a) => a.badgeCode)
    ok('30-Day Streak achievement unlocked at streak = 30', earnedCodes.includes('thirty-day-streak'))
  }

  // --- 3. Level system — pure-function check across the documented curve ---
  logger.info('3. Level system (pure-function check)')
  {
    const cases: { xp: number; expectedLevel: number }[] = [
      { xp: 0, expectedLevel: 1 },
      { xp: 99, expectedLevel: 1 },
      { xp: 100, expectedLevel: 2 },
      { xp: 399, expectedLevel: 2 },
      { xp: 400, expectedLevel: 3 },
      { xp: 899, expectedLevel: 3 },
      { xp: 900, expectedLevel: 4 },
    ]
    for (const { xp, expectedLevel } of cases) {
      const info = gamificationService.getLevelInfo(xp)
      ok(`xp=${xp} resolves to level ${expectedLevel}`, info.level === expectedLevel, info)
    }
    const midLevel = gamificationService.getLevelInfo(250)
    ok(
      'progressPercent reflects real progress within the current level',
      midLevel.level === 2 && midLevel.xpIntoLevel === 150 && midLevel.progressPercent === 50,
      midLevel,
    )
    const maxed = gamificationService.getLevelInfo(10_000_000)
    ok('an extreme XP value caps at maxLevel, never exceeds it', maxed.isMaxLevel && maxed.level === GAMIFICATION_CONFIG.level.maxLevel)
  }

  // --- 4. Question-count milestone achievements (100 Questions) ------------
  logger.info('4. 100 Questions milestone achievement')
  {
    const user = await createTestUser('question-count')
    await QuestionAttempt.insertMany(
      Array.from({ length: 100 }, (_, i) => ({
        userId: user.id,
        questionId: questions[i % questions.length]!._id,
        mode: 'quiz' as const,
        selectedOptionId: 'A',
        isCorrect: true,
        timeTakenSeconds: 5,
      })),
    )
    // Any award triggers a fresh achievement check against real current data.
    await gamificationService.awardXp(user.id, {
      reason: 'current_affairs_reading',
      xpAmount: 1,
      coinsAmount: 0,
    })
    const earnedCodes = (await Achievement.find({ userId: user.id })).map((a) => a.badgeCode)
    ok('100 Questions achievement unlocked at exactly 100 attempts', earnedCodes.includes('hundred-questions'))
    ok('500 Questions not unlocked yet at 100 attempts', !earnedCodes.includes('five-hundred-questions'))
  }

  // --- 5. Lesson completion — XP once, idempotent on re-save, Fast Learner -
  logger.info('5. Lesson completion — XP once per subtopic, Fast Learner achievement')
  {
    const user = await createTestUser('lesson')
    const subtopics: SubtopicDocument[] = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        Subtopic.create({
          slug: `verify-gamification-fastlearner-${stamp}-${i}`,
          topicId: topic._id,
          subjectId: subject._id,
          examIds: [examId],
          name: { en: `Fast Learner Subtopic ${stamp} ${i}` },
          isActive: true,
        }),
      ),
    )

    await learningProgressService.updateProgress(user.id, subtopics[0]!.slug, {
      status: 'completed',
    })
    let profile = await Profile.findOne({ userId: user.id })
    ok(
      'lesson completion XP awarded exactly once (real, non-zero)',
      profile?.xp === GAMIFICATION_CONFIG.xp.lessonCompletion,
    )

    // Re-saving the same already-completed subtopic must never re-award.
    await learningProgressService.updateProgress(user.id, subtopics[0]!.slug, {
      status: 'completed',
    })
    profile = await Profile.findOne({ userId: user.id })
    ok(
      're-marking an already-completed subtopic does not re-award XP',
      profile?.xp === GAMIFICATION_CONFIG.xp.lessonCompletion,
    )

    for (let i = 1; i < 5; i++) {
      await learningProgressService.updateProgress(user.id, subtopics[i]!.slug, {
        status: 'completed',
      })
    }
    profile = await Profile.findOne({ userId: user.id })
    ok(
      'lesson XP accrued for every distinct completed subtopic (5x)',
      profile?.xp === GAMIFICATION_CONFIG.xp.lessonCompletion * 5,
    )
    const earnedCodes = (await Achievement.find({ userId: user.id })).map((a) => a.badgeCode)
    ok(
      'Fast Learner achievement unlocked after 5 lessons completed in one day',
      earnedCodes.includes('fast-learner'),
    )

    await Subtopic.deleteMany({ _id: { $in: subtopics.map((s) => s._id) } })
  }

  // --- 6. Current Affairs reading — XP once, idempotent on re-read ---------
  logger.info('6. Current Affairs reading — XP once per article')
  {
    const user = await createTestUser('current-affairs')
    const article = await CurrentAffair.create({
      date: new Date(),
      period: 'daily',
      category: 'national',
      title: { en: `Verify Gamification Article ${stamp}` },
      body: { en: ['A real test paragraph.'] },
      highlights: { en: ['A real test highlight.'] },
      isActive: true,
    })

    const first = await currentAffairService.markAsRead(user.id, article.id)
    ok('first read is not flagged as already-read', first.alreadyRead === false)
    let profile = await Profile.findOne({ userId: user.id })
    ok(
      'current affairs reading XP awarded on first read',
      profile?.xp === GAMIFICATION_CONFIG.xp.currentAffairsReading,
    )

    const second = await currentAffairService.markAsRead(user.id, article.id)
    ok('re-reading the same article is flagged as already-read', second.alreadyRead === true)
    profile = await Profile.findOne({ userId: user.id })
    ok('re-reading the same article does not re-award XP', profile?.xp === GAMIFICATION_CONFIG.xp.currentAffairsReading)

    const readCount = await CurrentAffairRead.countDocuments({ userId: user.id })
    ok('exactly one CurrentAffairRead document persisted (unique index holds)', readCount === 1)

    await CurrentAffair.deleteOne({ _id: article._id })
  }

  // --- 7. Weekly Live Exam participation — real join/answer/finish flow ----
  logger.info('7. Weekly Live Exam participation — real join/answer/finish flow')
  {
    const user = await createTestUser('live-exam', 'plus')
    const liveExam = await LiveExam.create({
      title: { en: `Verify Gamification Live Exam ${stamp}` },
      description: { en: 'Verification fixture.' },
      examId: examId,
      subjectIds: [subject._id],
      questionIds: questions.map((q) => q._id),
      scheduledStartAt: daysAgo(0.01), // a few minutes ago
      scheduledEndAt: new Date(Date.now() + 60 * 60_000), // an hour from now
      durationMinutes: 60,
      totalQuestions: questions.length,
      totalMarks: questions.length,
      marksPerQuestion: 1,
    })

    await liveExamService.joinLiveExam(user.id, liveExam.id, 'plus', 'en')
    for (const question of questions) {
      await liveExamService.submitAnswer(user.id, liveExam.id, {
        questionId: question.id,
        selectedOptionId: 'A',
      })
    }
    const finished = await liveExamService.finishAttempt(user.id, liveExam.id)
    ok('live exam attempt reports submitted status', finished.status === 'submitted')

    const profile = await Profile.findOne({ userId: user.id })
    ok(
      'live exam participation XP awarded',
      profile?.xp === GAMIFICATION_CONFIG.xp.liveExamParticipation,
    )
    ok(
      'live exam participation coins awarded',
      profile?.coins === GAMIFICATION_CONFIG.coins.liveExamParticipation,
    )

    // Idempotent — finishing an already-submitted attempt again must not
    // double-award.
    await liveExamService.finishAttempt(user.id, liveExam.id)
    const profileAfter = await Profile.findOne({ userId: user.id })
    ok('re-finishing an already-submitted attempt does not double-award', profileAfter?.xp === profile?.xp)

    await LiveExamAttempt.deleteMany({ liveExamId: liveExam._id })
    await LiveExam.deleteOne({ _id: liveExam._id })
  }

  // --- 8. Dashboard wiring — real xp/coins/level/streak/achievements -------
  logger.info('8. Dashboard wiring reflects real gamification state')
  {
    const user = await createTestUser('dashboard')
    await gamificationService.awardXp(user.id, {
      reason: 'lesson_completion',
      xpAmount: 150,
      coinsAmount: 10,
    })
    const dashboard = await getDashboard(user.id, 'en')
    ok('dashboard xp matches the real award', dashboard.xp === 150)
    ok('dashboard coins matches the real award', dashboard.coins === 10)
    ok('dashboard level reflects the real xp (150 -> level 2)', dashboard.level === 2)
    ok('dashboard streak.current is real (1), not the old permanent 0 stub', dashboard.streak.current === 1)
    ok(
      'dashboard achievements is the full 8-badge catalog, not an empty stub',
      dashboard.achievements.length === 8,
    )
    ok(
      'no achievement reads as earned yet for a user with only lesson XP',
      dashboard.achievements.every((a) => !a.earned),
    )
  }

  // --- 9. Leaderboard sanity — already real before this step, still works --
  logger.info('9. Leaderboard sanity check (pre-existing, unmodified by this step)')
  {
    const overall = await leaderboardService.getLeaderboard('overall', 5)
    const weekly = await leaderboardService.getLeaderboard('weekly', 5)
    const monthly = await leaderboardService.getLeaderboard('monthly', 5)
    ok('overall leaderboard call succeeds', Array.isArray(overall))
    ok('weekly leaderboard call succeeds', Array.isArray(weekly))
    ok('monthly leaderboard call succeeds', Array.isArray(monthly))
  }

  // --- Cleanup ----------------------------------------------------------------
  logger.info('Cleaning up test fixtures...')
  await QuestionAttempt.deleteMany({ userId: { $in: userIds } })
  await PracticeSession.deleteMany({ userId: { $in: userIds } })
  await LearningProgress.deleteMany({ userId: { $in: userIds } })
  await XpTransaction.deleteMany({ userId: { $in: userIds } })
  await Achievement.deleteMany({ userId: { $in: userIds } })
  await CurrentAffairRead.deleteMany({ userId: { $in: userIds } })
  await Profile.deleteMany({ userId: { $in: userIds } })
  await User.deleteMany({ _id: { $in: userIds } })
  await Question.deleteMany({ _id: { $in: questions.map((q) => q._id) } })
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
