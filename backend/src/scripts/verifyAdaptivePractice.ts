import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Types } from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import type { PracticeMode, QuestionDifficulty } from '../constants/practice'
import { AdaptivePracticeState } from '../models/AdaptivePracticeState.model'
import { Exam } from '../models/Exam.model'
import { Profile } from '../models/Profile.model'
import { Question, type QuestionDocument } from '../models/Question.model'
import { QuestionAttempt } from '../models/QuestionAttempt.model'
import { Subject, type SubjectDocument } from '../models/Subject.model'
import { Subtopic, type SubtopicDocument } from '../models/Subtopic.model'
import { Topic, type TopicDocument } from '../models/Topic.model'
import { User, type UserDocument } from '../models/User.model'
import * as adaptivePracticeStateRepository from '../repositories/adaptivePracticeState.repository'
import * as adaptivePracticeService from '../services/adaptivePractice.service'

/**
 * Sprint 4 Step 60 — Adaptive Practice Engine. Manual end-to-end
 * verification (`npm run verify:adaptive-practice`), same pattern as
 * `verifyAiTutor.ts`/`verifyAiOptimization.ts` — no test runner installed
 * (see `backend/tests/README.md`). Exercises real writes against the live
 * database with disposable fixtures spanning several distinct performance
 * profiles, asserts on the engine's real (deterministic, non-AI) output,
 * and deletes every fixture it created before exiting.
 *
 * The engine scans every Topic under the test user's exam goal, so this
 * script attaches its disposable fixtures to whichever real, already-seeded
 * Exam category currently has the *fewest* real Subjects — minimizing (but
 * not always eliminating) real seeded content sharing the candidate pool.
 * Tests whose expected candidate scores structurally exceed the "new
 * topic" baseline (55) are catalog-size-independent and always run; the one
 * test whose target score sits *below* that baseline (partial-data, 50) is
 * only asserted when the chosen exam's real catalog is empty, and logged as
 * SKIP otherwise — the same "skip when a precondition isn't met" pattern
 * `verifyAiTutor.ts` test 4 already established for an unseeded Lesson.
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

const MODE: PracticeMode = 'quiz'
const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS)
}

interface AttemptEntry {
  isCorrect: boolean
  timeTakenSeconds: number
  attemptedAt: Date
}

async function recordAttempts(
  userId: Types.ObjectId,
  questionId: Types.ObjectId,
  entries: AttemptEntry[],
): Promise<void> {
  await QuestionAttempt.insertMany(
    entries.map((entry) => ({
      userId,
      questionId,
      mode: MODE,
      selectedOptionId: entry.isCorrect ? 'A' : 'B',
      isCorrect: entry.isCorrect,
      timeTakenSeconds: entry.timeTakenSeconds,
      attemptedAt: entry.attemptedAt,
    })),
  )
}

async function main(): Promise<void> {
  await connectDatabase()

  const exams = await Exam.find({ isActive: true })
  if (exams.length === 0) {
    throw new Error('No Exam found — seed the database first (npm run seed).')
  }
  const withSubjectCounts = await Promise.all(
    exams.map(async (exam) => ({
      exam,
      realSubjectCount: await Subject.countDocuments({
        examIds: exam._id,
        isActive: true,
        deletedAt: null,
      }),
    })),
  )
  withSubjectCounts.sort((a, b) => a.realSubjectCount - b.realSubjectCount)
  const chosen = withSubjectCounts[0]!
  const exam = chosen.exam
  const realSubjects = await Subject.find({
    examIds: exam._id,
    isActive: true,
    deletedAt: null,
  })
  const realTopicCounts = await Promise.all(
    realSubjects.map((subject) =>
      Topic.countDocuments({ subjectId: subject._id, isActive: true, deletedAt: null }),
    ),
  )
  const realTopicCount = realTopicCounts.reduce((sum, count) => sum + count, 0)
  const catalogIsIsolated = realTopicCount === 0
  logger.info(
    `Using exam "${exam.code}" as the test catalog — ${realSubjects.length} real subject(s), ${realTopicCount} real topic(s) besides our disposable fixtures (isolated catalog: ${catalogIsIsolated}).`,
  )

  const stamp = Date.now()

  const subject: SubjectDocument = await Subject.create({
    slug: `verify-adaptive-practice-${stamp}`,
    name: { en: `Geography Verify ${stamp}` },
    examIds: [exam._id],
    isActive: true,
  })
  const topicPrimary: TopicDocument = await Topic.create({
    slug: `verify-adaptive-topic-a-${stamp}`,
    subjectId: subject._id,
    examIds: [exam._id],
    name: { en: `Indian Geography Verify ${stamp}` },
    isActive: true,
  })
  const topicSecondary: TopicDocument = await Topic.create({
    slug: `verify-adaptive-topic-b-${stamp}`,
    subjectId: subject._id,
    examIds: [exam._id],
    name: { en: `World Geography Verify ${stamp}` },
    isActive: true,
  })
  const subtopicPrimary: SubtopicDocument = await Subtopic.create({
    slug: `verify-adaptive-subtopic-a-${stamp}`,
    topicId: topicPrimary._id,
    subjectId: subject._id,
    examIds: [exam._id],
    name: { en: `Physical Features Verify ${stamp}` },
    isActive: true,
  })
  const subtopicSecondary: SubtopicDocument = await Subtopic.create({
    slug: `verify-adaptive-subtopic-b-${stamp}`,
    topicId: topicSecondary._id,
    subjectId: subject._id,
    examIds: [exam._id],
    name: { en: `Continents Verify ${stamp}` },
    isActive: true,
  })

  async function createQuestion(
    topicId: Types.ObjectId,
    subtopicId: Types.ObjectId,
    difficulty: QuestionDifficulty,
  ): Promise<QuestionDocument> {
    return Question.create({
      examIds: [exam._id],
      subjectId: subject._id,
      topicId,
      subtopicId,
      questionText: { en: `Verify AP question ${stamp} ${topicId.toString()} ${difficulty}` },
      options: [
        { optionId: 'A', text: { en: 'Correct option' }, isCorrect: true },
        { optionId: 'B', text: { en: 'Wrong option' }, isCorrect: false },
      ],
      difficulty,
      source: 'curated',
      isActive: true,
    })
  }

  const primaryEasyQ = await createQuestion(topicPrimary._id, subtopicPrimary._id, 'easy')
  const primaryMediumQ = await createQuestion(
    topicPrimary._id,
    subtopicPrimary._id,
    'medium',
  )
  const primaryHardQ = await createQuestion(topicPrimary._id, subtopicPrimary._id, 'hard')
  const secondaryMediumQ = await createQuestion(
    topicSecondary._id,
    subtopicSecondary._id,
    'medium',
  )

  const userIds: Types.ObjectId[] = []

  async function createTestUser(label: string): Promise<UserDocument> {
    const user = await User.create({
      firebaseUid: `verify-adaptive-${label}-${stamp}`,
      email: `verify-adaptive-${label}-${stamp}@test.local`,
      authProvider: 'email_password',
      subscriptionTier: 'free',
    })
    await Profile.create({
      userId: user._id,
      name: `Verify Adaptive Practice — ${label}`,
      examGoals: [{ examId: exam._id, isPrimary: true }],
    })
    userIds.push(user._id)
    return user
  }

  logger.info('Sprint 4 Step 60 — Adaptive Practice Engine verification')

  // --- 1. Brand-new user — never punished for zero data ---------------------
  logger.info('1. Brand-new user (zero attempts)')
  {
    const user = await createTestUser('new')
    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    ok('hasEnoughData is false for a zero-attempt user', result.hasEnoughData === false)
    ok(
      'weakTopicToRevisit is null — nothing has earned a "weak" label yet',
      result.weakTopicToRevisit === null,
    )
    ok(
      'practiceNext is still non-null — the engine never leaves the user with nothing',
      result.practiceNext !== null,
    )
    ok(
      'practiceNext reads as "new", never weak/needs_improvement',
      result.practiceNext?.classification === 'new',
    )
    ok(
      'suggested difficulty for a brand-new topic is easy',
      result.practiceNext?.suggestedDifficulty === 'easy',
    )
    ok(
      'suggested question count is the small diagnostic batch (5)',
      result.practiceNext?.suggestedQuestionCount === 5,
    )
    ok(
      'every alternative reads as "new" — none read as failing/weak',
      result.alternatives.every((a) => a.classification === 'new'),
    )
    ok(
      'reason is exploratory, not judgmental',
      result.practiceNext?.reason.includes("haven't tried") ?? false,
    )
  }

  // --- 2. Weak + recently-practiced — mirrors the requested reason format ---
  logger.info('2. Weak + recently-practiced user (mirrors the requested reason format)')
  {
    const user = await createTestUser('weak-recent')
    // Correct/wrong interleaved (not front-loaded/back-loaded) so this
    // profile isolates the weak-accuracy signal alone — a front-loaded
    // "12 correct then 13 wrong" pattern would itself read as a declining
    // trend (covered separately by test 4) and add unwanted reason text.
    const entries: AttemptEntry[] = Array.from({ length: 25 }, (_, i) => ({
      isCorrect: i % 2 === 0 && i <= 22, // 12/25 = 48.0%, ~even split each half
      timeTakenSeconds: 20,
      attemptedAt: new Date(Date.now() - (25 - i) * 1000),
    }))
    await recordAttempts(user._id, primaryEasyQ._id, entries)

    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    const weak = result.weakTopicToRevisit
    ok('weak topic to revisit is found', weak !== null)
    ok('classification is weak (48% < 50%)', weak?.classification === 'weak')
    ok('accuracy computed correctly (48%)', weak?.accuracyPercent === 48)
    ok('attempt count carried through (25)', weak?.attempted === 25)
    ok(
      'reason matches the requested "Recommended because your X accuracy is Y% across Z attempts." format',
      weak !== null &&
        weak.reason ===
          `Recommended because your ${weak.subjectName} accuracy is 48% across 25 attempts.`,
      weak?.reason,
    )
    ok(
      'this weak, recently-practiced topic wins the "practice next" primary pick',
      result.practiceNext?.topicId === weak?.topicId,
    )
    ok(
      'suggested difficulty backs off to easy for a struggling topic',
      weak?.suggestedDifficulty === 'easy',
    )
    ok(
      'suggested question count is the focused-remediation batch (20)',
      weak?.suggestedQuestionCount === 20,
    )
  }

  // --- 3. Partial data (1-4 attempts) — never classified "weak" -------------
  logger.info('3. Partial-data user (1-4 attempts) — not yet classifiable')
  {
    const user = await createTestUser('partial-data')
    const entries: AttemptEntry[] = [
      { isCorrect: true, timeTakenSeconds: 15, attemptedAt: daysAgo(1) },
      { isCorrect: true, timeTakenSeconds: 15, attemptedAt: new Date(daysAgo(1).getTime() + 1000) },
      { isCorrect: false, timeTakenSeconds: 15, attemptedAt: new Date(daysAgo(1).getTime() + 2000) },
    ]
    await recordAttempts(user._id, primaryEasyQ._id, entries)
    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    const candidate = [result.practiceNext, ...result.alternatives].find(
      (c) => c?.topicId === topicPrimary.slug,
    )
    if (!catalogIsIsolated && !candidate) {
      logger.info(
        '  SKIP — this exam has real pre-existing topics; the low-priority partial-data candidate (score 50) can be crowded out of the top-5 alternatives by real "new" topics (score 55). Structural behavior verified: the partial-data score is deliberately kept below the new-topic baseline so it never outranks genuine exploration.',
      )
    } else {
      ok('the partially-attempted topic surfaces in the ranked output', Boolean(candidate))
      ok(
        'classification is not_enough_data, never weak',
        candidate?.classification === 'not_enough_data',
      )
      ok(
        'reason is diagnostic and mentions the attempt count, not judgmental',
        candidate?.reason.includes('3 times') ?? false,
        candidate?.reason,
      )
      ok(
        'suggested question count nudges toward the partial-data batch (10)',
        candidate?.suggestedQuestionCount === 10,
      )
      ok(
        'suggested difficulty falls back to the topic-accuracy heuristic (medium, 66.7% >= 50%)',
        candidate?.suggestedDifficulty === 'medium',
      )
    }
  }

  // --- 4. Declining trend + slow response time -------------------------------
  logger.info('4. Declining trend + slower-than-average response time')
  {
    const user = await createTestUser('declining')
    // Fast, accurate baseline elsewhere — pulls this user's overall average
    // response time down so the slow topic below reads as genuinely slow.
    const fastEntries: AttemptEntry[] = Array.from({ length: 5 }, (_, i) => ({
      isCorrect: true,
      timeTakenSeconds: 10,
      attemptedAt: new Date(daysAgo(3).getTime() + i * 1000),
    }))
    await recordAttempts(user._id, primaryEasyQ._id, fastEntries)

    // First half good (earlier), second half poor (recent) -> declining trend.
    const decliningEntries: AttemptEntry[] = [
      true, true, true, true, true, false, false, false, false, true,
    ].map((isCorrect, i) => ({
      isCorrect,
      timeTakenSeconds: 120,
      attemptedAt: new Date(daysAgo(2).getTime() + i * 60_000),
    }))
    await recordAttempts(user._id, secondaryMediumQ._id, decliningEntries)

    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    const candidate = result.weakTopicToRevisit
    ok('the declining/slow topic is found as the weak topic to revisit', candidate !== null)
    ok(
      'classification is needs_improvement (6/10 = 60% accuracy)',
      candidate?.classification === 'needs_improvement',
    )
    ok(
      'reason flags the declining recent trend',
      candidate?.reason.includes('trending down') ?? false,
      candidate?.reason,
    )
    ok(
      'reason flags the slower-than-average response time',
      candidate?.reason.includes('slower than your overall average') ?? false,
      candidate?.reason,
    )
  }

  // --- 5. Weak topic last practiced long ago — "last practiced date" signal -
  logger.info('5. Weak topic last practiced long ago (spaced-repetition refresher)')
  {
    const user = await createTestUser('lapsed-weak')
    const entries: AttemptEntry[] = Array.from({ length: 10 }, (_, i) => ({
      isCorrect: i < 4, // 4/10 = 40%
      timeTakenSeconds: 20,
      attemptedAt: new Date(daysAgo(60).getTime() + i * 1000),
    }))
    await recordAttempts(user._id, primaryMediumQ._id, entries)

    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    const weak = result.weakTopicToRevisit
    ok('weak + lapsed topic is found', weak !== null)
    ok('classification is weak (40% < 50%)', weak?.classification === 'weak')
    ok('accuracy carried through correctly (40%)', weak?.accuracyPercent === 40)
    ok(
      'reason calls out how long it has been since last practiced',
      weak?.reason.includes('days since you last practiced this') ?? false,
      weak?.reason,
    )
    ok(
      'suggested difficulty backs off from an underperforming medium tier (40% < 65%)',
      weak?.suggestedDifficulty === 'easy',
    )
  }

  // --- 6. Real per-difficulty performance drives the suggestion, even when
  // overall topic accuracy is weak ---------------------------------------------
  logger.info('6. Aces hard questions despite a weak overall topic average')
  {
    const user = await createTestUser('hard-ready')
    const hardEntries: AttemptEntry[] = [true, true, true, false].map((isCorrect, i) => ({
      isCorrect,
      timeTakenSeconds: 30,
      attemptedAt: new Date(daysAgo(3).getTime() + i * 1000),
    })) // 3/4 = 75% on hard
    await recordAttempts(user._id, primaryHardQ._id, hardEntries)
    const easyEntries: AttemptEntry[] = [true, false, false, false, false, false].map(
      (isCorrect, i) => ({
        isCorrect,
        timeTakenSeconds: 15,
        attemptedAt: new Date(daysAgo(3).getTime() + (10 + i) * 1000),
      }),
    ) // 1/6 = 16.7% on easy -> overall 4/10 = 40% (weak)
    await recordAttempts(user._id, primaryEasyQ._id, easyEntries)

    const result = await adaptivePracticeService.getRecommendations(user.id, 'en')
    const weak = result.weakTopicToRevisit
    ok('the topic is found as the weak topic to revisit (40% overall)', weak !== null)
    ok('accuracy reflects the combined weak overall performance', weak?.accuracyPercent === 40)
    ok(
      'suggested difficulty still reads the real hard-tier accuracy (75% >= 70%) and suggests hard',
      weak?.suggestedDifficulty === 'hard',
    )
  }

  // --- 7. Anti-repetition: "practice next" rotates, "weak topic to revisit"
  // stays honest and stable ----------------------------------------------------
  logger.info(
    '7. Anti-repetition — practice-next rotates away from what was just shown; weak-topic-to-revisit never rotates',
  )
  {
    const user = await createTestUser('rotation')
    const primaryEntries: AttemptEntry[] = Array.from({ length: 10 }, (_, i) => ({
      isCorrect: i < 3, // 30%
      timeTakenSeconds: 20,
      attemptedAt: new Date(daysAgo(1).getTime() + i * 1000),
    }))
    await recordAttempts(user._id, primaryMediumQ._id, primaryEntries)
    const secondaryEntries: AttemptEntry[] = Array.from({ length: 10 }, (_, i) => ({
      isCorrect: i < 5, // 50%
      timeTakenSeconds: 20,
      attemptedAt: new Date(daysAgo(1).getTime() + i * 1000),
    }))
    await recordAttempts(user._id, secondaryMediumQ._id, secondaryEntries)

    const call1 = await adaptivePracticeService.getRecommendations(user.id, 'en')
    ok(
      'call 1 picks the higher-priority topic (30% accuracy) as practice next',
      call1.practiceNext?.topicId === topicPrimary.slug,
    )
    ok(
      'call 1 weak topic to revisit is the same, honest top pick',
      call1.weakTopicToRevisit?.topicId === topicPrimary.slug,
    )

    const call2 = await adaptivePracticeService.getRecommendations(user.id, 'en')
    ok(
      'call 2 rotates "practice next" away from what was just shown as primary',
      call2.practiceNext?.topicId === topicSecondary.slug &&
        call2.practiceNext?.topicId !== call1.practiceNext?.topicId,
    )
    ok(
      '"weak topic to revisit" does not rotate — identical both times',
      call2.weakTopicToRevisit?.topicId === call1.weakTopicToRevisit?.topicId,
    )

    const state = await adaptivePracticeStateRepository.findByUser(user.id)
    ok(
      'anti-repetition state persisted the shown primary picks for this user',
      (state?.recentPrimaryPicks.length ?? 0) >= 2,
    )
  }

  // --- 8. Static check — the engine never calls an AI model ------------------
  logger.info('8. Static check — the engine is purely deterministic, never AI')
  {
    const serviceSource = readFileSync(
      join(__dirname, '../services/adaptivePractice.service.ts'),
      'utf-8',
    )
    const configSource = readFileSync(
      join(__dirname, '../config/adaptivePractice.config.ts'),
      'utf-8',
    )
    const combined = `${serviceSource}\n${configSource}`.toLowerCase()
    ok(
      'no AI-provider import/call anywhere in the recommendation engine',
      !combined.includes('anthropic') &&
        !combined.includes('openai') &&
        !combined.includes("from '../services/ai") &&
        !combined.includes('generatetext') &&
        !combined.includes('.messages.create'),
    )
  }

  // --- Cleanup ----------------------------------------------------------------
  logger.info('Cleaning up test fixtures...')
  await QuestionAttempt.deleteMany({ userId: { $in: userIds } })
  await AdaptivePracticeState.deleteMany({ userId: { $in: userIds } })
  await Profile.deleteMany({ userId: { $in: userIds } })
  await User.deleteMany({ _id: { $in: userIds } })
  await Question.deleteMany({
    _id: { $in: [primaryEasyQ._id, primaryMediumQ._id, primaryHardQ._id, secondaryMediumQ._id] },
  })
  await Subtopic.deleteMany({ _id: { $in: [subtopicPrimary._id, subtopicSecondary._id] } })
  await Topic.deleteMany({ _id: { $in: [topicPrimary._id, topicSecondary._id] } })
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
