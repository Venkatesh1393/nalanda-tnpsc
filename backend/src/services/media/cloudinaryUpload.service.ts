import { cloudinary } from '../../config/cloudinary'
import { ApiError } from '../../utils/ApiError'

/**
 * The only file besides `config/cloudinary.ts` that touches the `cloudinary`
 * SDK object (per `config/cloudinary.ts`'s own header comment and
 * `docs/FolderStructure.md`'s "one adapter per third-party SDK" rule) —
 * every upload/delete anywhere in the app goes through these two functions.
 */

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
 * simply `await` it.
 */
export function uploadBuffer(
  buffer: Buffer,
  options: UploadBufferOptions,
): Promise<UploadedMedia> {
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
          reject(ApiError.internal(error?.message ?? 'Cloudinary upload failed'))
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
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    })
    return result.result === 'ok' || result.result === 'not found'
  } catch {
    return false
  }
}
