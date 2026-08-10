import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { AIExplanation } from '../models/AIExplanation.model'
import { AIHistory } from '../models/AIHistory.model'
import { Exam } from '../models/Exam.model'
import { PracticeSession } from '../models/PracticeSession.model'
import { Profile } from '../models/Profile.model'
import { Question } from '../models/Question.model'
import { Subject } from '../models/Subject.model'
import { Subtopic } from '../models/Subtopic.model'
import { Topic } from '../models/Topic.model'
import { User } from '../models/User.model'
import * as adminAiUsageService from '../services/admin/adminAiUsage.service'
import * as questionExplanationService from '../services/ai/questionExplanation.service'
import { estimateCostUsd } from '../utils/aiCost'
import { PROMPT_VERSION } from '../prompts/questionExplanation.v1'

/**
 * Sprint 4 Step 58 — AI Explanation Quality + Cost Optimization.
 * Manual end-to-end verification (`npm run verify:ai-optimization`), same
 * spirit as `verifyCloudinary.ts`/`seed/verify.ts` — no test runner is
 * installed (see `backend/tests/README.md`). Exercises real writes against
 * the live database with disposable fixtures (two throwaway users, one
 * throwaway question/sessions), asserts on real query results, and deletes
 * every fixture it created before exiting — pass or fail.
 *
 * `ANTHROPIC_API_KEY` is not set in this environment (confirmed via
 * `config/anthropic.ts#isAnthropicConfigured`), so this script cannot
 * exercise a real provider call — that would need a live key and would
 * spend real money. What it *can* prove without one, and does:
 *   - cache-hit reuse (never touches the provider)
 *   - in-flight duplicate-request de-duplication (two concurrent identical
 *     calls collapse into one execution)
 *   - daily quota enforcement (quota check runs before any provider call)
 *   - the "AI provider not configured" graceful-degradation path (proves
 *     the same 503-not-500 behavior documented for Razorpay)
 *   - cost-calculation math (`estimateCostUsd`, pure function)
 *   - admin usage dashboard aggregation (counts, cost sum, byUser/byQuestion)
 * Not exercised here: a real generation call, the app-level fallback retry
 * against a live provider error, and the HTTP-layer rate limiters (those
 * need a running server + JWT; express-rate-limit itself is a well-tested
 * library, and the wiring is covered by `tsc`/`eslint` passing clean).
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

async function main(): Promise<void> {
  await connectDatabase()

  const exam = await Exam.findOne()
  const subject = await Subject.findOne()
  const topic = await Topic.findOne()
  const subtopic = await Subtopic.findOne()
  if (!exam || !subject || !topic || !subtopic) {
    throw new Error(
      'No Exam/Subject/Topic/Subtopic found — seed the database first (npm run seed).',
    )
  }

  const stamp = Date.now()
  const userA = await User.create({
    firebaseUid: `verify-ai-opt-a-${stamp}`,
    email: `verify-ai-opt-a-${stamp}@test.local`,
    authProvider: 'email_password',
  })
  const userB = await User.create({
    firebaseUid: `verify-ai-opt-b-${stamp}`,
    email: `verify-ai-opt-b-${stamp}@test.local`,
    authProvider: 'email_password',
  })
  // userA gets a Profile (exercises the "real name" join path in
  // adminAiUsageService); userB deliberately doesn't (exercises the
  // email-fallback branch).
  const profileA = await Profile.create({
    userId: userA._id,
    name: 'Verify AI Opt User A',
  })

  const question = await Question.create({
    examIds: [exam._id],
    subjectId: subject._id,
    topicId: topic._id,
    subtopicId: subtopic._id,
    questionText: { en: `Verify AI Opt question ${stamp}` },
    options: [
      { optionId: 'A', text: { en: 'Correct option' }, isCorrect: true },
      { optionId: 'B', text: { en: 'Wrong option' }, isCorrect: false },
    ],
    difficulty: 'medium',
    source: 'curated',
    aiExplanationEligible: true,
    isActive: true,
  })

  const subjectId = subject._id
  const topicId = topic._id
  const subtopicId = subtopic._id

  async function makeSubmittedSession(userId: string, selectedOptionId: string) {
    return PracticeSession.create({
      userId,
      mode: 'quiz',
      subjectId,
      topicId,
      subtopicId,
      questionIds: [question._id],
      answers: [{ questionId: question._id, selectedOptionId, markedForReview: false }],
      timerType: 'soft',
      durationSeconds: 60,
      status: 'submitted',
      submittedAt: new Date(),
    })
  }

  const sessionCached = await makeSubmittedSession(userA.id, 'B')
  const sessionQuotaMiss = await makeSubmittedSession(userA.id, 'A')
  const sessionNotConfigured = await makeSubmittedSession(userB.id, 'A')

  // Pre-seed the cache row for {question, selectedOptionId: 'B', en} — the
  // exact-key match this app deliberately uses instead of semantic reuse.
  await AIExplanation.create({
    questionId: question._id,
    selectedOptionId: 'B',
    language: 'en',
    promptVersion: PROMPT_VERSION,
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    whyCorrectIsCorrect: 'Because it is correct.',
    whyYourAnswerIsWrong: 'Because it is wrong.',
    keyConcept: 'Test concept',
    memoryTrick: null,
    examRelevance: null,
  })

  const countHistory = (userId: string) => AIHistory.countDocuments({ userId })

  logger.info(
    'Sprint 4 Step 58 — AI Explanation Quality + Cost Optimization verification',
  )

  // --- 1. Cache-hit reuse (never calls the provider) -----------------
  logger.info('1. Cache-hit reuse')
  {
    const before = await countHistory(userA.id)
    const result = await questionExplanationService.explainQuestion(
      userA.id,
      sessionCached.id,
      question.id,
      'en',
    )
    const after = await countHistory(userA.id)
    ok('cached result returned', result.source === 'cached')
    ok('exactly one AIHistory row written', after - before === 1, { before, after })
  }

  // --- 2. Duplicate-request prevention (in-flight dedup) --------------
  logger.info('2. Duplicate-request prevention')
  {
    const before = await countHistory(userA.id)
    const [r1, r2] = await Promise.all([
      questionExplanationService.explainQuestion(
        userA.id,
        sessionCached.id,
        question.id,
        'en',
      ),
      questionExplanationService.explainQuestion(
        userA.id,
        sessionCached.id,
        question.id,
        'en',
      ),
    ])
    const after = await countHistory(userA.id)
    ok(
      'both concurrent calls resolved to the same cached content',
      r1.source === 'cached' &&
        r2.source === 'cached' &&
        r1.whyCorrectIsCorrect === r2.whyCorrectIsCorrect,
    )
    ok(
      'two concurrent identical requests produced exactly one execution (not two)',
      after - before === 1,
      { before, after },
    )
  }

  // --- 3. Daily quota enforcement -------------------------------------
  logger.info('3. Daily quota enforcement')
  const DAILY_GENERATION_QUOTA = 50
  {
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const fillRows = Array.from({ length: DAILY_GENERATION_QUOTA }, () => ({
      userId: userA._id,
      feature: 'question_explanation' as const,
      questionId: question._id,
      promptVersion: PROMPT_VERSION,
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      source: 'generated' as const,
      status: 'success' as const,
      createdAt: startOfDay,
    }))
    await AIHistory.insertMany(fillRows)

    const before = await countHistory(userA.id)
    let threw: unknown
    try {
      await questionExplanationService.explainQuestion(
        userA.id,
        sessionQuotaMiss.id,
        question.id,
        'en',
      )
    } catch (error) {
      threw = error
    }
    const after = await countHistory(userA.id)
    const apiError = threw as { statusCode?: number; code?: string } | undefined
    ok('quota-exceeded request was rejected', threw !== undefined)
    ok(
      'rejection carries 429 + DAILY_AI_LIMIT_REACHED',
      apiError?.statusCode === 429 && apiError?.code === 'DAILY_AI_LIMIT_REACHED',
      apiError,
    )
    ok('quota-exceeded attempt logged exactly one failure row', after - before === 1, {
      before,
      after,
    })
  }

  // --- 4. "AI provider not configured" graceful degradation -----------
  logger.info('4. AI provider not configured (graceful 503)')
  {
    const before = await countHistory(userB.id)
    let threw: unknown
    try {
      await questionExplanationService.explainQuestion(
        userB.id,
        sessionNotConfigured.id,
        question.id,
        'en',
      )
    } catch (error) {
      threw = error
    }
    const after = await countHistory(userB.id)
    const apiError = threw as { statusCode?: number; code?: string } | undefined
    ok(
      'unconfigured-provider request was rejected, not thrown as a raw error',
      threw !== undefined,
    )
    ok(
      'rejection carries 503 + AI_SERVICE_UNAVAILABLE (never a 500)',
      apiError?.statusCode === 503 && apiError?.code === 'AI_SERVICE_UNAVAILABLE',
      apiError,
    )
    ok('failure logged exactly one row', after - before === 1, { before, after })
  }

  // --- 5. Cost calculation math ----------------------------------------
  logger.info('5. Cost calculation architecture')
  {
    const full = estimateCostUsd('claude-haiku-4-5', 1_000_000, 1_000_000)
    const partial = estimateCostUsd('claude-haiku-4-5', 500_000, 200_000)
    const unknownModel = estimateCostUsd('not-a-real-model', 100, 100)
    ok(
      '1M input + 1M output tokens = $6.00 ($1.00 in + $5.00 out per Anthropic pricing)',
      full === 6,
    )
    ok('500K input + 200K output tokens = $1.50', partial === 1.5)
    ok('unknown model returns null (never a silently-wrong $0)', unknownModel === null)
  }

  // --- 6. Admin usage dashboard aggregation ----------------------------
  logger.info('6. Admin AI Usage dashboard')
  {
    const dashboard = await adminAiUsageService.getUsageDashboard(1, 1000)

    const rowA = dashboard.byUser.find((row) => row.userId === userA.id)
    const rowB = dashboard.byUser.find((row) => row.userId === userB.id)
    const rowQuestion = dashboard.byQuestion.find((row) => row.questionId === question.id)

    ok(
      'today total covers at least this run’s 54 rows',
      dashboard.today.total >= 54,
      dashboard.today,
    )
    ok(
      'today cost sum is a finite number (no NaN from missing estimatedCostUsd)',
      Number.isFinite(dashboard.today.estimatedCostUsd),
    )

    ok(
      'usage-by-user includes userA with the expected counters',
      !!rowA &&
        rowA.total === 53 &&
        rowA.generated === 51 &&
        rowA.cached === 2 &&
        rowA.failed === 1,
      rowA,
    )
    ok(
      'userA display name resolves via Profile join',
      rowA?.name === 'Verify AI Opt User A',
    )
    ok(
      'usage-by-user includes userB with the expected counters',
      !!rowB && rowB.total === 1 && rowB.generated === 1 && rowB.failed === 1,
      rowB,
    )
    ok(
      'userB with no Profile falls back to email as display name',
      rowB?.name === rowB?.email,
    )

    ok(
      'usage-by-question includes the test question with the expected total',
      !!rowQuestion && rowQuestion.total === 54,
      rowQuestion,
    )
    ok(
      'usage-by-question never exposes generated explanation text (only counts/cost)',
      !!rowQuestion && !('whyCorrectIsCorrect' in rowQuestion),
    )
  }

  // --- Cleanup ----------------------------------------------------------
  logger.info('Cleaning up test fixtures...')
  await AIHistory.deleteMany({ userId: { $in: [userA._id, userB._id] } })
  await AIExplanation.deleteMany({ questionId: question._id })
  await PracticeSession.deleteMany({
    _id: { $in: [sessionCached._id, sessionQuotaMiss._id, sessionNotConfigured._id] },
  })
  await Question.deleteOne({ _id: question._id })
  await Profile.deleteOne({ _id: profileA._id })
  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } })
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
