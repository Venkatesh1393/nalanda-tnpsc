import path from 'node:path'

import multer from 'multer'

import {
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_MAX_FILE_SIZE_BYTES,
  PDF_METADATA_ALLOWED_EXTENSIONS,
  PDF_METADATA_ALLOWED_MIME_TYPES,
  PDF_METADATA_MAX_FILE_SIZE_BYTES,
} from '../constants/questionImport'
import { ApiError } from '../utils/ApiError'

interface UploadConfig {
  maxFileSizeBytes: number
  allowedMimeTypes: Set<string>
  allowedExtensions: Set<string>
}

/**
 * Buffers uploads in memory rather than writing to local disk — per
 * docs/Architecture.md's stateless/autoscaled backend design, no request
 * handler should assume it's still running on the same instance by the time
 * a background job might touch the file. Handlers stream `file.buffer`
 * straight to Cloudinary (services/media/cloudinaryUpload.service.ts), never
 * persist it locally.
 *
 * Validates MIME type *and* file extension — a spoofed `Content-Type`
 * header alone isn't caught by the MIME check, so both must agree with an
 * allowlist before the file is accepted. Cloudinary itself does a further,
 * real content-sniffing validation on upload (a `.jpg`-renamed non-image
 * fails there), which is the final line of defense.
 */
function createUploadMiddleware(config: UploadConfig) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxFileSizeBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      if (!config.allowedMimeTypes.has(file.mimetype)) {
        callback(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`))
        return
      }
      if (!config.allowedExtensions.has(extension)) {
        callback(
          ApiError.badRequest(`Unsupported file extension: ${extension || '(none)'}`),
        )
        return
      }
      callback(null, true)
    },
  })
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/** Profile avatar — small, tight limit (matches the frontend's existing
 * 2MB client-side hint in `avatar-uploader.tsx`). */
export const uploadAvatarImage = createUploadMiddleware({
  maxFileSizeBytes: 2 * 1024 * 1024,
  allowedMimeTypes: IMAGE_MIME_TYPES,
  allowedExtensions: IMAGE_EXTENSIONS,
})

/** Question / Current Affairs illustrative images — content team uploads,
 * larger ceiling than an avatar. */
export const uploadContentImage = createUploadMiddleware({
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: IMAGE_MIME_TYPES,
  allowedExtensions: IMAGE_EXTENSIONS,
})

/** Study material assets — notes/reference images or PDFs, hence the wider
 * MIME/extension allowlist and higher ceiling than a plain image upload. */
export const uploadStudyMaterialFile = createUploadMiddleware({
  maxFileSizeBytes: 20 * 1024 * 1024,
  allowedMimeTypes: new Set([...IMAGE_MIME_TYPES, 'application/pdf']),
  allowedExtensions: new Set([...IMAGE_EXTENSIONS, '.pdf']),
})

/** Bulk Question Import (Sprint 4 Step 53; `.docx` added Step 71.5) —
 * CSV/XLSX/Word, capped well below a size that could realistically hold
 * more than `IMPORT_MAX_ROWS` rows; `questionImport.service.ts` enforces
 * the row-count ceiling itself once the file is actually parsed, and
 * dispatches to a format-specific parser by extension. */
export const uploadBulkImportFile = createUploadMiddleware({
  maxFileSizeBytes: IMPORT_MAX_FILE_SIZE_BYTES,
  allowedMimeTypes: IMPORT_ALLOWED_MIME_TYPES,
  allowedExtensions: IMPORT_ALLOWED_EXTENSIONS,
})

/** PDF metadata extraction (Sprint 4 Step 71.5) — small ceiling, the file is
 * never stored, only its `Info` dictionary is read
 * (`services/admin/pdfMetadata.service.ts`). */
export const uploadPdfMetadataFile = createUploadMiddleware({
  maxFileSizeBytes: PDF_METADATA_MAX_FILE_SIZE_BYTES,
  allowedMimeTypes: PDF_METADATA_ALLOWED_MIME_TYPES,
  allowedExtensions: PDF_METADATA_ALLOWED_EXTENSIONS,
})
