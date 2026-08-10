# Nalanda TNPSC — Final Audit (Sprint 4 Step 70)

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 70 — Final Production Audit |
| **Last Updated** | 2026-08-10 |
| **Scope** | Full application: `backend/`, `frontend/`, `admin/` — not `mobile/` (unbuilt) |
| **Method** | Live verification against real MongoDB Atlas/Cloudinary/Firebase this session (not recalled from memory) — every claim below has a command or a cited file/line behind it |

This is the evidence base. `docs/PRODUCTION_READINESS_REPORT.md` is the
executive synthesis of what's here — read that first if you want the
verdict; read this for the receipts. No code was changed to produce this
document (audit-only, per this step's explicit "do not create new
features").

---

## Part 1 — The 19 Functional Modules

Classified PASS (fully real, backend+frontend wired end to end) / PARTIAL
(real in part — the specific gap is always named) / FAIL (not wired to the
real backend at all, regardless of whether the backend itself is real).
Verified via two independent read-only agents cross-referencing
`frontend/src/services/*.ts` against `apiClient` calls vs. `localStorage`
usage, plus this session's own live `verify:*` script runs for backend
correctness.

| # | Module | Verdict | Evidence |
|---|---|---|---|
| 1 | **Registration** | PARTIAL | `authService.ts`: Google login and Email/Password registration are real (Firebase Web SDK → `apiClient.post(endpoints.auth.google/.email)`). Email OTP (`requestEmailOtp`/`verifyEmailOtp`) is still fully mocked — `verifyEmailOtp` checks against a hardcoded `MOCK_ACCEPTED_OTP = '123456'`, no backend call. Unchanged since first documented. |
| 2 | **Authentication** | PASS | Login, session refresh, JWT verification, RBAC all real and re-verified in Sprint 4 Step 66's dedicated audit (RS256, issuer-checked, refresh rotation with reuse detection). |
| 3 | **Dashboard** | PASS | `dashboardService.ts` — every section (streak, XP, achievements, recommended topics, upcoming exams, weak topics) calls the real `GET /dashboard`. Only `getTodayTasks`/`getDashboardNotifications` are disclosed stubs with no backend module behind them at all (Study Plan was never built) — not a regression, a known scope boundary. |
| 4 | **Learning** | PASS | `learnService.ts` fully real (subjects/topics/subtopics/lessons/video/notes/search, all `apiClient.get`). `learnProgressService.ts` progress-tracking and video/notes bookmarking real. Only the Revision Queue (`getRevisionQueue`) has no backend model — disclosed, not core to the module. |
| 5 | **Smart Practice** | PARTIAL | `practiceService.ts`/`practiceSessionService.ts`: only `mode: 'quiz'` (Topic Quiz) is real (`createRealSession`, routed via 24-hex ObjectId detection). `hundred-questions`/`sectional`/`mock`/`pyq` are still fully `localStorage`-backed mocks, sourced from `services/mock/questionsMockService.ts`. `mode-picker-page.tsx` presents all 5 modes identically with no UI distinction — a user cannot tell which modes are real from the UI. |
| 6 | **AI Explanation** | PARTIAL | Backend is real, live-verified via `verify:ai-optimization` (0 failed assertions this session). `ai-explanation-panel.tsx` correctly calls `apiClient.post(endpoints.ai.explain)` and gates on real entitlements. **Blocked in practice**: `ANTHROPIC_API_KEY` is blank in `backend/.env` (confirmed this session) — a real request returns a graceful 503, not a generated explanation, until a key is added. Also only reachable from real (Topic Quiz) sessions per #5. |
| 7 | **AI Tutor** | PARTIAL | Backend + frontend both fully real and wired (`aiTutorService.ts`, all functions call `apiClient`, no mock path exists at all) — the most complete of the three AI features. Same `ANTHROPIC_API_KEY` blocker as #6: infrastructure (conversations, pinning, search, rate limits, cost tracking) all verified via `verify:ai-tutor` (0 failed), but actual model replies won't generate until a real key is set. |
| 8 | **Weekly Exam** | PASS | `liveExamService.ts` — every function calls `apiClient` directly, no mock precedent ever existed for this module. |
| 9 | **Current Affairs** | PASS | `currentAffairsService.ts` fully real. Only `readProgressPercent` (a local-only UI nicety) isn't backend-tracked — disclosed, non-core. |
| 10 | **Leaderboard** | PARTIAL | Backend fully real, live-verified (`verify:gamification`'s leaderboard sanity checks, 0 failed). `leaderboardService.ts` (frontend) is correctly real — but **has zero importers anywhere in `frontend/src/pages/`**: there is no dedicated in-app Leaderboard page/route for a signed-in user. Only the *public* landing page's "Top Rankers" section (a different service, `publicService.ts`) surfaces this data today. |
| 11 | **Notifications** | PASS | `notificationsService.ts` fully real, all 7 functions call `apiClient`, live-verified via `verify:notifications` this session (0 failed, including the email/SMS/push graceful-not-configured paths). |
| 12 | **Payments** | PARTIAL | `paymentsService.ts` fully real — checkout, order creation, history all call `apiClient`. Order creation works today with the real `RAZORPAY_KEY_ID` (TEST mode) present in `.env`. **Blocked**: `RAZORPAY_WEBHOOK_SECRET` is blank (confirmed this session) — since the webhook is the *only* path that activates a subscription (by design, Sprint 4 Step 55's "no unsafe manual payment manipulation" rule), a real checkout today can create an order but will never actually grant entitlements. |
| 13 | **Premium/Entitlements** | PASS | Gating reads from real backend responses (`subscription.entitlements.*` from `getMySubscription()`, `summary.subscriptionTier` from the real Dashboard response) — not hardcoded anywhere checked. |
| 14 | **Admin Portal** | PASS | `adminService.ts`'s dashboard stats, user/invite management all real, confirmed via live calls. |
| 15 | **Question Upload** | PASS | `adminQuestionsService.ts` — single CRUD and bulk CSV/XLSX import (`previewImport`/`confirmImport`) both real. AI Question Generator backend live-verified via `verify:ai-question-generator` this session (0 failed) — same `ANTHROPIC_API_KEY`-blank caveat as #6/#7 applies to actually *generating* drafts, but the review/approve/reject/promote-to-Question pipeline around it is fully real and independently tested (fixture-based, doesn't need a live AI call to verify). |
| 16 | **Analytics** | PASS | `analyticsService.ts` — all 10 chart-backing functions call real `apiClient.get` endpoints, no mock data found. |
| 17 | **Bookmarks** | PARTIAL | Learn (video/notes), Current Affairs, and real-question (Topic Quiz) bookmarks all go through the real `POST /bookmarks/toggle`. Bookmarks created from the still-mocked Practice modes (#5 — 100Q/Sectional/Mock/PYQ) use synthetic non-ObjectId ids and fall back to `localStorage` — a direct, expected consequence of #5, not an independent bug. |
| 18 | **Profile** | **FAIL** | `profileService.ts` is 100% `localStorage` — every function (`getProfile`, `updateProfile`, `updateAvatar`, notification preferences, security sessions, data export, account deletion) reads/writes `localStorage['nalanda-profile']` behind an artificial delay. A real, correct backend-calling facade **already exists** (`userService.ts` — `getMe`/`updateMe`/`updatePreferences` against the real, long-since-live `GET/PATCH /users/me`) but has **zero callers anywhere in `frontend/src`** — dead code. Avatar upload reads a file to a `data:` URL and stores it via the mock service; no Cloudinary call exists on this path despite Cloudinary being fully real and independently verified (Part 3). This is the single most significant gap found in this audit. |
| 19 | **Logout/Login** | PASS | `auth-provider.tsx` — silent-refresh on mount, `logout()` calling the real revocation endpoint then Firebase sign-out, both confirmed real. |

**Tally: 11 PASS · 7 PARTIAL · 1 FAIL** (Registration, Onboarding — checked
alongside Auth this session and confirmed PASS — is not one of the 19 named
modules but is mentioned here since it was verified: `onboardingService.ts`
is fully real except a disclosed, separate `generateStudyPlan` AI-plan stub.)

---

## Part 2 — The 7 Integrations

| Integration | Verdict | Evidence |
|---|---|---|
| **Frontend** | PASS (build health) / see Part 1 for feature-completeness gaps | `npm run lint`/`typecheck`/`build` all clean this session. Bundle is code-split since Sprint 4 Step 67 (main entry 424.74 kB, down from 2,024.79 kB pre-split). |
| **Backend** | PASS | `npm run lint`/`typecheck`/`build` all clean this session. 9/9 integration `verify:*` scripts passed with 0 failed assertions each (Part 4). |
| **MongoDB** | PASS | Live connection confirmed repeatedly this session (`verify:seed` read real collection counts: 29 questions, 4 subjects, 72 sessions, etc.). Indexes reviewed and confirmed adequate in Sprint 4 Step 67. |
| **Firebase** | PASS, with one disclosed Medium finding | Real service account, real project, `authService.ts` confirmed calling it live. Sprint 4 Step 66's finding — `config/firebase.ts`'s `verifyIdToken(idToken)` still lacks `checkRevoked: true` — re-confirmed still present this session (unfixed, not a regression, never addressed since it was found). |
| **Cloudinary** | PASS (backend) | Live-verified end to end this session via `verify:cloudinary` — real upload + delete round trip against the live account, 0 failures. Frontend under-uses it — see Part 1 #18 (Profile). |
| **Razorpay** | PARTIAL | Real TEST-mode keys present and checkout/order-creation works. `RAZORPAY_WEBHOOK_SECRET` blank blocks subscription activation end to end — confirmed this session (Part 1 #12). |
| **AI Provider (Anthropic)** | PARTIAL | All three AI features' surrounding infrastructure (routing, validation, entitlement gating, cost tracking, rate limiting, prompt construction) is real and independently verified via fixture-based tests that don't require a live model call. `ANTHROPIC_API_KEY` is blank — confirmed this session — so no feature can actually generate a real AI response today; every AI endpoint returns a graceful, documented 503 instead of crashing. |

---

## Part 3 — Test Categories Run This Session

| Category | Result | Detail |
|---|---|---|
| **Lint** | PASS | `backend`/`frontend`/`admin` — `eslint .` clean, zero errors/warnings, all three. |
| **Build** | PASS | `tsc` + `vite build` clean, all three. Admin's bundle is a single 705.72 kB chunk (193.04 kB gzip) — Sprint 4 Step 67's code-splitting work only covered `frontend/`, a disclosed scope decision at the time (lower ROI for an internal-only tool) — not a new finding, just re-confirmed still true. |
| **Unit Tests** | **FAIL — none exist** | Confirmed via `package.json` (no jest/vitest/mocha/supertest in any of the three apps) and `backend/tests/README.md`'s own long-standing note: the folder scaffold exists, picking a runner is an explicitly flagged future step requiring the user's decision first. This is the one category in this entire audit with no partial credit — it is a real, complete gap. |
| **Integration Tests** | PASS | The 9 `verify:*` scripts are this project's real integration test suite (live Atlas/Cloudinary, disposable fixtures, self-cleaning). All 9 run this session, **0 failed assertions across all of them**: `seed`, `cloudinary`, `search`, `notifications`, `gamification`, `adaptive-practice`, `ai-optimization`, `ai-tutor`, `ai-question-generator`. |
| **Performance Tests** | PASS | `npm run benchmark:cache` this session against live data: leaderboard aggregation 954.0ms → 48.3ms cached (19.8×), public top rankers 101.2ms → 34.0ms (3.0×), exam-code lookup 53.2ms → 0.03ms (1653×). Frontend bundle-size reduction from Step 67 re-confirmed via this session's own build (Part 2). |
| **Security Tests** | PARTIAL | No automated security test suite exists (same root gap as Unit Tests). Sprint 4 Step 66's manual/agent-driven security audit remains the closest thing to one — re-verified this session that 2 of its 3 Medium findings are still open (Firebase `checkRevoked`, above; unescaped `$regex` in `aiConversation.repository.ts`'s search, confirmed still present at line 30) and one Low finding (a stray `list-users.tmp.ts` PII-dumping script) has since been resolved — the file no longer exists. `npm audit` this session: backend 9 moderate (transitive, `exceljs`/`firebase-admin` chain, unchanged since Step 66), frontend 7 (1 moderate, 6 high — `react-router` CSRF-bypass advisory on a direct dependency, unchanged since Step 66), admin 0. None of these have been patched since they were first found — `npm audit fix` was never run. |

---

## Part 4 — Raw Command Log (this session)

```
backend:  npm run lint          → clean
backend:  npm run typecheck     → clean
backend:  npm run build         → clean, dist/server.js produced
frontend: npm run lint          → clean
frontend: npm run typecheck     → clean
frontend: npm run build         → clean, main chunk 424.74 kB / gzip 117.65 kB
admin:    npm run lint          → clean
admin:    npm run typecheck     → clean
admin:    npm run build         → clean, single chunk 705.72 kB / gzip 193.04 kB

backend:  npm run verify:seed                    → live Atlas read confirmed, real data present
backend:  npm run verify:cloudinary              → PASS (real upload+delete round trip)
backend:  npm run verify:search                  → PASS (0 failed assertions)
backend:  npm run verify:notifications           → PASS (0 failed assertions)
backend:  npm run verify:gamification            → PASS (0 failed assertions)
backend:  npm run verify:adaptive-practice       → PASS (0 failed assertions)
backend:  npm run verify:ai-optimization         → PASS (0 failed assertions)
backend:  npm run verify:ai-tutor                → PASS (0 failed assertions)
backend:  npm run verify:ai-question-generator   → PASS (0 failed assertions)
backend:  npm run benchmark:cache                → 19.8x / 3.0x / 1653.1x cache speedups

backend:  npm audit --production   → 9 moderate (transitive, exceljs/firebase-admin chain)
frontend: npm audit --production   → 7 (1 moderate, 6 high — react-router CSRF-bypass)
admin:    npm audit --production   → 0 vulnerabilities
```

No test data was left behind — every `verify:*` script's own cleanup step
confirmed "no test fixtures left behind" in its final log line.
