/**
 * Sprint 4 Step 67 — every image the Admin Panel renders today (Current
 * Affairs article images, `services/adminCurrentAffairsService.ts`) is a
 * Cloudinary delivery URL returned by the backend's already-real Cloudinary
 * integration. Cloudinary serves whatever transform string appears right
 * after `/upload/` in the URL, so this never touches the uploaded asset
 * itself — it only changes what gets delivered to this specific `<img>`:
 * `f_auto` picks the smallest format the requesting browser actually
 * supports (AVIF/WebP where available, falling back cleanly), `q_auto`
 * lets Cloudinary pick the smallest quality that still looks right, and an
 * optional `w_` cap stops a full-resolution upload from being shipped to a
 * thumbnail-sized preview.
 *
 * Any URL that doesn't match Cloudinary's `/upload/` delivery shape (a
 * non-Cloudinary URL, or one already carrying its own transform) is
 * returned unchanged — this only ever adds a transform, never breaks one.
 */
export function optimizedCloudinaryUrl(url: string, maxWidthPx?: number): string {
  const marker = '/upload/'
  const index = url.indexOf(marker)
  if (index === -1) return url

  const transforms = ['f_auto', 'q_auto']
  if (maxWidthPx) transforms.push(`w_${maxWidthPx}`, 'c_limit')

  const insertAt = index + marker.length
  return `${url.slice(0, insertAt)}${transforms.join(',')}/${url.slice(insertAt)}`
}
