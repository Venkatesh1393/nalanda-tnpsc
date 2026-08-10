# Nalanda TNPSC — REST API Design

| | |
|---|---|
| **Document Owner** | Backend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md`, `docs/InformationArchitecture.md`, `docs/Architecture.md`, `docs/FolderStructure.md`, `docs/Database.md` |
| **Base URL** | `https://api.nalandatnpsc.com/api/v1` |

---

## 0. API Conventions (Apply to Every Endpoint Below)

- **Versioning:** All routes are prefixed `/api/v1`. Breaking changes ship as `/api/v2`, never as an in-place change to `v1`.
- **Authentication header:** `Authorization: Bearer <accessToken>` (the Nalanda JWT described in `docs/Architecture.md` §4, not the raw Firebase token). Endpoints marked "None" are public.
- **Response envelope:** every response, success or failure, returns `{ success, data, error, meta }` — `data` is populated on success, `error` (with a machine-readable `code` and human-readable `message`) on failure, `meta` optionally carries pagination info.
- **Pagination convention:** list endpoints accept `page` and `limit` query parameters and return `meta: { page, limit, totalItems, totalPages }`.
- **Common error codes** (not repeated per endpoint unless specific to it): `UNAUTHORIZED` (401, missing/invalid token), `FORBIDDEN` (403, valid token but insufficient role/tier), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).
- **Idempotency:** all state-mutating endpoints that could plausibly be retried by a flaky mobile connection (payment verification, test submission) are designed to be safely repeatable — repeating the call returns the already-committed result rather than creating a duplicate.

---

## 1. Authentication APIs

#### `POST /auth/register`
- **Method:** POST
- **Authentication:** None
- **Request:** Body — `name` (string, required), `email` (string, required), `languagePreference` (enum: `ta`/`en`/`bilingual`, optional)
- **Response:** `userId`, `email`, `otpSent` (boolean), `otpExpiresInSeconds`
- **Errors:** `EMAIL_ALREADY_REGISTERED`, `VALIDATION_ERROR`
- **Validation:** `email` must be a valid, non-disposable-flagged format; `name` 2–60 characters
- **Status Codes:** `201 Created` (account created, OTP sent), `400 Bad Request`, `409 Conflict` (email already registered)

#### `POST /auth/otp/verify`
- **Method:** POST
- **Authentication:** None
- **Request:** Body — `email` (string, required), `otp` (string, 6 digits, required)
- **Response:** `accessToken`, `user` (`id`, `email`, `role`, `subscriptionTier`, `isNewUser`) — `refreshToken` set as an HttpOnly/Secure/SameSite cookie, not in the body
- **Errors:** `INVALID_OTP`, `OTP_EXPIRED`, `TOO_MANY_ATTEMPTS`
- **Validation:** `otp` must be exactly 6 numeric digits
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized` (wrong/expired code), `429 Too Many Requests` (lockout)

#### `POST /auth/otp/resend`
- **Method:** POST
- **Authentication:** None
- **Request:** Body — `email` (string, required)
- **Response:** `otpSent` (boolean), `cooldownSeconds`
- **Errors:** `RESEND_COOLDOWN_ACTIVE`, `USER_NOT_FOUND`
- **Validation:** `email` must correspond to a pending, unverified registration
- **Status Codes:** `200 OK`, `404 Not Found`, `429 Too Many Requests`

#### `POST /auth/google`
- **Method:** POST
- **Authentication:** None (bears a Firebase ID token instead of a Nalanda JWT)
- **Request:** Body — `firebaseIdToken` (string, required)
- **Response:** `accessToken`, `user` (`id`, `email`, `role`, `subscriptionTier`, `isNewUser`); `refreshToken` set as a cookie
- **Errors:** `INVALID_FIREBASE_TOKEN`, `TOKEN_EXPIRED`
- **Validation:** Token signature and expiry verified server-side via Firebase Admin SDK
- **Status Codes:** `200 OK` (existing user), `201 Created` (new account provisioned), `401 Unauthorized`

#### `POST /auth/refresh`
- **Method:** POST
- **Authentication:** None (relies on the HttpOnly refresh-token cookie)
- **Request:** No body — refresh token read from cookie
- **Response:** New `accessToken`
- **Errors:** `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_REUSED` (triggers full session revocation as a security response)
- **Validation:** Refresh token must be unexpired, unrevoked, and match its stored hash
- **Status Codes:** `200 OK`, `401 Unauthorized`

#### `POST /auth/logout`
- **Method:** POST
- **Authentication:** Required (Bearer JWT)
- **Request:** No body
- **Response:** `loggedOut: true`
- **Errors:** None beyond standard auth errors
- **Validation:** N/A
- **Status Codes:** `200 OK`, `401 Unauthorized`

#### `POST /auth/logout-all`
- **Method:** POST
- **Authentication:** Required (Bearer JWT)
- **Request:** No body
- **Response:** `sessionsRevoked` (count)
- **Errors:** None beyond standard auth errors
- **Validation:** N/A
- **Status Codes:** `200 OK`, `401 Unauthorized`

---

## 2. Dashboard APIs

#### `GET /dashboard/summary`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (string, optional, defaults to the user's primary exam goal)
- **Response:** `streak` (`current`, `longest`), `syllabusCompletionPercent`, `nextRecommendedAction` (`type`, `refId`, `title`), `upcomingLiveExam` (nullable)
- **Errors:** `NO_EXAM_GOAL_SET`
- **Validation:** `examCategory`, if provided, must be one of the platform's supported enums
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### `GET /dashboard/today-tasks`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (optional)
- **Response:** Array of `{ taskId, type, title, refId, status }`
- **Errors:** `NO_STUDY_PLAN_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`, `401 Unauthorized`

#### `POST /dashboard/tasks/{taskId}/complete`
- **Method:** POST
- **Authentication:** Required
- **Request:** Path — `taskId`
- **Response:** Updated task `{ taskId, status: "done" }`, `updatedStreak`
- **Errors:** `TASK_NOT_FOUND`, `TASK_ALREADY_COMPLETE`
- **Validation:** `taskId` must belong to the requesting user's active study plan
- **Status Codes:** `200 OK`, `404 Not Found`, `409 Conflict`

---

## 3. Subjects APIs

#### `GET /subjects`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (string, required)
- **Response:** Array of `{ subjectId, name (ta/en), order, iconUrl }`
- **Errors:** `INVALID_EXAM_CATEGORY`
- **Validation:** `examCategory` required and must be a supported enum value
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### `GET /subjects/{subjectId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `subjectId`
- **Response:** `{ subjectId, name, examCategories, topicCount, order }`
- **Errors:** `SUBJECT_NOT_FOUND`
- **Validation:** `subjectId` must be a valid ObjectId
- **Status Codes:** `200 OK`, `404 Not Found`

---

## 4. Topics APIs

#### `GET /topics`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `subjectId` (required)
- **Response:** Array of `{ topicId, name, order, subtopicCount }`
- **Errors:** `SUBJECT_NOT_FOUND`
- **Validation:** `subjectId` required
- **Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`

#### `GET /topics/{topicId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `topicId`
- **Response:** `{ topicId, name, subjectId, order, userProgress: { percentComplete } }`
- **Errors:** `TOPIC_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `GET /topics/{topicId}/subtopics`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `topicId`
- **Response:** Array of `{ subtopicId, name, order, hasVideo, hasNotes, isBookmarked }`
- **Errors:** `TOPIC_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `POST /topics/{topicId}/complete`
- **Method:** POST
- **Authentication:** Required
- **Request:** Path — `topicId`
- **Response:** `{ topicId, status: "complete", updatedSyllabusCompletionPercent }`
- **Errors:** `TOPIC_NOT_FOUND`, `ALREADY_COMPLETE`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`, `409 Conflict`

---

## 5. Questions APIs

#### `GET /questions`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `subjectId`, `topicId`, `subtopicId`, `difficulty`, `examCategory`, `tags`, `page`, `limit` (all optional except at least one filter recommended)
- **Response:** Paginated array of `{ questionId, questionText, difficulty, options: [{ optionId, text }] }` — **`isCorrect` is deliberately never included in this response**
- **Errors:** `INVALID_FILTER_COMBINATION`
- **Validation:** At least one of `subjectId`/`topicId`/`subtopicId`/`tags` required to avoid unbounded scans
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### `GET /questions/{questionId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `questionId`
- **Response:** `{ questionId, questionText, options (no isCorrect), difficulty, isBookmarked }`
- **Errors:** `QUESTION_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `GET /questions/{questionId}/explanation`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `questionId`
- **Response:** `{ explanation, correctOptionId }` — **only returned if the requesting user has an existing `Question Attempt` for this question**, preventing answer leakage via a direct explanation request
- **Errors:** `NOT_ATTEMPTED_YET`, `QUESTION_NOT_FOUND`
- **Validation:** Server-side check for a prior attempt before revealing the answer
- **Status Codes:** `200 OK`, `403 Forbidden` (not yet attempted), `404 Not Found`

#### `POST /questions/{questionId}/report`
- **Method:** POST
- **Authentication:** Required
- **Request:** Path — `questionId`; Body — `reason` (enum: `wrong_answer`, `typo`, `unclear`, `duplicate`, `other`), `comment` (string, optional)
- **Response:** `{ reportId, status: "submitted" }`
- **Errors:** `QUESTION_NOT_FOUND`, `VALIDATION_ERROR`
- **Validation:** `reason` required and must be a supported enum value
- **Status Codes:** `201 Created`, `400 Bad Request`, `404 Not Found`

---

## 6. Practice APIs

#### `POST /practice/sessions`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `mode` (enum: `topic_quiz`, `sectional`, `mock`, `pyq`), `examCategory`, plus mode-specific filters (`topicId`, `mockTestId`, `pyqYear`, `questionCount`)
- **Response:** `{ sessionId, questions: [...no answers...], durationMinutes, startedAt }`
- **Errors:** `INSUFFICIENT_QUESTIONS_AVAILABLE`, `DAILY_LIMIT_REACHED` (free tier), `MOCK_TEST_NOT_FOUND`
- **Validation:** `mode` required; filter combination must resolve to at least the requested `questionCount`
- **Status Codes:** `201 Created`, `400 Bad Request`, `403 Forbidden` (tier limit), `404 Not Found`

#### `GET /practice/sessions/{sessionId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `sessionId`
- **Response:** `{ sessionId, questions, answeredSoFar, remainingSeconds, status }` — enables resume-after-disconnect (per `docs/UserJourney.md` Screen 7)
- **Errors:** `SESSION_NOT_FOUND`, `SESSION_ALREADY_SUBMITTED`
- **Validation:** `sessionId` must belong to the requesting user
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `PUT /practice/sessions/{sessionId}/answers/{questionId}`
- **Method:** PUT
- **Authentication:** Required
- **Request:** Path — `sessionId`, `questionId`; Body — `selectedOptionId` (nullable, allows "unanswer"), `markedForReview` (boolean)
- **Response:** `{ saved: true, savedAt }` — this is the autosave call invoked on every answer change
- **Errors:** `SESSION_NOT_FOUND`, `SESSION_EXPIRED`, `SESSION_ALREADY_SUBMITTED`
- **Validation:** `selectedOptionId`, if present, must match one of the question's actual option IDs
- **Status Codes:** `200 OK`, `400 Bad Request`, `409 Conflict` (already submitted)

#### `POST /practice/sessions/{sessionId}/submit`
- **Method:** POST
- **Authentication:** Required
- **Request:** Path — `sessionId`; No body (submits whatever autosaved state exists)
- **Response:** `{ sessionId, status: "submitted", resultAvailableAt }` — scoring may be near-instant or briefly queued for large mocks
- **Errors:** `SESSION_NOT_FOUND`, `ALREADY_SUBMITTED`
- **Validation:** Idempotent — resubmitting an already-submitted session returns the same result rather than erroring destructively
- **Status Codes:** `200 OK`, `404 Not Found`, `409 Conflict`

#### `GET /practice/sessions/{sessionId}/result`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `sessionId`
- **Response:** `{ score, totalQuestions, correctCount, sectionalBreakdown, percentile, timeTakenSeconds }`
- **Errors:** `RESULT_NOT_READY`, `SESSION_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `202 Accepted` (still processing), `404 Not Found`

#### `GET /practice/history`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `mode` (optional), `examCategory` (optional), `page`, `limit`
- **Response:** Paginated array of `{ sessionId, mode, score, attemptedAt }`
- **Errors:** None beyond standard
- **Validation:** N/A
- **Status Codes:** `200 OK`, `401 Unauthorized`

---

## 7. Analytics APIs

#### `GET /analytics/overview`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (required)
- **Response:** `{ sectionalScores, overallPercentile, lastUpdatedAt }`
- **Errors:** `INSUFFICIENT_DATA` (no attempts yet)
- **Validation:** `examCategory` required
- **Status Codes:** `200 OK`, `204 No Content` (no data yet), `400 Bad Request`

#### `GET /analytics/weak-areas`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (required), `limit` (optional, default 5)
- **Response:** Array of `{ topicId, topicName, averageScore, rank }`
- **Errors:** `INSUFFICIENT_DATA`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `204 No Content`

#### `GET /analytics/trends`
- **Method:** GET
- **Authentication:** Required (deeper history gated to Pro tier per `docs/PRD.md` §9)
- **Request:** Query — `examCategory`, `from`, `to` (date range)
- **Response:** Array of `{ date, score }`
- **Errors:** `TIER_UPGRADE_REQUIRED` (free tier requesting a range beyond the allowed preview window)
- **Validation:** `from` must be before `to`; range capped for free-tier requests
- **Status Codes:** `200 OK`, `403 Forbidden`

#### `GET /analytics/rank`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `examCategory` (required)
- **Response:** `{ percentile, rankEstimate, cohortSize, disclaimer (if cohort is small) }`
- **Errors:** `INSUFFICIENT_COHORT_SIZE` (returns disclaimer, not a hard error)
- **Validation:** N/A
- **Status Codes:** `200 OK`

---

## 8. Payments APIs

#### `GET /payments/plans`
- **Method:** GET
- **Authentication:** None (viewable pre-signup, per the transparent-pricing recommendation in `docs/CompetitorAnalysis.md`)
- **Request:** None
- **Response:** Array of `{ tier, monthlyPrice, annualPrice, features[] }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `POST /payments/orders`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `tier` (enum), `billingCycle` (enum: `monthly`/`annual`), `promoCode` (optional)
- **Response:** `{ razorpayOrderId, amount, currency, razorpayKeyId }`
- **Errors:** `INVALID_TIER`, `PROMO_CODE_INVALID`, `PROMO_CODE_EXPIRED`
- **Validation:** `tier`/`billingCycle` must be supported enum values
- **Status Codes:** `201 Created`, `400 Bad Request`

#### `POST /payments/verify`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`
- **Response:** `{ status: "processing" }` — actual activation is confirmed via webhook (§9 of `docs/Architecture.md`); this endpoint only signals the client-side checkout completed
- **Errors:** `SIGNATURE_MISMATCH`, `ORDER_NOT_FOUND`
- **Validation:** HMAC signature recomputed and compared server-side
- **Status Codes:** `200 OK`, `400 Bad Request`

#### `POST /payments/webhook`
- **Method:** POST
- **Authentication:** None (verified via Razorpay webhook signature header instead of a user JWT)
- **Request:** Body — Razorpay's standard webhook event payload
- **Response:** `{ received: true }`
- **Errors:** `INVALID_WEBHOOK_SIGNATURE`
- **Validation:** Signature verified against the raw request body before any processing; `webhookEventId` checked against `Payments.webhookEventId` unique index for idempotency
- **Status Codes:** `200 OK`, `401 Unauthorized` (bad signature — Razorpay will retry)

#### `GET /payments/subscription`
- **Method:** GET
- **Authentication:** Required
- **Request:** None
- **Response:** `{ tier, status, currentPeriodEnd, autoRenew }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `POST /payments/subscription/cancel`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `reason` (optional, for churn analytics)
- **Response:** `{ status: "cancelled", accessUntil }` — access continues until `currentPeriodEnd`, per standard SaaS cancellation norms
- **Errors:** `NO_ACTIVE_SUBSCRIPTION`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `GET /payments/invoices`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `page`, `limit`
- **Response:** Paginated array of `{ invoiceId, amount, date, status }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /payments/invoices/{invoiceId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `invoiceId`
- **Response:** `{ invoiceId, downloadUrl }`
- **Errors:** `INVOICE_NOT_FOUND`, `FORBIDDEN` (invoice belongs to another user)
- **Validation:** Ownership check against the requesting user
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

---

## 9. Leaderboard APIs

#### `GET /leaderboard`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `scope` (enum: `liveExam`, `examCategory`, `global`), `scopeRefId` (conditional), `period` (optional)
- **Response:** Array (top 100) of `{ rank, userDisplayName, score }` — per the bounded-array design in `docs/Database.md` §4.4
- **Errors:** `INVALID_SCOPE`, `SCOPE_REF_NOT_FOUND`
- **Validation:** `scopeRefId` required when `scope` is `liveExam`
- **Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`

#### `GET /leaderboard/me`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `scope`, `scopeRefId` (conditional)
- **Response:** `{ rank, score, percentile }` — computed on-demand from `Analytics` if the user falls outside the stored top-100 array
- **Errors:** `INSUFFICIENT_DATA`
- **Validation:** Same as above
- **Status Codes:** `200 OK`, `204 No Content`

---

## 10. Bookmarks APIs

#### `GET /bookmarks`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `contentType` (optional filter), `page`, `limit`
- **Response:** Paginated array of `{ bookmarkId, contentType, contentId, contentPreview, note, createdAt }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `POST /bookmarks`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `contentType` (enum), `contentId` (required), `note` (optional)
- **Response:** `{ bookmarkId, createdAt }`
- **Errors:** `CONTENT_NOT_FOUND`, `ALREADY_BOOKMARKED`
- **Validation:** `contentId` must exist within the collection named by `contentType`
- **Status Codes:** `201 Created`, `400 Bad Request`, `409 Conflict`

#### `PATCH /bookmarks/{bookmarkId}`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Path — `bookmarkId`; Body — `note`
- **Response:** `{ bookmarkId, note, updatedAt }`
- **Errors:** `BOOKMARK_NOT_FOUND`, `FORBIDDEN`
- **Validation:** Ownership check
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `DELETE /bookmarks/{bookmarkId}`
- **Method:** DELETE
- **Authentication:** Required
- **Request:** Path — `bookmarkId`
- **Response:** `{ deleted: true }`
- **Errors:** `BOOKMARK_NOT_FOUND`, `FORBIDDEN`
- **Validation:** Ownership check
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

---

## 11. Profile APIs

#### `GET /profile`
- **Method:** GET
- **Authentication:** Required
- **Request:** None
- **Response:** `{ name, photoUrl, email, examGoals, languagePreference, streak, institutionId }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `PATCH /profile`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Body — any of `name`, `languagePreference` (partial update)
- **Response:** Updated profile object
- **Errors:** `VALIDATION_ERROR`
- **Validation:** `name` 2–60 characters if provided
- **Status Codes:** `200 OK`, `400 Bad Request`

#### `POST /users/me/avatar` (Sprint 3 Step 50 — real, implemented)
- **Method:** POST
- **Authentication:** Required
- **Request:** `multipart/form-data`, field `avatar` — one image file (JPEG/PNG/WebP, ≤2MB)
- **Response:** Updated `MeDTO` (same shape as `GET /users/me`), `avatarUrl` now the Cloudinary `secure_url`
- **Errors:** `BAD_REQUEST` (missing file, unsupported MIME/extension), `UPLOAD_LIMIT_FILE_SIZE`
- **Validation:** MIME type + file extension allowlist, 2MB max, single file — enforced server-side (`middleware/upload.middleware.ts`) before the buffer is ever sent to Cloudinary
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`
- **Note:** Implemented as a **backend-proxied upload** (multer `memoryStorage` buffer → `cloudinary.uploader.upload_stream`, see `services/media/cloudinaryUpload.service.ts`), not the client-direct signed-widget pattern this section previously described — the signed-widget pattern can't enforce server-side MIME/extension/size validation before Cloudinary accepts the file, which Step 50 explicitly required. `CLOUDINARY_API_SECRET` never leaves the backend either way. Re-uploading overwrites the same Cloudinary asset (deterministic `public_id` = user id); the previous asset is deleted only if it predates this scheme (e.g. a Google-synced photo).

#### `DELETE /users/me/avatar` (Sprint 3 Step 50 — real, implemented)
- **Method:** DELETE
- **Authentication:** Required
- **Request:** None
- **Response:** Updated `MeDTO`, `avatarUrl: null`
- **Errors:** None (deleting a non-existent avatar is a no-op success)
- **Validation:** N/A
- **Status Codes:** `200 OK`, `401 Unauthorized`
- **Note:** Deletes the Cloudinary asset (if one was ever uploaded via the endpoint above) before clearing `Profile.photoUrl`/`photoPublicId` — never leaves an orphaned asset in Cloudinary storage.

> **Endpoint namespace note:** the two endpoints above are real and live at `/users/me/avatar` (`routes/user.routes.ts`), not `/profile/...` as the rest of this section's `GET`/`PATCH /profile` describe — see `docs/PROJECT_CONTEXT.md`'s known doc-inconsistencies list (the implemented Auth/Profile module uses `/users/me`, this doc section predates that decision and was never reconciled). Not touched further here — out of scope for Step 50.

#### `PATCH /profile/exam-goals`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Body — `examGoals` (array of `{ examCategory, targetDate, dailyStudyHours, isPrimary }`)
- **Response:** Updated `examGoals` array
- **Errors:** `VALIDATION_ERROR`, `TOO_MANY_EXAM_GOALS` (platform-defined cap)
- **Validation:** At least one entry required; exactly one `isPrimary: true`
- **Status Codes:** `200 OK`, `400 Bad Request`

#### `PATCH /profile/notification-preferences`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Body — per-channel booleans (`push`, `email`, `sms`) and per-type toggles (`studyReminders`, `liveExamAlerts`, etc.)
- **Response:** Updated preferences object
- **Errors:** `VALIDATION_ERROR`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `400 Bad Request`

#### `POST /profile/data-export`
- **Method:** POST
- **Authentication:** Required
- **Request:** None
- **Response:** `{ requestId, status: "queued", estimatedCompletionTime }` — fulfills the DPDP Act export right (`docs/UserJourney.md` Screen 11)
- **Errors:** `EXPORT_ALREADY_IN_PROGRESS`
- **Validation:** N/A
- **Status Codes:** `202 Accepted`, `409 Conflict`

#### `DELETE /profile`
- **Method:** DELETE
- **Authentication:** Required, plus a re-authentication step (recent login or re-entered OTP)
- **Request:** Body — `confirmation` (must equal a fixed phrase, e.g., `"DELETE MY ACCOUNT"`)
- **Response:** `{ status: "scheduled_for_deletion", effectiveAt }`
- **Errors:** `REAUTH_REQUIRED`, `CONFIRMATION_MISMATCH`
- **Validation:** Confirmation string must match exactly
- **Status Codes:** `202 Accepted`, `400 Bad Request`, `401 Unauthorized`

---

## 12. Study Planner APIs

#### `GET /study-plans/{examCategory}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `examCategory`
- **Response:** `{ planId, targetDate, dailyHours, dailyTasks, planVersion }`
- **Errors:** `PLAN_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `POST /study-plans`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `examCategory`, `targetDate`, `dailyHours` — internally invokes the AI Orchestration Service's study-plan handler (`docs/Architecture.md` §5)
- **Response:** `{ planId, dailyTasks, planVersion, aiPromptVersion }`
- **Errors:** `PLAN_ALREADY_EXISTS` (use regenerate instead), `AI_SERVICE_UNAVAILABLE`
- **Validation:** `targetDate` must be in the future or `"not_sure"` accepted as a sentinel value
- **Status Codes:** `201 Created`, `409 Conflict`, `503 Service Unavailable`

#### `PATCH /study-plans/{planId}/tasks/{taskId}`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Path — `planId`, `taskId`; Body — `status` (enum: `pending`, `done`, `skipped`)
- **Response:** Updated task object
- **Errors:** `TASK_NOT_FOUND`, `FORBIDDEN`
- **Validation:** Ownership check
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `POST /study-plans/{planId}/regenerate`
- **Method:** POST
- **Authentication:** Required
- **Request:** Path — `planId`; Body — `reason` (optional, e.g., `"fell_behind"`, `"exam_date_changed"`)
- **Response:** `{ planId, dailyTasks, planVersion: incremented }`
- **Errors:** `PLAN_NOT_FOUND`, `AI_SERVICE_UNAVAILABLE`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`, `503 Service Unavailable`

---

## 13. Current Affairs APIs

#### `GET /current-affairs`
- **Method:** GET
- **Authentication:** None when called without a token (powers the public daily preview on the Website, per `docs/InformationArchitecture.md` §3 and `docs/Landing_Page_Design.md` §12); an authenticated request additionally receives `isBookmarked` per item
- **Request:** Query — `period` (enum: `daily`/`weekly`/`monthly`), `from`, `to`, `page`, `limit`
- **Response:** Paginated array of `{ id, date, title, excerpt, tags }` — `excerpt` is a short (~140 char) plain-text preview of `body`, added so list views never need the full detail payload just to render a card
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /current-affairs/{id}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `id`
- **Response:** `{ id, title, body, examRelevanceTags, date, isBookmarked }`
- **Errors:** `NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

#### `GET /current-affairs/{id}/quiz`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `id`
- **Response:** Array of question objects (same shape as `GET /questions/{id}`, no answers included)
- **Errors:** `QUIZ_NOT_YET_GENERATED`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `202 Accepted` (generation in progress), `404 Not Found`

---

## 14. Admin APIs

*(All endpoints below require `role: admin | content_editor | moderator` as noted; mounted under `/admin` and additionally gated by the RBAC middleware described in `docs/Architecture.md` §4.)*

*(Sprint 4 Step 53 — the `/admin/questions/*` entries below replaced the earlier illustrative spec [async job, signed-Cloudinary-URL bulk upload] with what actually shipped: a synchronous, stateless CRUD + Bulk Import module. No job queue exists anywhere in this backend yet, per the same precedent Analytics/Leaderboard already set — see `docs/PROJECT_CONTEXT.md` §14 and `docs/SPRINT_4_STEP_53_COMPLETION_REPORT.md` for the full reasoning.)*

#### `GET /admin/questions`
- **Method:** GET
- **Authentication:** Required (any `ADMIN_ACCESS_ROLES` member — `moderator`/`content_editor`/`admin`/`support`/`super_admin`)
- **Request:** Query — `search`, `examId`, `subjectId`, `topicId`, `subtopicId`, `difficulty`, `language` (`en`|`ta`), `isPreviousYear`, `status` (`active`|`inactive`|`archived`; omitted = active+inactive), `page`, `limit`
- **Response:** Paginated array of the full admin question DTO (includes `isCorrect` per option, `isActive`/`isPremium`, unlike the student-facing `GET /questions` DTOs)
- **Status Codes:** `200 OK`, `403 Forbidden`

#### `GET /admin/questions/{questionId}`
- **Method:** GET
- **Authentication:** Required (any `ADMIN_ACCESS_ROLES` member)
- **Response:** Full admin question DTO — reachable even when `status: archived`, unlike the list's default filter
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `POST /admin/questions`
- **Method:** POST
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** Body — full question payload (`examIds[]`, `subjectId`/`topicId`/`subtopicId`, `questionText: {en, ta?}`, `options[]` 2-6 entries with exactly one `isCorrect: true` for `mcq_single`, `difficulty`, `questionType`, `explanation?`, `source`, `isPreviousYear`/`pyqYear`, `tnpscExamType?`, `tags[]`, `isActive`/`isPremium`/`aiExplanationEligible`)
- **Response:** The created question DTO
- **Errors:** `BAD_REQUEST` (Zod validation, or a reference that doesn't resolve to a real/active/hierarchically-consistent exam/subject/topic/subtopic)
- **Validation:** Same 2-6/exactly-one-correct rule `Question.model.ts` enforces, checked in the Zod layer first for a specific error message, then again by Mongoose as a second line of defense
- **Status Codes:** `201 Created`, `400 Bad Request`, `403 Forbidden`

#### `PATCH /admin/questions/{questionId}`
- **Method:** PATCH
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** Path — `questionId`; Body — partial question payload (same shape as create, all fields optional)
- **Response:** Updated question DTO
- **Errors:** `NOT_FOUND`, `BAD_REQUEST`
- **Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`

#### `PATCH /admin/questions/{questionId}/status`
- **Method:** PATCH
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** Path — `questionId`; Body — `{ isActive: boolean }`
- **Response:** Updated question DTO — activate/deactivate; an inactive question is never newly selected into a Smart Practice session (`findRandomQuestionIds` filters on `isActive: true`), but stays reachable for review of an already-taken session
- **Status Codes:** `200 OK`, `404 Not Found`

#### `POST /admin/questions/{questionId}/archive` / `POST /admin/questions/{questionId}/restore`
- **Method:** POST
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Response:** Updated question DTO (`status: archived` / no longer archived) — soft-delete via the existing `deletedAt` field (`models/shared/softDelete.plugin.ts`), the same mechanism every other content model already uses; no new schema field
- **Status Codes:** `200 OK`, `404 Not Found`

#### `GET /admin/questions/meta/{exams|subjects|topics|subtopics}`
- **Method:** GET
- **Authentication:** Required (any `ADMIN_ACCESS_ROLES` member)
- **Request:** Query — `subjects` needs `examId`, `topics` needs `subjectId`, `subtopics` needs `topicId`
- **Response:** `[{ id, code|slug, name: {en, ta?} }]` — cascading dropdown data for the question editor/list filters
- **Status Codes:** `200 OK`, `400 Bad Request`

#### `GET /admin/questions/import/template`
- **Method:** GET
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** Query — `format` (`csv` default, or `xlsx`)
- **Response:** A downloadable file with the exact header row the parser expects, one filled example row, and — for XLSX — a second "Instructions" sheet documenting every column (required/optional + description). Generated on the fly from one shared column-definition constant (`constants/questionImport.ts`) that the parser also reads, so the two can never drift apart.
- **Status Codes:** `200 OK`, `403 Forbidden`

#### `POST /admin/questions/import/preview`
- **Method:** POST
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** `multipart/form-data`, field `file` (`.csv` or `.xlsx`, ≤8MB, ≤2000 data rows)
- **Response:** `{ fileName, totalRows, validCount, invalidCount, duplicateCount, rows: [{ rowNumber, raw, status: 'valid'|'invalid'|'duplicate', errors: [{field, message, suggestion?}], warnings[], preview?, duplicateOf? }] }` — **writes nothing to MongoDB.** Duplicate detection covers both within-file (same subtopic + normalized question text) and against MongoDB (per-subtopic-cached comparison)
- **Errors:** `BAD_REQUEST` (unreadable/oversized file, wrong MIME/extension, too many rows) — per-row problems never fail the whole request, they show up in that row's `errors`
- **Status Codes:** `200 OK`, `400 Bad Request`, `403 Forbidden`

#### `POST /admin/questions/import/confirm`
- **Method:** POST
- **Authentication:** Required (`role: content_editor`, `admin`, or `super_admin`)
- **Request:** `multipart/form-data` — the **same file** re-uploaded (never a client-held "resolved" JSON blob — this endpoint always re-parses and re-validates from scratch, so a tampered request body can never inject unvalidated content), plus a `rowNumbers` field (JSON array of the row numbers to commit)
- **Response:** `{ insertedCount, skippedCount, failures: [{rowNumber, message}] }` — only rows that are both requested *and* still `valid` after the fresh re-parse are written, via `insertMany({ordered: false})` for genuine partial-import semantics; every insert writes one `AuditLog` entry (`question.bulkImport`) summarizing the batch
- **Status Codes:** `200 OK`, `400 Bad Request`, `403 Forbidden`

*(Sprint 4 Step 54 — Admin Content Management System. Same conventions as §14's Question entries above: `content_editor`/`admin`/`super_admin` for mutations, any `ADMIN_ACCESS_ROLES` member for reads, every mutation writes an `AuditLog` entry. The old illustrative `POST /admin/live-exams {mockTestId,...}` entry that used to sit here is gone — no `MockTest` model exists in this codebase, `LiveExam` is self-contained per its own model header comment, see `docs/PROJECT_CONTEXT.md` §14.)*

#### `GET/POST /admin/exams`, `GET/PATCH /admin/exams/{id}`, `PATCH /admin/exams/{id}/status`
- Exam has no soft-delete — only activate/deactivate, no archive/restore. `code` is one of the 8 fixed `EXAM_CATEGORY_CODES`; creating a duplicate code is a `409 Conflict`.
- **Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

#### `GET/POST /admin/subjects`, `GET/PATCH /admin/subjects/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `slug`, `name: {en, ta?}`, `examIds: string[]` (≥1, must resolve to real exams), `order`, `icon?`, `isActive`
- Deactivating (`status` → `isActive:false`) or archiving is **rejected** (`400`) if the subject has any active, non-archived `Topic`s — deactivate/archive those first.
- **Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

#### `GET/POST /admin/topics`, `GET/PATCH /admin/topics/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `slug`, `subjectId`, `name`, `order`, `isActive` — `examIds` is never accepted; it's always derived server-side from the parent Subject's `examIds`.
- Deactivate/archive rejected (`400`) while any active `Subtopic` exists underneath.
- **Status Codes:** same as Subjects above

#### `GET/POST /admin/subtopics`, `GET/PATCH /admin/subtopics/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `slug`, `topicId`, `name`, `order`, `estimatedMinutes?`, `isActive` — `subjectId`/`examIds` always derived server-side from the parent Topic.
- Deactivate/archive rejected (`400`) while any active `Lesson` or `StudyMaterial` exists underneath.
- **Status Codes:** same as Subjects above

#### `GET/POST /admin/lessons`, `GET/PATCH /admin/lessons/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `subtopicId`, `title: {en, ta?}`, `type` (`video`|`reading`|`mixed`), `order`, `video?: {cloudinaryAssetId?, durationSeconds?, thumbnailUrl?}`, `transcript?`, `isPremium`, `isActive` — a leaf node, no orphan-check on its own archive/deactivate.
- **Status Codes:** same as Subjects above

#### `GET/POST /admin/study-materials`, `GET/PATCH /admin/study-materials/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `subtopicId`, `title`, `body: {en: string[], ta: string[]}`, `type` (`notes`|`pdf`|`reference`), `isPremium`, `isActive` — plain metadata only, new in Step 54 (no create/update path existed before).
- **File upload/replace/preview/remove** stays on the pre-existing (Step 50) `POST`/`DELETE /study-materials/{id}/file` routes (not under `/admin`) — reused unchanged, `content_editor`/`admin`/`super_admin` gated.
- **Status Codes:** same as Subjects above

#### `GET/POST /admin/current-affairs`, `GET/PATCH /admin/current-affairs/{id}`, `PATCH .../status`, `POST .../archive`, `POST .../restore`
- **Request (create/update):** `date`, `period`, `category`, `title`, `excerpt?`, `body`, `highlights`, `examRelevanceTags: string[]`, `tags: string[]`, `isImportant`, `quizQuestionIds: string[]` (real `Question` refs — "link questions"), `quizQuestions[]` (the article's own embedded comprehension quiz), `isActive`, `publishAt?` (future = scheduled)
- **`PATCH .../status`** — `{isActive}`: `true` = publish (or schedule, if `publishAt` is future); `false` = unpublish.
- Image attach/replace/remove stays on the pre-existing (Step 50) `POST`/`DELETE /current-affairs/{id}/image` routes — reused unchanged.
- **Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

#### `GET/POST /admin/live-exams`, `GET/PATCH /admin/live-exams/{liveExamId}`
- **Request (create/update):** `title`, `description`, `examId`, `subjectIds: string[]`, `questionIds: string[]` (≥1, real questions — search via `GET /admin/questions?search=`), `scheduledStartAt`/`scheduledEndAt`, `durationMinutes`, `marksPerQuestion`, `negativeMarking: {enabled, marksPerWrongAnswer}`, `instructions`, `resultPublication: {mode: 'immediate'|'scheduled', publishAt?}`
- `totalQuestions`/`totalMarks` are **not** accepted from the client — always computed server-side as `questionIds.length` and `questionIds.length × marksPerQuestion`.
- A new exam always starts `status: 'draft'` (invisible to students, per the existing `status !== 'draft'` gate every student-facing read already had).

#### `POST /admin/live-exams/{liveExamId}/publish`
- `draft` → `scheduled` only — the one transition that makes an exam student-visible. `400` if not currently `draft`.

#### `POST /admin/live-exams/{liveExamId}/cancel`
- Any non-`cancelled` status → `cancelled`. Idempotent if already cancelled.

#### `POST /admin/live-exams/{liveExamId}/publish-results`
- Sets a manual `resultPublication.publishedAt` override, honored ahead of the existing `immediate`/`scheduled` timing rules by the same `isResultPublished()` function the student-facing result read already used. Only allowed once the exam's real, time-derived status is `completed` or `cancelled` — `400 Bad Request` otherwise, so results can never leak to a still-live exam.
- **Status Codes (all live-exam admin endpoints):** `200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

#### `GET /admin/users`
- **Method:** GET
- **Authentication:** Required (`role: admin` or `support`)
- **Request:** Query — `search` (email/name), `role`, `status`, `page`, `limit`
- **Response:** Paginated array of `{ userId, name, email, role, subscriptionTier, status }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`, `403 Forbidden`

#### `PATCH /admin/users/{userId}/role`
- **Method:** PATCH
- **Authentication:** Required (`role: admin` only)
- **Request:** Path — `userId`; Body — `role` (enum)
- **Response:** Updated `{ userId, role }`; writes an `AuditLog` entry
- **Errors:** `USER_NOT_FOUND`, `CANNOT_MODIFY_OWN_ROLE`
- **Validation:** An admin cannot demote themselves via this endpoint (prevents accidental lockout)
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `PATCH /admin/users/{userId}/status`
- **Method:** PATCH
- **Authentication:** Required (`role: admin` or `moderator`)
- **Request:** Path — `userId`; Body — `status` (enum: `active`, `suspended`, `deleted`), `reason`
- **Response:** Updated `{ userId, status }`; writes an `AuditLog` entry
- **Errors:** `USER_NOT_FOUND`
- **Validation:** `reason` required when suspending/deleting
- **Status Codes:** `200 OK`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

#### `GET /admin/subscriptions`
- **Method:** GET
- **Authentication:** Required (`role: admin`)
- **Request:** Query — `status`, `tier`, `page`, `limit`
- **Response:** Paginated array of `{ subscriptionId, userId, tier, status, currentPeriodEnd }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`, `403 Forbidden`

#### `POST /admin/subscriptions/{subscriptionId}/refund`
- **Method:** POST
- **Authentication:** Required (`role: admin`)
- **Request:** Path — `subscriptionId`; Body — `amount`, `reason`
- **Response:** `{ refundId, status: "processing" }` — calls Razorpay's refund API server-side
- **Errors:** `SUBSCRIPTION_NOT_FOUND`, `REFUND_AMOUNT_EXCEEDS_PAYMENT`, `RAZORPAY_ERROR`
- **Validation:** `amount` must not exceed the original payment's captured amount
- **Status Codes:** `202 Accepted`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

#### `POST /admin/notifications/broadcast`
- **Method:** POST
- **Authentication:** Required (`role: admin`)
- **Request:** Body — `segment` (`{ examCategory?, subscriptionTier?, region? }`), `title`, `body`, `channel[]`
- **Response:** `{ broadcastId, status: "queued", estimatedRecipientCount }` — enqueued to the async fan-out job (`docs/Database.md` §4.7), never written synchronously
- **Errors:** `VALIDATION_ERROR`, `SEGMENT_TOO_BROAD` (safety check before an accidental all-users blast)
- **Validation:** At least one segment filter required, or an explicit `confirmAllUsers: true` override
- **Status Codes:** `202 Accepted`, `400 Bad Request`, `403 Forbidden`

#### `GET /admin/audit-logs`
- **Method:** GET
- **Authentication:** Required (`role: admin`)
- **Request:** Query — `actorUserId`, `action`, `from`, `to`, `page`, `limit`
- **Response:** Paginated array of `{ actorUserId, action, targetId, timestamp, details }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`, `403 Forbidden`

---

## 15. Notifications APIs

#### `GET /notifications`
- **Method:** GET
- **Authentication:** Required
- **Request:** Query — `isRead` (optional filter), `page`, `limit`
- **Response:** Paginated array of `{ notificationId, type, title, body, isRead, deepLink, createdAt }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `PATCH /notifications/{notificationId}/read`
- **Method:** PATCH
- **Authentication:** Required
- **Request:** Path — `notificationId`
- **Response:** `{ notificationId, isRead: true }`
- **Errors:** `NOTIFICATION_NOT_FOUND`, `FORBIDDEN`
- **Validation:** Ownership check
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `POST /notifications/read-all`
- **Method:** POST
- **Authentication:** Required
- **Request:** None
- **Response:** `{ updatedCount }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /notifications/unread-count`
- **Method:** GET
- **Authentication:** Required
- **Request:** None
- **Response:** `{ unreadCount }`
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

---

## 16. AI APIs

#### `POST /ai/explain`
- **Method:** POST
- **Authentication:** Required (rate-limited more strictly on the free tier — see `docs/Architecture.md` §5)
- **Request:** Body — `questionId` or `subtopicId` (one required), `language` (enum: `ta`/`en`)
- **Response:** `{ explanation, confidence: "high"/"low", promptVersion }`
- **Errors:** `DAILY_AI_LIMIT_REACHED` (free tier), `AI_SERVICE_UNAVAILABLE`
- **Validation:** Exactly one of `questionId`/`subtopicId` required
- **Status Codes:** `200 OK`, `403 Forbidden` (tier limit), `503 Service Unavailable`

#### `POST /ai/chat`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `message` (string, required), `conversationId` (optional, continues an existing thread), `language`
- **Response:** `{ conversationId, reply, confidence, suggestEscalation: boolean }` — the fast, synchronous path from `docs/Architecture.md` §5
- **Errors:** `DAILY_AI_LIMIT_REACHED`, `MESSAGE_TOO_LONG`, `AI_SERVICE_UNAVAILABLE`
- **Validation:** `message` length capped (e.g., 1,000 characters) to bound prompt-construction cost
- **Status Codes:** `200 OK`, `400 Bad Request`, `403 Forbidden`, `503 Service Unavailable`

#### `POST /ai/mains-evaluation`
- **Method:** POST
- **Authentication:** Required (`subscriptionTier: pro` only, per `docs/PRD.md` §9)
- **Request:** Body — `questionId` (a Mains-style prompt/topic), `answerText` or `answerImageUrl` (handwriting upload via Cloudinary)
- **Response:** `{ jobId, status: "queued" }` — the asynchronous path from `docs/Architecture.md` §5
- **Errors:** `TIER_UPGRADE_REQUIRED`, `ANSWER_EMPTY`, `AI_QUEUE_FULL`
- **Validation:** At least one of `answerText`/`answerImageUrl` required
- **Status Codes:** `202 Accepted`, `400 Bad Request`, `403 Forbidden`

#### `GET /ai/mains-evaluation/{jobId}`
- **Method:** GET
- **Authentication:** Required
- **Request:** Path — `jobId`
- **Response:** `{ status: "queued"/"processing"/"complete"/"failed", rubricScores: { structure, relevance, coverage, language }, feedback (once complete) }`
- **Errors:** `JOB_NOT_FOUND`, `FORBIDDEN` (job belongs to another user)
- **Validation:** Ownership check
- **Status Codes:** `200 OK`, `403 Forbidden`, `404 Not Found`

#### `POST /ai/feedback`
- **Method:** POST
- **Authentication:** Required
- **Request:** Body — `aiHistoryId`, `rating` (enum: `up`/`down`)
- **Response:** `{ recorded: true }` — feeds the `AIHistory.userFeedback` field (`docs/Database.md` §4.8) used for prompt-quality tuning
- **Errors:** `AI_HISTORY_ENTRY_NOT_FOUND`
- **Validation:** N/A
- **Status Codes:** `200 OK`, `404 Not Found`

---

## 17. Public / Marketing APIs

Small, intentionally separate, bounded-and-public endpoints that exist only to power pre-signup marketing surfaces (`docs/Landing_Page_Design.md` §7-10, §13, §14, §16) — never used as an authoritative data source inside the authenticated product. Distinct from `GET /leaderboard` (§9), which is authenticated, unbounded by scope/period, and the real ranking source of truth; `GET /public/top-rankers` below is a small, consented, cross-exam-category preview only.

#### `GET /public/stats`
- **Method:** GET
- **Authentication:** None
- **Request:** None
- **Response:** `{ questionsCount, currentAffairsDaysCount, mockTestsCount, studentsCount }` — the four Live Stats Counters (`docs/Landing_Page_Design.md` §7-10); each a simple platform-wide count, refreshed periodically (not necessarily real-time) by a background job rather than computed per-request
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /public/testimonials`
- **Method:** GET
- **Authentication:** None
- **Request:** Query — `limit` (optional, default 12)
- **Response:** Array of `{ id, name, examCategory, quote, avatarUrl }` — `avatarUrl` nullable (falls back to initials in the UI); sourced only from users who have explicitly consented to be featured
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /public/success-stories`
- **Method:** GET
- **Authentication:** None
- **Request:** Query — `limit` (optional, default 4)
- **Response:** Array of `{ id, name, examCategory, examCleared, headline, story, photoUrl }` — `photoUrl` nullable; same consent requirement as testimonials, but for the deeper narrative-length Success Stories section (`docs/Landing_Page_Design.md` §14)
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

#### `GET /public/top-rankers`
- **Method:** GET
- **Authentication:** None
- **Request:** Query — `limit` (optional, default 6)
- **Response:** Array of `{ rank, displayName, examCategory, percentile }` — a small, consented, cross-exam-category preview only; never paginated beyond `limit`, and never treated as the ranking source of truth (that's §9)
- **Errors:** None
- **Validation:** N/A
- **Status Codes:** `200 OK`

---

## 18. Global Error Code Reference

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request failed schema validation |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired access token |
| `INVALID_OTP` / `OTP_EXPIRED` | 401 | OTP-specific auth failures |
| `FORBIDDEN` | 403 | Valid token, but insufficient role/tier/ownership |
| `TIER_UPGRADE_REQUIRED` | 403 | Feature gated to a higher subscription tier |
| `NOT_FOUND` (and resource-specific `*_NOT_FOUND`) | 404 | Requested resource does not exist or isn't visible to this user |
| `CONFLICT` (and resource-specific, e.g. `ALREADY_SUBMITTED`) | 409 | Request conflicts with current resource state |
| `RATE_LIMITED` / `TOO_MANY_ATTEMPTS` | 429 | Rate limit or abuse-prevention threshold hit |
| `AI_SERVICE_UNAVAILABLE` | 503 | Upstream AI provider temporarily unreachable/timed out |
| `INTERNAL_ERROR` | 500 | Unhandled server-side failure — logged with a correlation ID returned in `meta` for support traceability |

---

## Cross-Document Consistency Notes

- Every endpoint's authentication model implements the JWT/RBAC design from `docs/Architecture.md` §4, not a separate scheme.
- `POST /payments/verify` and `POST /payments/webhook` together implement the dual-confirmation flow from `docs/Architecture.md` §6 — verify never activates a plan by itself.
- `POST /ai/explain`, `/ai/chat`, and `/ai/mains-evaluation` map directly onto the synchronous/asynchronous split in `docs/Architecture.md` §5.
- Response shapes for `GET /questions` and `GET /questions/{questionId}` deliberately omit `isCorrect`, consistent with `Questions` embedding options in `docs/Database.md` §4.3 while never exposing the answer key pre-attempt.

---

*End of Document.*
