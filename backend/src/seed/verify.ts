import mongoose from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { Exam } from '../models/Exam.model'
import { Question } from '../models/Question.model'
import { Subject } from '../models/Subject.model'
import { Subtopic } from '../models/Subtopic.model'
import { Topic } from '../models/Topic.model'

/**
 * Read-only sanity check (`npm run verify:seed`) — confirms collections
 * physically exist in Atlas with documents in them, and exercises one real
 * populated read across the taxonomy → Question relationship chain built
 * in Step 42. Not a test suite (none is installed yet, see
 * `backend/tests/README.md`); just a manual verification aid.
 */
async function main() {
  await connectDatabase()
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('No active database connection')

    const collections = await db.listCollections().toArray()
    logger.info(`Atlas collections present (${collections.length}):`)
    for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(collection.name).countDocuments()
      logger.info(`  - ${collection.name}: ${count} document(s)`)
    }

    const examCount = await Exam.countDocuments()
    const subjectCount = await Subject.countDocuments()
    const topicCount = await Topic.countDocuments()
    const subtopicCount = await Subtopic.countDocuments()
    const questionCount = await Question.countDocuments()
    logger.info(
      `Seed record check — exams: ${examCount}, subjects: ${subjectCount}, ` +
        `topics: ${topicCount}, subtopics: ${subtopicCount}, questions: ${questionCount}`,
    )

    // One real read operation: a populated query across the full reference
    // chain (Question → Exam/Subject/Topic/Subtopic), proving the ObjectId
    // relationships actually resolve, not just that documents exist.
    const sampleQuestion = await Question.findOne({ isPreviousYear: true })
      .populate('examIds', 'code name')
      .populate('subjectId', 'name slug')
      .populate('topicId', 'name slug')
      .populate('subtopicId', 'name slug')
      .lean()

    logger.info('Sample populated read (Question.findOne):', {
      question: sampleQuestion,
    })
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Verification failed', { error })
  process.exitCode = 1
})
