import type { Model } from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { Achievement } from '../models/Achievement.model'
import { AdminInvite } from '../models/AdminInvite.model'
import { AIExplanation } from '../models/AIExplanation.model'
import { AIHistory } from '../models/AIHistory.model'
import { AuditLog } from '../models/AuditLog.model'
import { Bookmark } from '../models/Bookmark.model'
import { CurrentAffair } from '../models/CurrentAffair.model'
import { Exam } from '../models/Exam.model'
import { Leaderboard } from '../models/Leaderboard.model'
import { LearningProgress } from '../models/LearningProgress.model'
import { Lesson } from '../models/Lesson.model'
import { LiveExam } from '../models/LiveExam.model'
import { LiveExamAttempt } from '../models/LiveExamAttempt.model'
import { Notification } from '../models/Notification.model'
import { Payment } from '../models/Payment.model'
import { PracticeSession } from '../models/PracticeSession.model'
import { Profile } from '../models/Profile.model'
import { Question } from '../models/Question.model'
import { QuestionAttempt } from '../models/QuestionAttempt.model'
import { Session } from '../models/Session.model'
import { StudentAnalytics } from '../models/StudentAnalytics.model'
import { StudyMaterial } from '../models/StudyMaterial.model'
import { StudyPlan } from '../models/StudyPlan.model'
import { Subject } from '../models/Subject.model'
import { Subscription } from '../models/Subscription.model'
import { Subtopic } from '../models/Subtopic.model'
import { Topic } from '../models/Topic.model'
import { User } from '../models/User.model'
import { currentAffairsSeedData } from './data/currentAffairs.seed'
import { examSeedData } from './data/exams.seed'
import { liveExamsSeedData } from './data/liveExams.seed'
import { syllabusSeedData } from './data/syllabus.seed'

// Mongoose's Model<T> is invariant enough in its statics/methods generics
// that a homogeneous array of differently-typed models needs `any` here;
// each model is still fully typed everywhere else it's actually used.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MODELS: Model<any>[] = [
  Achievement,
  AdminInvite,
  AIExplanation,
  AIHistory,
  AuditLog,
  Bookmark,
  CurrentAffair,
  Exam,
  Leaderboard,
  LearningProgress,
  Lesson,
  LiveExam,
  LiveExamAttempt,
  Notification,
  Payment,
  PracticeSession,
  Profile,
  Question,
  QuestionAttempt,
  Session,
  StudentAnalytics,
  StudyMaterial,
  StudyPlan,
  Subject,
  Subscription,
  Subtopic,
  Topic,
  User,
]

/**
 * Drops any index no longer declared in a model's schema and creates any
 * missing one — self-heals from exactly the kind of mistake this step hit
 * during development (a since-fixed invalid compound index left behind in
 * Atlas from an earlier run). Safe to run repeatedly; cheap at this data
 * volume.
 */
async function syncAllIndexes(): Promise<void> {
  for (const model of ALL_MODELS) {
    await model.syncIndexes()
  }
  logger.info(`Synced indexes for ${ALL_MODELS.length} models`)
}

/**
 * Idempotent dev-data seed — safe to re-run. Every document is upserted on
 * a natural key (`Exam.code`, `Subject/Topic/Subtopic.slug`, or a
 * subtopic+title/text combination for the models without their own slug),
 * so running this twice updates in place rather than duplicating.
 *
 * Scope is deliberately small: 8 exam categories + a 2-subject/4-topic/
 * 8-subtopic representative hierarchy + ~4 real questions — enough to
 * exercise every model and relationship in dev, not a production content
 * seed (per this step's explicit "no hundreds of fake questions" instruction).
 */
async function seedExams(): Promise<Map<string, string>> {
  const codeToId = new Map<string, string>()

  for (const exam of examSeedData) {
    const doc = await Exam.findOneAndUpdate(
      { code: exam.code },
      { $set: exam },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    codeToId.set(exam.code, doc._id.toString())
  }

  logger.info(`Seeded ${codeToId.size} exams`)
  return codeToId
}

async function seedSyllabus(examCodeToId: Map<string, string>) {
  let subjectCount = 0
  let topicCount = 0
  let subtopicCount = 0
  let lessonCount = 0
  let studyMaterialCount = 0
  let questionCount = 0

  for (const subjectSeed of syllabusSeedData) {
    const examIds = subjectSeed.examCodes.map((code) => {
      const id = examCodeToId.get(code)
      if (!id) throw new Error(`Unknown exam code in seed data: ${code}`)
      return id
    })

    const subject = await Subject.findOneAndUpdate(
      { slug: subjectSeed.slug },
      {
        $set: {
          slug: subjectSeed.slug,
          name: subjectSeed.name,
          examIds,
          order: subjectSeed.order,
          icon: subjectSeed.icon,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    subjectCount += 1

    for (const topicSeed of subjectSeed.topics) {
      const topic = await Topic.findOneAndUpdate(
        { slug: topicSeed.slug },
        {
          $set: {
            slug: topicSeed.slug,
            subjectId: subject._id,
            examIds,
            name: topicSeed.name,
            order: topicSeed.order,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      topicCount += 1

      for (const subtopicSeed of topicSeed.subtopics) {
        const subtopic = await Subtopic.findOneAndUpdate(
          { slug: subtopicSeed.slug },
          {
            $set: {
              slug: subtopicSeed.slug,
              topicId: topic._id,
              subjectId: subject._id,
              examIds,
              name: subtopicSeed.name,
              order: subtopicSeed.order,
              estimatedMinutes: subtopicSeed.estimatedMinutes,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        subtopicCount += 1

        await Lesson.findOneAndUpdate(
          { subtopicId: subtopic._id, 'title.en': subtopicSeed.lesson.title.en },
          {
            $set: {
              subtopicId: subtopic._id,
              title: subtopicSeed.lesson.title,
              type: 'video',
              order: 1,
              video: { durationSeconds: subtopicSeed.lesson.durationSeconds },
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        lessonCount += 1

        await StudyMaterial.findOneAndUpdate(
          { subtopicId: subtopic._id, 'title.en': subtopicSeed.studyMaterial.title.en },
          {
            $set: {
              subtopicId: subtopic._id,
              title: subtopicSeed.studyMaterial.title,
              body: subtopicSeed.studyMaterial.body,
              type: 'notes',
              publishedAt: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        studyMaterialCount += 1

        for (const questionSeed of subtopicSeed.questions ?? []) {
          await Question.findOneAndUpdate(
            { subtopicId: subtopic._id, 'questionText.en': questionSeed.questionText.en },
            {
              $set: {
                examIds,
                subjectId: subject._id,
                topicId: topic._id,
                subtopicId: subtopic._id,
                questionText: questionSeed.questionText,
                options: questionSeed.options,
                difficulty: questionSeed.difficulty,
                questionType: 'mcq_single',
                explanation: questionSeed.explanation,
                source: questionSeed.source,
                isPreviousYear: questionSeed.isPreviousYear,
                pyqYear: questionSeed.pyqYear,
                tnpscExamType: questionSeed.tnpscExamType,
                tags: questionSeed.tags,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          questionCount += 1
        }
      }
    }
  }

  logger.info(
    `Seeded ${subjectCount} subjects, ${topicCount} topics, ${subtopicCount} subtopics, ` +
      `${lessonCount} lessons, ${studyMaterialCount} study materials, ${questionCount} questions`,
  )
}

/**
 * Step 48 — small, representative Live Exams, scheduled relative to
 * seed-run time (see `data/liveExams.seed.ts`'s header) so "Upcoming"/
 * "Live Now"/"Completed" are always true regardless of when this runs.
 * Question sets are assembled from the already-seeded syllabus questions
 * by tag, never duplicated content. Idempotent: upserted on `title.en`.
 */
async function seedLiveExams(examCodeToId: Map<string, string>): Promise<void> {
  const now = Date.now()
  let count = 0

  for (const examSeed of liveExamsSeedData) {
    const examId = examCodeToId.get(examSeed.examCode)
    if (!examId)
      throw new Error(`Unknown exam code in live exam seed: ${examSeed.examCode}`)

    const subjects = await Subject.find({ slug: { $in: examSeed.subjectSlugs } })
    if (subjects.length !== examSeed.subjectSlugs.length) {
      throw new Error(
        `Live exam "${examSeed.title.en}" references an unknown subject slug (wanted ${examSeed.subjectSlugs.join(', ')})`,
      )
    }

    const questions = await Question.find({ tags: { $in: examSeed.questionTags } })
      .sort({ _id: 1 })
      .limit(examSeed.questionCount)
    if (questions.length < examSeed.questionCount) {
      throw new Error(
        `Live exam "${examSeed.title.en}" wanted ${examSeed.questionCount} questions tagged [${examSeed.questionTags.join(', ')}], found only ${questions.length}`,
      )
    }

    const scheduledStartAt = new Date(now + examSeed.startOffsetMinutes * 60_000)
    const scheduledEndAt = new Date(now + examSeed.endOffsetMinutes * 60_000)

    await LiveExam.findOneAndUpdate(
      { 'title.en': examSeed.title.en },
      {
        $set: {
          title: examSeed.title,
          description: examSeed.description,
          examId,
          subjectIds: subjects.map((subject) => subject._id),
          questionIds: questions.map((question) => question._id),
          scheduledStartAt,
          scheduledEndAt,
          durationMinutes: examSeed.durationMinutes,
          totalQuestions: questions.length,
          totalMarks: questions.length * examSeed.marksPerQuestion,
          marksPerQuestion: examSeed.marksPerQuestion,
          negativeMarking: examSeed.negativeMarking,
          instructions: examSeed.instructions,
          resultPublication:
            examSeed.resultPublication.mode === 'scheduled'
              ? {
                  mode: 'scheduled',
                  publishAt: new Date(
                    scheduledEndAt.getTime() +
                      (examSeed.resultPublication.publishAfterEndMinutes ?? 0) * 60_000,
                  ),
                }
              : { mode: 'immediate' },
          status: examSeed.status,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    count += 1
  }

  logger.info(`Seeded ${count} live exams`)
}

/**
 * Real Current Affairs backend step — small, hand-authored, non-scraped dev
 * content (`data/currentAffairs.seed.ts`'s own header explains why), dates
 * resolved relative to seed-run time so "Today"/"This Week" filters always
 * have real matching content. `relatedQuestionTags` resolves against the
 * already-seeded syllabus `Question`s by tag, same pattern
 * `seedLiveExams` uses — never duplicated question content. Idempotent:
 * upserted on `title.en`.
 */
async function seedCurrentAffairs(): Promise<void> {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  let count = 0

  for (const item of currentAffairsSeedData) {
    const relatedQuestions = item.relatedQuestionTags
      ? await Question.find({ tags: { $in: item.relatedQuestionTags } })
          .sort({ _id: 1 })
          .limit(3)
      : []

    await CurrentAffair.findOneAndUpdate(
      { 'title.en': item.title.en },
      {
        $set: {
          date: new Date(now - item.daysAgo * dayMs),
          period: item.period,
          category: item.category,
          title: item.title,
          excerpt: item.excerpt,
          body: item.body,
          highlights: item.highlights,
          examRelevanceTags: item.examRelevanceTags,
          tags: item.tags,
          isImportant: item.isImportant,
          imageUrl: item.imageUrl,
          imageAlt: item.imageAlt,
          quizQuestions: item.quizQuestions ?? [],
          quizQuestionIds: relatedQuestions.map((question) => question._id),
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    count += 1
  }

  logger.info(`Seeded ${count} current affairs articles`)
}

async function main() {
  await connectDatabase()
  try {
    await syncAllIndexes()
    const examCodeToId = await seedExams()
    await seedSyllabus(examCodeToId)
    await seedLiveExams(examCodeToId)
    await seedCurrentAffairs()
    logger.info('Seed complete.')
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Seed failed', { error })
  process.exitCode = 1
})
