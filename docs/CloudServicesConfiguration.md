# Nalanda TNPSC — Production Cloud Services Configuration

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 73 — Production Cloud Services |
| **Last Updated** | 2026-08-11 |
| **Covers** | MongoDB Atlas, Firebase, Cloudinary, Razorpay, Anthropic (AI Provider) |

This document is the operational reference for the five external services
this backend depends on: how development and production are kept separate,
how to validate live credentials before a deploy, and what resilience
(timeouts, retry, graceful degradation) each integration has today.
`docs/Deployment.md` §9 covers *provisioning* each service (creating the
production account/project/cluster); this document covers *runtime
behavior* once it's provisioned. `docs/BackupStrategy.md` covers backup in
full depth — §4 here only summarizes it.

---

## 1. Development vs. Production separation

Every service's credentials come from `backend/.env`, driven by three
template files that never share values: `.env.example` (development),
`.env.test.example` (test), `.env.production.example` (production).
`config/env.ts` validates all of them through one Zod schema at boot, and
`validateProductionConfig()` (same file) runs additional value-level checks
only when `NODE_ENV=production` (documented in `docs/Deployment.md` §2).

| Service | Required to boot? | Dev credentials | Production credentials | Isolation |
|---|---|---|---|---|
| **MongoDB Atlas** | Yes (`MONGODB_URI`) | `nalanda_tnpsc` database, shared dev cluster | Dedicated production database, dedicated Atlas user, IP-allowlisted (`docs/Deployment.md` §9.1) | Different database name + different DB user, same or different cluster |
| **Firebase** | Yes (`FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY_BASE64`) | Dev/shared Firebase project | Separate production Firebase project + fresh Admin SDK service account (`docs/Deployment.md` §9.2) | Fully separate Firebase project — different user records, different quota |
| **Cloudinary** | Yes (`CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET`) | Dev cloud/account | Separate production cloud/account (`docs/Deployment.md` §9.3) | Fully separate media library |
| **Razorpay (Payments)** | No — optional, gated by `isRazorpayConfigured()` | Test-mode keys (`rzp_test_...`) | Live-mode keys (`rzp_live_...`) + live webhook secret, all three set together (`docs/Deployment.md` §9.4) | Test mode never touches real money; live mode requires Razorpay KYC/activation first |
| **AI Provider (Anthropic)** | No — optional, gated by `isAnthropicConfigured()` | Dev API key (or blank) | Separate production API key (`docs/Deployment.md` §9.5) | Separate key isolates production cost/usage tracking (Admin AI Usage dashboard) from dev experimentation |

The two optional services (Razorpay, Anthropic) are optional **everywhere**,
not just at boot — every caller checks `isRazorpayConfigured()`/
`isAnthropicConfigured()` before using them and fails that one request
gracefully, never the whole app (§3). MongoDB/Firebase/Cloudinary are
required at boot — `config/env.ts`'s Zod schema refuses to start the
process at all without them, in every environment.

---

## 2. Validation — `npm run verify:cloud-services`

`backend/src/scripts/verifyCloudServices.ts` makes one real, timeout-bounded
call against each of the five services using whatever `backend/.env`
currently has configured, and prints a PASS/FAIL/SKIPPED report:

```bash
cd backend
npm run verify:cloud-services
```

| Result | Meaning |
|---|---|
| `PASS` | Live credentials confirmed — a real authenticated call succeeded |
| `FAIL` | The service is required (Mongo/Firebase/Cloudinary) or configured-but-broken (Razorpay/Anthropic) and the call failed — **fix before deploying** |
| `SKIPPED` | Razorpay or Anthropic simply isn't configured yet — expected in development, not a failure |

What each check actually does:

- **MongoDB**: connects (`connectDatabase()`, §3.1's retry/timeout logic
  applies here too), then `db.admin().ping()`.
- **Firebase**: `admin.auth().listUsers(1)` — a real authenticated call
  against the Firebase project, not just "does the key decode."
- **Cloudinary**: `cloudinary.api.ping()` — confirms credentials only; for a
  full upload/delete round trip through the actual app code path, run
  `npm run verify:cloudinary` separately (Sprint 4 Step 66, unchanged).
- **Payments (Razorpay)**: if configured, `orders.all({ count: 1 })`; also
  reports whether the webhook secret is set (a `PASS` with a warning if the
  checkout keys work but the webhook doesn't — subscriptions can't activate
  without it, `docs/Deployment.md` §9.4).
- **AI Provider (Anthropic)**: if configured, `client.models.list({ limit:
  1 })` — a real authenticated call that costs zero tokens, unlike a
  completion request.

This is a fast credential/connectivity check, meant to run before every
deploy (wire it into `docs/DEPLOYMENT_GUIDE.md` Phase 4 alongside the
existing `verify:*` scripts) — it is not a substitute for the deeper,
service-specific scripts (`verify:cloudinary`, `verify:seed`) that already
exist.

**Live-verified in this step** against this project's real development
credentials: 4/5 `PASS` (MongoDB, Firebase, Cloudinary, Razorpay), 1
`SKIPPED` (Anthropic — `ANTHROPIC_API_KEY` still blank, matching every prior
audit).

---

## 3. Resilience — timeouts, retry, graceful degradation

`backend/src/utils/resilience.ts` (new this step) provides two shared
primitives every adapter below composes:

- **`withTimeout(promise, ms, label)`** — bounds how long a caller waits.
  Not true cancellation (none of these SDKs expose an `AbortSignal` at this
  call shape) — the underlying HTTP request may still complete in the
  background, but the request handler is never left hanging indefinitely.
- **`withRetry(fn, options)`** — exponential backoff (capped), retrying only
  errors classified as transient. Default policy is network-level errors
  only (`ECONNRESET`/`ECONNREFUSED`/`ETIMEDOUT`/etc.); `isTransientCloudError`
  additionally retries provider-reported `429`/`5xx`. **Never** retries a
  plain `4xx` — a bad API key or malformed request fails identically on
  every attempt, so retrying just delays the real error.

| Service | Timeout | Retry | Graceful degradation |
|---|---|---|---|
| **MongoDB** | `serverSelectionTimeoutMS`/`connectTimeoutMS`: 10s, `socketTimeoutMS`: 45s (`config/database.ts`) | Initial connection: 5 attempts, exponential backoff up to 15s (pre-existing, Step 68). Post-connect drops handled by the driver's own auto-reconnect. | `GET /api/health/ready` returns 503 while disconnected (`controllers/health.controller.ts`) — load balancer stops routing, doesn't restart the process |
| **Firebase** | `verifyIdToken`: 10s (new) | None — a failed verification fails the login attempt immediately (fail-closed is correct for auth, not something to silently retry) | `verifyFirebaseIdToken` catches every failure and returns a generic `401` — never an unhandled error |
| **Cloudinary** | Upload: 30s, Delete: 10s (new — the SDK has no built-in timeout) | 1 retry on transient network/5xx/429 errors only (new) | `uploadBuffer` fails the one upload request with a clean `ApiError`; `deleteAsset` **never throws** — a delete failure is logged by the caller, never blocks the caller's own DB write (pre-existing contract, preserved) |
| **Razorpay (Payments)** | Order creation: 15s (new — the SDK has no built-in timeout) | **Deliberately none** — a timeout here is ambiguous (the order may have already been created on Razorpay's side with the response merely lost), and retrying could create a duplicate real order with no local record to detect it against. See `services/payment.service.ts`'s `ORDER_CREATE_TIMEOUT_MS` comment. | `requireRazorpayConfigured()` gates every entry point — checkout fails with a clear "not configured" error when keys are blank, never crashes |
| **AI Provider (Anthropic)** | 20s (pre-existing, Step 57 — the SDK accepts `timeout` directly) | SDK's own retry (2 attempts, 429/5xx) **plus** one app-level fallback attempt for non-transport failures like a model refusal or schema-validation failure (pre-existing, Step 58) | `isAnthropicConfigured()` gates every entry point — AI Explanation/Tutor/Question Generator fail that one request with "temporarily unavailable," the rest of the app (Standard Explanation, etc.) is unaffected |

---

## 4. Automatic Backups

Full detail in `docs/BackupStrategy.md` — summary:

- **`npm run backup:database`** (new this step) — streams every MongoDB
  collection to gzip-compressed EJSON, no external tool install required.
  Retains the newest 7 runs automatically.
- **`npm run restore:database -- --archive <path> [--confirm]`** — the
  tested counterpart; dry-run by default. This step's live restore drill
  (into the same non-empty database, the realistic case) confirmed both the
  read path and the duplicate-safe write path work correctly without
  touching existing data.
- **Not yet automated on a schedule** — needs a cron/Task Scheduler entry on
  whichever host ends up running this in production (`docs/BackupStrategy.md`
  §2.1 has the exact cron line). The script itself is done and verified;
  only "runs unattended, on a timer" remains.
- Cloudinary and Firebase data are durable at the provider level and don't
  need an app-side backup mechanism (`docs/BackupStrategy.md` §3–4).

---

## 5. Never expose secrets — how this is enforced

- Every credential lives only in `backend/.env` (gitignored) or, in
  production, a secret manager — never committed, never logged.
  `middleware/errorHandler.middleware.ts` sends the real error message to
  the client only in development; production always gets a generic message,
  with the real detail going to `logs/error.log` only.
- `config/firebase.ts` explicitly never logs the decoded private key
  material, only whether decoding succeeded.
- `verifyCloudServices.ts` and `backupDatabase.ts`/`restoreDatabase.ts`
  above never print a credential value — only service names, counts, and
  boolean/enum status.
- `.gitignore` (root and `backend/`) excludes `.env*`, `backups/` (real user
  data dumps), and — fixed this project during Sprint 4 Step 72 —
  `*.pem`/`*.key` (an untracked SSH key was found sitting unignored at the
  repo root).
