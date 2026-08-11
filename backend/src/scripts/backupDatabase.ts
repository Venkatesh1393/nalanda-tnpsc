import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

import { EJSON } from 'bson'
import mongoose from 'mongoose'

import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'

/**
 * Sprint 4 Step 73 — Production Cloud Services. Automatic MongoDB backup —
 * closes the gap `docs/BackupStrategy.md` disclosed as "documented as a
 * plan, no script exists yet" (Sprint 4 Step 69).
 *
 * Deliberately NOT a wrapper around `mongodump` — the MongoDB Database
 * Tools binary isn't installed in this project's dev environment and can't
 * be assumed present on every future host either, whereas this script needs
 * nothing beyond what `npm install` already provides (the `mongodb` driver
 * and its `bson` dependency, both already in `node_modules` via `mongoose`).
 * Every document is dumped through the driver as Extended JSON (`EJSON`,
 * the same lossless BSON-safe text format `mongoexport --jsonFormat=canonical`
 * produces) — ObjectIds, Dates, etc. all round-trip exactly, just not
 * binary-compatible with `mongorestore`. `restoreDatabase.ts` is this
 * format's matching counterpart. Teams that already run MongoDB Database
 * Tools on their ops host and prefer `mongodump`'s BSON archives can still
 * use it directly against the same `MONGODB_URI` — see
 * `docs/BackupStrategy.md` §2 for that alternative, documented but not
 * built here since it can't be verified in this environment.
 *
 * One file per collection, newline-delimited EJSON, gzip-compressed —
 * streamed document-by-document so a large collection never has to fit in
 * memory as one array. Usage: `npm run backup:database`.
 */

const BACKUP_ROOT = path.join(__dirname, '..', '..', 'backups')
/** Keep the newest N backup runs, delete older ones — folder names are
 * ISO-timestamp-prefixed so lexical sort is also chronological sort. */
const RETENTION_COUNT = 7

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/** Writes `line + '\n'` into a gzip stream, honoring backpressure. */
function writeLine(stream: zlib.Gzip, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = stream.write(line + '\n', (error) => (error ? reject(error) : undefined))
    if (ok) {
      resolve()
    } else {
      stream.once('drain', resolve)
    }
  })
}

/** Pipes `gzip` to a new file and resolves once fully flushed. Does NOT call
 * `gzip.end()` itself — the caller must do that only after every `writeLine`
 * has completed, or the stream ends before the data it's supposed to
 * receive arrives (`ERR_STREAM_WRITE_AFTER_END`). */
function pipeGzipToFile(gzip: zlib.Gzip, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filePath)
    gzip.pipe(out)
    out.on('finish', resolve)
    out.on('error', reject)
    gzip.on('error', reject)
  })
}

interface CollectionManifestEntry {
  name: string
  documentCount: number
  file: string
  indexes: unknown[]
}

async function backupCollection(
  db: mongoose.mongo.Db,
  collectionName: string,
  destDir: string,
): Promise<CollectionManifestEntry> {
  const collection = db.collection(collectionName)
  const fileName = `${collectionName}.ndjson.gz`
  const gzip = zlib.createGzip()
  const writeDone = pipeGzipToFile(gzip, path.join(destDir, fileName))

  let documentCount = 0
  const cursor = collection.find({}, { batchSize: 500 })
  for await (const doc of cursor) {
    await writeLine(gzip, EJSON.stringify(doc))
    documentCount += 1
  }
  gzip.end()
  await writeDone

  const indexes = await collection.indexes()

  return { name: collectionName, documentCount, file: fileName, indexes }
}

/** Deletes all but the newest `RETENTION_COUNT` backup folders. Runs only
 * after the current backup finishes successfully — a failed backup run
 * never costs a good older one its place. */
function pruneOldBackups(): string[] {
  if (!fs.existsSync(BACKUP_ROOT)) return []
  const entries = fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const toDelete = entries.slice(0, Math.max(0, entries.length - RETENTION_COUNT))
  for (const name of toDelete) {
    fs.rmSync(path.join(BACKUP_ROOT, name), { recursive: true, force: true })
  }
  return toDelete
}

async function main(): Promise<void> {
  await connectDatabase()
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('No active database connection')

    const slug = timestampSlug()
    const destDir = path.join(BACKUP_ROOT, `${slug}-${db.databaseName}`)
    fs.mkdirSync(destDir, { recursive: true })

    const collections = await db.listCollections().toArray()
    logger.info(
      `Backing up ${collections.length} collection(s) from "${db.databaseName}" to ${destDir}`,
    )

    const manifestCollections: CollectionManifestEntry[] = []
    for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const entry = await backupCollection(db, name, destDir)
      manifestCollections.push(entry)
      logger.info(`  - ${name}: ${entry.documentCount} document(s)`)
    }

    const manifest = {
      databaseName: db.databaseName,
      createdAt: new Date().toISOString(),
      format: 'ejson-ndjson-gzip-v1',
      collections: manifestCollections,
    }
    fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    const totalDocs = manifestCollections.reduce((sum, c) => sum + c.documentCount, 0)
    logger.info(`Backup complete — ${totalDocs} total document(s) written to ${destDir}`)

    const pruned = pruneOldBackups()
    if (pruned.length > 0) {
      logger.info(`Pruned ${pruned.length} backup(s) beyond retention (${RETENTION_COUNT}): ${pruned.join(', ')}`)
    }
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  logger.error('Database backup failed', { error })
  process.exitCode = 1
})
