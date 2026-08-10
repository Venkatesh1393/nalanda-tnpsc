import { createHash } from 'node:crypto'

/** SHA-256 hex digest — used to store refresh tokens as a hash
 * (docs/Authentication.md §5: "the backend stores only a hash of the
 * refresh token, never the raw value"). Not for passwords — Nalanda never
 * touches a password; Firebase owns that entirely. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
