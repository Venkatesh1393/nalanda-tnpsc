import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import zlib from 'node:zlib'

import { EJSON } from 'bson'
import mongoose from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { env } from '../config/env'
import { logger } from '../config/logger'

/**
 * Sprint 4 Step 73 — restores a backup written by `backupDatabase.ts`. The
 * tested counterpart to it: per `docs/BackupStrategy.md`'s own checklist
 * item ("a real restore drill, not just 'the dump command ran'"), a backup
 * mechanism nobody has ever restored from isn't a verified one.
 *
 * Defaults to a DRY RUN — reports what would be restored (per collection,
 * per document counted) without writing anything. Pass `--confirm` to
 * actually write. Restoring is always into whatever database
 * `backend/.env`'s `MONGODB_URI` currently points at — there is no separate
 * "target" flag, matching `connectDatabase()`'s single-URI model elsewhere
 * in this codebase; point `.env` at the intended target before running this
 * with `--confirm`.
 *
 * Usage:
 *   npm run restore:database -- --archive backups/<folder>              # dry run
 *   npm run restore:database -- --archive backups/<folder> --confirm    # writes
 *   npm run restore:database -- --archive backups/<folder> --confirm --collection users
 */

interface Args {
  archive: string
  confirm: boolean
  collection?: string
}

function parseArgs(argv: string[]): Args {
  let archive: string | undefined
  let confirm = false
  let collection: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--archive') archive = argv[++i]
    else if (arg === '--confirm') confirm = true
    else if (arg === '--collection') collection = argv[++i]
  }

  if (!archive) {
    throw new Error(
      'Usage: npm run restore:database -- --archive <path-to-backup-folder> [--confirm] [--collection <name>]',
    )
  }
  return { archive, confirm, collection }
}

interface Manifest {
  databaseName: string
  createdAt: string
  format: string
  collections: Array<{ name: string; documentCount: number; file: string }>
}

async function readNdjsonGz(filePath: string): Promise<unknown[]> {
  const docs: unknown[] = []
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip())
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    if (line.trim().length === 0) continue
    docs.push(EJSON.parse(line))
  }
  return docs
}

async function restoreCollection(
  db: mongoose.mongo.Db,
  archiveDir: string,
  entry: Manifest['collections'][number],
  confirm: boolean,
): Promise<void> {
  const filePath = path.join(archiveDir, entry.file)
  const docs = await readNdjsonGz(filePath)

  if (!confirm) {
    logger.info(`  [dry run] ${entry.name}: ${docs.length} document(s) would be restored`)
    return
  }

  if (docs.length === 0) {
    logger.info(`  ${entry.name}: 0 documents in archive, nothing to insert`)
    return
  }

  // `ordered: false` so one duplicate-key collision (a doc that already
  // exists — the expected case when restoring into a non-empty database as
  // part of a drill) doesn't abort the rest of the batch.
  try {
    const result = await db
      .collection(entry.name)
      .insertMany(docs as object[], { ordered: false })
    logger.info(`  ${entry.name}: inserted ${result.insertedCount}/${docs.length}`)
  } catch (error) {
    const bulkError = error as { insertedDocs?: unknown[]; writeErrors?: unknown[] }
    const inserted = bulkError.insertedDocs?.length ?? 0
    const failed = bulkError.writeErrors?.length ?? docs.length - inserted
    logger.warn(
      `  ${entry.name}: inserted ${inserted}/${docs.length}, ${failed} skipped ` +
        `(duplicate _id or write error — expected when restoring into a non-empty database)`,
    )
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const archiveDir = path.isAbsolute(args.archive)
    ? args.archive
    : path.join(__dirname, '..', '..', args.archive)

  const manifestPath = path.join(archiveDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No manifest.json found at ${archiveDir} — is this a backupDatabase.ts archive?`)
  }
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  const collections = args.collection
    ? manifest.collections.filter((c) => c.name === args.collection)
    : manifest.collections
  if (args.collection && collections.length === 0) {
    throw new Error(`Collection "${args.collection}" not found in this archive's manifest.`)
  }

  logger.info(
    `Restoring from ${archiveDir} (backed up ${manifest.createdAt} from "${manifest.databaseName}")`,
  )
  if (!args.confirm) {
    logger.info('DRY RUN — pass --confirm to actually write. No documents will be modified.')
  } else {
    logger.warn(
      `--confirm set — writing into the database this backend/.env's MONGODB_URI currently points at.`,
    )
  }

  await connectDatabase()
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('No active database connection')

    if (args.confirm && db.databaseName !== manifest.databaseName) {
      logger.warn(
        `Target database "${db.databaseName}" has a different name than the backup's ` +
          `source database "${manifest.databaseName}" — confirm this is intentional ` +
          `(env.NODE_ENV=${env.NODE_ENV}).`,
      )
    }

    for (const entry of collections) {
      await restoreCollection(db, archiveDir, entry, args.confirm)
    }
    logger.info(args.confirm ? 'Restore complete.' : 'Dry run complete — nothing was written.')
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Database restore failed', { error })
  process.exitCode = 1
})
