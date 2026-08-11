import { cloudinary } from '../../config/cloudinary'
import { ApiError } from '../../utils/ApiError'
import { isTransientCloudError, withRetry, withTimeout } from '../../utils/resilience'

/**
 * The only file besides `config/cloudinary.ts` that touches the `cloudinary`
 * SDK object (per `config/cloudinary.ts`'s own header comment and
 * `docs/FolderStructure.md`'s "one adapter per third-party SDK" rule) —
 * every upload/delete anywhere in the app goes through these two functions.
 *
 * Sprint 4 Step 73 — neither the Cloudinary Node SDK's `upload_stream` nor
 * `uploader.destroy` accepts a timeout option, so both are wrapped in
 * `withTimeout` (`utils/resilience.ts`) to bound how long a request handler
 * can be left waiting on Cloudinary; both also retry once on a transient
 * network error only (re-sending the same in-memory buffer/public_id is
 * always safe — see `withRetry`'s default "network errors only" policy).
 */

const UPLOAD_TIMEOUT_MS = 30_000
const DELETE_TIMEOUT_MS = 10_000

export type CloudinaryResourceType = 'image' | 'raw' | 'video'

export interface UploadedMedia {
  url: string
  secureUrl: string
  publicId: string
  resourceType: CloudinaryResourceType
  format: string
  bytes: number
  width?: number
  height?: number
}

export interface UploadBufferOptions {
  /** Cloudinary folder, e.g. `nalanda/avatars`, `nalanda/questions`. */
  folder: string
  resourceType: CloudinaryResourceType
  /** Deterministic public ID (without folder prefix) — when given, a
   * re-upload overwrites the same asset in place instead of accumulating
   * orphaned versions on every "change photo" click. */
  publicId?: string
}

/**
 * Streams an in-memory buffer (multer's `memoryStorage`, never a temp file
 * on disk — see `middleware/upload.middleware.ts`) straight to Cloudinary.
 * Wraps the SDK's callback-style `upload_stream` in a Promise so callers can
 * simply `await` it. Public entry point adds the timeout/retry wrapper
 * (Sprint 4 Step 73) — `uploadOnce` is the bare single-attempt call.
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: UploadBufferOptions,
): Promise<UploadedMedia> {
  try {
    return await withRetry(
      () => withTimeout(uploadOnce(buffer, options), UPLOAD_TIMEOUT_MS, 'Cloudinary upload'),
      { retries: 1, label: 'Cloudinary upload', isRetryable: isTransientCloudError },
    )
  } catch (error) {
    // Converted to ApiError only here, after retries are exhausted — the raw
    // error (with Cloudinary's `http_code` or a network `code`) has to
    // survive up to this point for `isTransientCloudError` above to see it.
    const message = error instanceof Error ? error.message : 'Cloudinary upload failed'
    throw ApiError.internal(message)
  }
}

/** Bare single-attempt upload — rejects with the RAW SDK/network error
 * (never pre-wrapped into `ApiError`) so `uploadBuffer`'s retry classifier
 * can inspect it. */
function uploadOnce(buffer: Buffer, options: UploadBufferOptions): Promise<UploadedMedia> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        public_id: options.publicId,
        overwrite: Boolean(options.publicId),
        // Content moderated at validation time (MIME/extension/size, see
        // upload.middleware.ts) — this step's stated scope, not Cloudinary's
        // AI moderation add-ons.
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'))
          return
        }
        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type as CloudinaryResourceType,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        })
      },
    )
    uploadStream.end(buffer)
  })
}

/**
 * Deletes a previously-uploaded asset. Called both on explicit "remove
 * photo"/"remove file" requests and, silently, before every replace-upload
 * so old assets never accumulate as orphaned Cloudinary storage. Never
 * throws — a delete failure (asset already gone, transient network error)
 * must not block the caller's own DB write, and is logged instead by the
 * caller if it wants to know.
 */
export async function deleteAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<boolean> {
  try {
    const result = await withRetry(
      () =>
        withTimeout(
          cloudinary.uploader.destroy(publicId, { resource_type: resourceType }),
          DELETE_TIMEOUT_MS,
          'Cloudinary delete',
        ),
      { retries: 1, label: 'Cloudinary delete', isRetryable: isTransientCloudError },
    )
    return result.result === 'ok' || result.result === 'not found'
  } catch {
    return false
  }
}
