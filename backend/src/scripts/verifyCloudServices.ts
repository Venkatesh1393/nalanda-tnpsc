import mongoose from 'mongoose'

import { getAnthropicClient, isAnthropicConfigured } from '../config/anthropic'
import { cloudinary } from '../config/cloudinary'
import { connectDatabase, disconnectDatabase } from '../config/database'
import { env } from '../config/env'
import { getFirebaseAdmin } from '../config/firebase'
import { logger } from '../config/logger'
import { getRazorpayClient, isRazorpayConfigured, isWebhookConfigured } from '../config/razorpay'
import { withTimeout } from '../utils/resilience'

/**
 * Sprint 4 Step 73 — Production Cloud Services. One command that answers
 * "are all five external services actually reachable with the credentials
 * in `.env` right now" — `npm run verify:cloud-services`. Distinct from the
 * per-service `verify:*` scripts already in this repo (`verify:cloudinary`
 * does a full upload/delete round trip; `verify:seed` checks Atlas has real
 * seeded data) — this one is a fast, combined credential/connectivity
 * check meant to run before every deploy (see `docs/DEPLOYMENT_GUIDE.md`
 * Phase 4), not a substitute for those deeper checks.
 *
 * MongoDB/Firebase/Cloudinary are REQUIRED — `config/env.ts`'s Zod schema
 * already refuses to boot without their credentials, so any live failure
 * here is a hard FAIL. Razorpay/Anthropic are intentionally optional
 * everywhere else in this app (`isRazorpayConfigured`/`isAnthropicConfigured`
 * gate every caller) — this script matches that: SKIPPED, not FAILED, when
 * their keys are simply blank, matching the "graceful degradation" contract
 * the rest of the app already promises. Every call is timeout-bounded so a
 * single unreachable service can't hang the whole check indefinitely.
 */

const CHECK_TIMEOUT_MS = 15_000

type Status = 'PASS' | 'FAIL' | 'SKIPPED'

interface CheckResult {
  service: string
  status: Status
  detail: string
}

async function checkMongoDb(): Promise<CheckResult> {
  try {
    await connectDatabase()
    const db = mongoose.connection.db
    if (!db) throw new Error('No active database connection after connectDatabase()')
    const ping = await withTimeout(db.admin().ping(), CHECK_TIMEOUT_MS, 'MongoDB ping')
    const collectionCount = (await db.listCollections().toArray()).length
    return {
      service: 'MongoDB Atlas',
      status: ping.ok === 1 ? 'PASS' : 'FAIL',
      detail: `database "${db.databaseName}", ${collectionCount} collection(s)`,
    }
  } catch (error) {
    return { service: 'MongoDB Atlas', status: 'FAIL', detail: errorMessage(error) }
  }
}

async function checkFirebase(): Promise<CheckResult> {
  try {
    const app = getFirebaseAdmin()
    // `listUsers(1)` is a real authenticated call against the Firebase
    // project — confirms the service account credentials are live, not
    // just that `FIREBASE_PRIVATE_KEY_BASE64` decodes into PEM-shaped text
    // (config/firebase.ts's `getFirebaseAdmin` only checks the latter).
    await withTimeout(app.auth().listUsers(1), CHECK_TIMEOUT_MS, 'Firebase listUsers')
    return {
      service: 'Firebase',
      status: 'PASS',
      detail: `project "${env.FIREBASE_PROJECT_ID}" — service account authenticated`,
    }
  } catch (error) {
    return { service: 'Firebase', status: 'FAIL', detail: errorMessage(error) }
  }
}

async function checkCloudinary(): Promise<CheckResult> {
  try {
    const ping = await withTimeout(cloudinary.api.ping(), CHECK_TIMEOUT_MS, 'Cloudinary ping')
    return {
      service: 'Cloudinary',
      status: ping.status === 'ok' ? 'PASS' : 'FAIL',
      detail: `cloud "${env.CLOUDINARY_CLOUD_NAME}" — credentials live (run ` +
        `"npm run verify:cloudinary" for a full upload/delete round trip)`,
    }
  } catch (error) {
    return { service: 'Cloudinary', status: 'FAIL', detail: errorMessage(error) }
  }
}

async function checkRazorpay(): Promise<CheckResult> {
  if (!isRazorpayConfigured()) {
    return {
      service: 'Payments (Razorpay)',
      status: 'SKIPPED',
      detail: 'RAZORPAY_KEY_ID/SECRET not set — expected until a Razorpay account is provisioned',
    }
  }
  try {
    const client = getRazorpayClient()
    await withTimeout(client.orders.all({ count: 1 }), CHECK_TIMEOUT_MS, 'Razorpay orders.all')
    const webhookNote = isWebhookConfigured()
      ? 'webhook secret configured'
      : 'WARNING: webhook secret NOT configured — checkout would create orders that can never activate (services/payment.service.ts)'
    return {
      service: 'Payments (Razorpay)',
      status: 'PASS',
      detail: `credentials live — ${webhookNote}`,
    }
  } catch (error) {
    return { service: 'Payments (Razorpay)', status: 'FAIL', detail: errorMessage(error) }
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  if (!isAnthropicConfigured()) {
    return {
      service: 'AI Provider (Anthropic)',
      status: 'SKIPPED',
      detail: 'ANTHROPIC_API_KEY not set — AI features fail gracefully without it (by design)',
    }
  }
  try {
    const client = getAnthropicClient()
    // Lists available models — a real authenticated call that costs zero
    // tokens, unlike a completion request.
    await withTimeout(client.models.list({ limit: 1 }), CHECK_TIMEOUT_MS, 'Anthropic models.list')
    return { service: 'AI Provider (Anthropic)', status: 'PASS', detail: 'credentials live' }
  } catch (error) {
    return { service: 'AI Provider (Anthropic)', status: 'FAIL', detail: errorMessage(error) }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function main(): Promise<void> {
  logger.info(`Validating cloud services for NODE_ENV=${env.NODE_ENV}...`)

  const mongo = await checkMongoDb()
  // Firebase/Cloudinary/Razorpay/Anthropic checks are independent of each
  // other and of the DB connection above — run concurrently rather than
  // paying for five sequential round trips.
  const [firebase, cloudinaryResult, razorpay, anthropic] = await Promise.all([
    checkFirebase(),
    checkCloudinary(),
    checkRazorpay(),
    checkAnthropic(),
  ])
  await disconnectDatabase()

  const results = [mongo, firebase, cloudinaryResult, razorpay, anthropic]

  logger.info('--- Cloud Services Validation Report ---')
  for (const result of results) {
    const line = `[${result.status}] ${result.service} — ${result.detail}`
    if (result.status === 'FAIL') logger.error(line)
    else logger.info(line)
  }

  const failed = results.filter((r) => r.status === 'FAIL')
  const skipped = results.filter((r) => r.status === 'SKIPPED')
  logger.info(
    `--- ${results.length - failed.length - skipped.length}/${results.length} PASS, ` +
      `${skipped.length} SKIPPED, ${failed.length} FAILED ---`,
  )

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  logger.error('Cloud services validation crashed', { error })
  process.exitCode = 1
})
