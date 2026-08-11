import mongoose from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'

/**
 * Sprint 4 Step 74 — Production Monitoring ("Database: Indexes"). Read-only
 * audit (`npm run audit:indexes`) — lists every collection's actual indexes
 * as they exist in Atlas right now (not what a `*.model.ts` file *declares*,
 * which could drift from reality if a migration was skipped or an index was
 * manually dropped) and flags the one concrete, actionable finding this
 * script can make without knowing this app's query patterns: a collection
 * with no secondary index at all (only the default `_id_`) is either
 * genuinely tiny/rarely queried, or a real gap — worth a human look either
 * way, not an auto-fix.
 *
 * Complements `docs/MonitoringStrategy.md` §4.2's MongoDB Atlas Performance
 * Advisor (provider-native, already covers *slow-query-driven* index
 * suggestions) — this script instead answers "what indexes exist today,"
 * a five-second question Atlas's UI answers per-collection but not as one
 * combined report.
 */
async function main(): Promise<void> {
  await connectDatabase()
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('No active database connection')

    const collections = await db.listCollections().toArray()
    logger.info(`Auditing indexes across ${collections.length} collection(s) in "${db.databaseName}"...`)

    const noSecondaryIndex: string[] = []
    let totalIndexes = 0

    for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const indexes = await db.collection(name).indexes()
      totalIndexes += indexes.length
      const secondaryCount = indexes.filter((index) => index.name !== '_id_').length

      logger.info(`  - ${name}: ${indexes.length} index(es)`)
      for (const index of indexes) {
        const keyShape = JSON.stringify(index.key)
        const flags = [
          index.unique ? 'unique' : null,
          index.sparse ? 'sparse' : null,
          typeof index.expireAfterSeconds === 'number'
            ? `TTL=${index.expireAfterSeconds}s`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
        logger.info(`      ${index.name}: ${keyShape}${flags ? ` (${flags})` : ''}`)
      }

      if (secondaryCount === 0) noSecondaryIndex.push(name)
    }

    logger.info(`--- ${collections.length} collection(s), ${totalIndexes} total index(es) ---`)
    if (noSecondaryIndex.length > 0) {
      logger.warn(
        `${noSecondaryIndex.length} collection(s) have ONLY the default _id_ index — ` +
          `worth reviewing whether their actual query patterns need one: ${noSecondaryIndex.join(', ')}`,
      )
    } else {
      logger.info('Every collection has at least one secondary index.')
    }
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Index audit failed', { error })
  process.exitCode = 1
})
