import type { auth } from 'firebase-admin'

import type { AccessTokenPayload } from './jwt.types'

declare global {
  namespace Express {
    interface Request {
      /** Populated by middleware/auth.middleware.ts after verifying the JWT. */
      user?: AccessTokenPayload
      /** Populated by middleware/verifyFirebaseToken.middleware.ts after
       * verifying a client-supplied Firebase ID token — only present on the
       * auth routes that accept one (`POST /auth/google`, `POST /auth/email`). */
      firebaseUser?: auth.DecodedIdToken
      /** Captured by `express.json()`'s `verify` option in app.ts — the
       * exact raw bytes of the request body, needed because Razorpay's
       * webhook signature (Sprint 4 Step 56) is computed over the raw body
       * string, which a re-serialized `JSON.stringify(req.body)` can
       * silently fail to match (key order/whitespace differences). */
      rawBody?: Buffer
    }
  }
}

export {}
