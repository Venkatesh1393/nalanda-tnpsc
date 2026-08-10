import type { Request } from 'express'

import type { DisplayLanguage } from '../services/learn.service'

/** Every Learn read endpoint accepts an optional `?lang=en|ta` query param
 * to pick which half of a bilingual field to flatten into the response
 * (the frontend has no translated UI strings yet, but content itself is
 * bilingual from day one — see `models/shared/bilingualText.ts`). Defaults
 * to `en`; any value other than exactly `ta` is treated as `en`, never a
 * validation error — a malformed `lang` shouldn't 400 an otherwise-valid
 * content request. */
export function resolveDisplayLanguage(req: Request): DisplayLanguage {
  return req.query.lang === 'ta' ? 'ta' : 'en'
}
