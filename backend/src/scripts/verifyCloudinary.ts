import { cloudinary } from '../config/cloudinary'
import { logger } from '../config/logger'
import { deleteAsset, uploadBuffer } from '../services/media/cloudinaryUpload.service'

/**
 * Real-connectivity sanity check (`npm run verify:cloudinary`) — confirms
 * `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` in
 * `.env` are live credentials (not placeholders that merely satisfy
 * `config/env.ts`'s zod schema), then round-trips one real, tiny image
 * through the exact same `services/media/cloudinaryUpload.service.ts`
 * upload/delete path every real upload route uses, and confirms cleanup —
 * never leaves the test asset behind. Not a test suite (none is installed
 * yet, see `backend/tests/README.md`); a manual verification aid, same
 * spirit as `seed/verify.ts`.
 */

// A real, valid 1x1 transparent PNG (67 bytes) — not a placeholder string.
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

async function main() {
  logger.info('Pinging Cloudinary API to confirm credentials are live...')
  const ping = await cloudinary.api.ping()
  if (ping.status !== 'ok') {
    throw new Error(`Unexpected ping response: ${JSON.stringify(ping)}`)
  }
  logger.info('Cloudinary credentials verified live', { ping })

  logger.info(
    'Uploading a real test image via services/media/cloudinaryUpload.service...',
  )
  const buffer = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64')
  const uploaded = await uploadBuffer(buffer, {
    folder: 'nalanda/dev-tests',
    resourceType: 'image',
  })
  logger.info('Upload succeeded', { uploaded })

  if (!uploaded.secureUrl.startsWith('https://res.cloudinary.com/')) {
    throw new Error(`Unexpected secure_url shape: ${uploaded.secureUrl}`)
  }

  logger.info('Deleting the test asset to leave the account clean...')
  const deleted = await deleteAsset(uploaded.publicId, 'image')
  if (!deleted) {
    throw new Error(`Cleanup delete failed for public_id: ${uploaded.publicId}`)
  }
  logger.info('Cleanup succeeded — Cloudinary integration verified end-to-end.')
}

main().catch((error) => {
  logger.error('Cloudinary verification failed', { error })
  process.exitCode = 1
})
