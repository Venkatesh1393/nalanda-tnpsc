import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { Question } from '../models/Question.model'

/**
 * One-time migration: `npm run migrate:question-workflow`.
 *
 * Sprint 4 Step 71.5 added `Question.workflow.status` (Draft -> Pending
 * Review -> Approved -> Published) and `question.repository.ts`'s
 * `findRandomQuestionIds` (the real Smart Practice/Live Exam
 * question-selection query) now requires `workflow.status: 'published'`.
 * Every question created *before* this step has no `workflow` field at
 * all — without this migration, deploying Step 71.5 would silently make
 * the entire existing question bank unselectable, since a missing field
 * doesn't match `{'workflow.status': 'published'}` no matter what
 * Mongoose's schema `default` says (a schema default only applies to
 * documents constructed in application code, never retroactively to bytes
 * already stored in MongoDB).
 *
 * Every question already live today is, by definition, already
 * de-facto published — this migration just makes that explicit. Must be
 * run once, manually, before or immediately after deploying this step;
 * never auto-run on boot (same "explicit, operator-run tool" precedent as
 * `promoteToSuperAdmin.ts`). Safe to re-run — the filter only ever
 * matches documents that still have no `workflow` field, so a second run
 * against an already-migrated database updates zero documents.
 */
async function main() {
  await connectDatabase()
  try {
    const before = await Question.countDocuments({ workflow: { $exists: false } })
    logger.info(`Found ${before} question(s) with no workflow field.`)
    if (before === 0) {
      logger.info('Nothing to migrate.')
      return
    }

    const result = await Question.updateMany(
      { workflow: { $exists: false } },
      { $set: { 'workflow.status': 'published' } },
    )
    logger.info(
      `Migrated ${result.modifiedCount} of ${result.matchedCount} matched question(s) to workflow.status: "published".`,
    )

    const remaining = await Question.countDocuments({ workflow: { $exists: false } })
    if (remaining > 0) {
      logger.warn(
        `${remaining} question(s) still have no workflow field after migration.`,
      )
      process.exitCode = 1
    }
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('migrateQuestionWorkflowStatus failed', { error })
  process.exitCode = 1
})
