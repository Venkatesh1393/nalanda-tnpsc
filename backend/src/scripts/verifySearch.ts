import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { EXAM_CATEGORY_CODES } from '../constants/exam'
import { Bookmark } from '../models/Bookmark.model'
import { CurrentAffair } from '../models/CurrentAffair.model'
import { Exam } from '../models/Exam.model'
import { Lesson } from '../models/Lesson.model'
import { LiveExam } from '../models/LiveExam.model'
import { Profile } from '../models/Profile.model'
import { Question, type QuestionDocument } from '../models/Question.model'
import { SearchHistory } from '../models/SearchHistory.model'
import { Subject, type SubjectDocument } from '../models/Subject.model'
import { Subtopic, type SubtopicDocument } from '../models/Subtopic.model'
import { Topic, type TopicDocument } from '../models/Topic.model'
import { User, type UserDocument } from '../models/User.model'
import * as searchService from '../services/search.service'

/**
 * Sprint 4 Step 63 — Global Search. Manual end-to-end verification
 * (`npm run verify:search`), same pattern as `verifyNotifications.ts` — no
 * test runner installed (see `backend/tests/README.md`). Exercises real
 * writes against the live database with disposable fixtures, asserts on
 * real query results and real service output, and deletes every fixture it
 * created before exiting.
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

function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 60 * 1000)
}

async function main(): Promise<void> {
  await connectDatabase()

  // Text indexes are new in this step — force them to exist before running
  // any `$text` query, rather than racing Mongoose's async `autoIndex` build.
  await Promise.all([
    Subject.createIndexes(),
    Topic.createIndexes(),
    Lesson.createIndexes(),
    Question.createIndexes(),
    CurrentAffair.createIndexes(),
    LiveExam.createIndexes(),
    SearchHistory.createIndexes(),
  ])

  const exam = await Exam.findOne({ isActive: true })
  if (!exam) throw new Error('No Exam found — seed the database first (npm run seed).')
  const examId = exam._id

  const stamp = Date.now()
  const tag = `VerifySearch${stamp}`

  const subject: SubjectDocument = await Subject.create({
    slug: `verify-search-subject-${stamp}`,
    name: { en: `${tag} Subject` },
    examIds: [examId],
    isActive: true,
  })
  const topic: TopicDocument = await Topic.create({
    slug: `verify-search-topic-${stamp}`,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `${tag} Topic` },
    isActive: true,
  })
  const subtopic: SubtopicDocument = await Subtopic.create({
    slug: `verify-search-subtopic-${stamp}`,
    topicId: topic._id,
    subjectId: subject._id,
    examIds: [examId],
    name: { en: `${tag} Subtopic` },
    isActive: true,
  })
  const lesson = await Lesson.create({
    subtopicId: subtopic._id,
    title: { en: `${tag} Lesson` },
    type: 'reading',
    isActive: true,
  })
  const question: QuestionDocument = await Question.create({
    examIds: [examId],
    subjectId: subject._id,
    topicId: topic._id,
    subtopicId: subtopic._id,
    questionText: { en: `${tag} Question — which option is correct?` },
    options: [
      { optionId: 'A', text: { en: 'Correct option' }, isCorrect: true },
      { optionId: 'B', text: { en: 'Wrong option' }, isCorrect: false },
    ],
    difficulty: 'easy',
    source: 'curated',
    isActive: true,
  })
  const currentAffair = await CurrentAffair.create({
    date: new Date(),
    period: 'daily',
    category: 'national',
    title: { en: `${tag} Current Affair` },
    body: { en: ['A real test paragraph.'], ta: [] },
    highlights: { en: ['A real test highlight.'], ta: [] },
    examRelevanceTags: [],
    tags: [],
    isImportant: false,
    quizQuestionIds: [],
    quizQuestions: [],
    isActive: true,
  })
  const liveExam = await LiveExam.create({
    title: { en: `${tag} Live Exam` },
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

  const user: UserDocument = await User.create({
    firebaseUid: `verify-search-${stamp}`,
    email: `verify-search-${stamp}@test.local`,
    authProvider: 'email_password',
    subscriptionTier: 'plus',
  })
  await Profile.create({
    userId: user._id,
    name: 'Verify Search User',
    examGoals: [{ examId, isPrimary: true }],
  })
  await Bookmark.create({
    userId: user._id,
    contentType: 'lesson',
    contentId: lesson._id,
  })

  logger.info('Sprint 4 Step 63 — Global Search verification')

  // --- 1. Search finds every one of the six content types -----------------
  logger.info('1. Search — every content type is reachable')
  {
    const page = await searchService.search(user.id, tag, {}, 1, 20, 'en')
    const byType = new Map(page.items.map((item) => [item.type, item]))

    ok('finds the Subject', byType.has('subject'))
    ok('finds the Topic', byType.has('topic'))
    ok('finds the Lesson', byType.has('lesson'))
    ok('finds the Question', byType.has('question'))
    ok('finds the Current Affair', byType.has('current_affair'))
    ok('finds the Live Exam', byType.has('live_exam'))

    const questionResult = byType.get('question')
    ok(
      'question result never leaks isCorrect/options',
      Boolean(questionResult) && !JSON.stringify(questionResult).includes('isCorrect'),
    )

    const lessonResult = byType.get('lesson')
    ok(
      'the bookmarked lesson is reported as bookmarked',
      lessonResult?.isBookmarked === true,
    )
    const topicResult = byType.get('topic')
    ok(
      'a non-bookmarkable type (topic) reports isBookmarked: false',
      topicResult?.isBookmarked === false,
    )

    ok(
      'subject deep link points at the Learn module',
      byType.get('subject')?.deepLink === `/app/learn/${subject.slug}`,
    )
    ok(
      'question deep link hands off to Practice with the subtopic prefilled',
      byType.get('question')?.deepLink ===
        `/app/practice/quiz?subtopicId=${subtopic.slug}`,
    )
    ok(
      'current affair deep link points at the article detail page',
      byType.get('current_affair')?.deepLink ===
        `/app/current-affairs/article/${currentAffair.id}`,
    )
  }

  // --- 2. `types` filter narrows the fan-out ------------------------------
  logger.info('2. Filters — types + examCategory')
  {
    const page = await searchService.search(
      user.id,
      tag,
      { types: ['question', 'live_exam'] },
      1,
      20,
      'en',
    )
    const types = new Set(page.items.map((item) => item.type))
    ok(
      'types filter returns only the requested types',
      types.size > 0 && [...types].every((t) => t === 'question' || t === 'live_exam'),
      [...types],
    )

    const matchingExamPage = await searchService.search(
      user.id,
      tag,
      { examCategory: exam.code },
      1,
      20,
      'en',
    )
    ok(
      "examCategory filter matching our fixtures' exam still returns them",
      matchingExamPage.items.length > 0,
    )

    const otherCode = EXAM_CATEGORY_CODES.find((code) => code !== exam.code)
    if (otherCode) {
      const otherExamPage = await searchService.search(
        user.id,
        tag,
        { examCategory: otherCode },
        1,
        20,
        'en',
      )
      const examScopedTypes = new Set(['subject', 'topic', 'question', 'live_exam'])
      ok(
        'a different examCategory filter excludes exam-scoped types',
        otherExamPage.items.every((item) => !examScopedTypes.has(item.type)),
        otherExamPage.items.map((i) => i.type),
      )
    }
  }

  // --- 3. Pagination ---------------------------------------------------------
  logger.info('3. Pagination')
  {
    const pageOne = await searchService.search(user.id, tag, {}, 1, 2, 'en')
    const pageTwo = await searchService.search(user.id, tag, {}, 2, 2, 'en')
    ok('page 1 respects the limit', pageOne.items.length <= 2)
    ok('total reflects every matching result, not just this page', pageOne.total >= 6)
    ok(
      'totalPages is consistent with total/limit',
      pageOne.totalPages === Math.ceil(pageOne.total / 2),
    )
    const overlap = pageOne.items.filter((a) =>
      pageTwo.items.some((b) => b.type === a.type && b.id === a.id),
    )
    ok('page 1 and page 2 do not repeat the same result', overlap.length === 0)
  }

  // --- 4. Autocomplete — word-prefix, not whole-token -----------------------
  logger.info('4. Autocomplete')
  {
    const prefix = tag.slice(0, tag.length - 3) // still a unique, mid-word prefix
    const results = await searchService.autocomplete(prefix, {}, 'en')
    ok('autocomplete matches on a partial word prefix', results.length > 0)
    ok(
      'autocomplete results are drawn from our fixtures',
      results.every((r) => r.title.includes(tag) || r.context.includes(tag)),
    )
  }

  // --- 5. Recent Searches — de-duplicated, recency-ordered ------------------
  logger.info('5. Recent Searches')
  {
    await searchService.search(user.id, tag, {}, 1, 20, 'en')
    await searchService.search(user.id, tag, {}, 1, 20, 'en')
    const recent = await searchService.getRecentSearches(user.id)
    const ours = recent.filter((r) => r.query === tag)
    ok('a repeated query appears once, not duplicated', ours.length === 1)

    const historyDoc = await SearchHistory.findOne({ userId: user._id, query: tag })
    ok('repeat searches increment the stored count', (historyDoc?.count ?? 0) >= 3)
  }

  // --- 6. Popular Searches — cross-user aggregation --------------------------
  logger.info('6. Popular Searches')
  {
    const popular = await searchService.getPopularSearches()
    const ours = popular.find((p) => p.query === tag)
    ok('our query appears in the popular aggregation', Boolean(ours))
    ok('its count matches what we searched', (ours?.count ?? 0) >= 3)
  }

  // --- 7. Clearing history ----------------------------------------------------
  logger.info('7. Clearing history')
  {
    await searchService.removeRecentSearch(user.id, tag)
    const afterRemoveOne = await searchService.getRecentSearches(user.id)
    ok(
      'removeRecentSearch deletes just that entry',
      !afterRemoveOne.some((r) => r.query === tag),
    )

    await searchService.search(user.id, tag, {}, 1, 20, 'en')
    const { removedCount } = await searchService.clearRecentSearches(user.id)
    ok('clearRecentSearches removes every entry for the user', removedCount >= 1)
    const afterClear = await searchService.getRecentSearches(user.id)
    ok('recent searches is empty after clearing', afterClear.length === 0)
  }

  // --- Cleanup ----------------------------------------------------------------
  logger.info('Cleaning up test fixtures...')
  await SearchHistory.deleteMany({ userId: user._id })
  await Bookmark.deleteMany({ userId: user._id })
  await Profile.deleteMany({ userId: user._id })
  await User.deleteOne({ _id: user._id })
  await LiveExam.deleteOne({ _id: liveExam._id })
  await CurrentAffair.deleteOne({ _id: currentAffair._id })
  await Question.deleteOne({ _id: question._id })
  await Lesson.deleteOne({ _id: lesson._id })
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
