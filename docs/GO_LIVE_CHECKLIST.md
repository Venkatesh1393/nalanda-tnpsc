# Nalanda TNPSC — Go-Live Checklist

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 75 — Production Go-Live |
| **Last Updated** | 2026-08-11 |
| **Full evidence** | `docs/SPRINT_4_STEP_75_FINAL_REPORT.md` |
| **Deployment steps** | `docs/DEPLOYMENT_GUIDE.md` |

The single actionable list to work through before real users touch this
product. Every item traces to a live-verified finding in this step's final
report — nothing here is aspirational. Items are grouped by whether they
block launch outright.

---

## 🔴 Launch-Blocking (must all be ✅ before go-live)

- [ ] **Profile/Settings wired to the real backend.** Today `frontend/src/services/profileService.ts`
      is 100% `localStorage` — a user's name/avatar/preference edits vanish
      on a new device or cleared cache. The real endpoints
      (`GET/PATCH /users/me`, `PATCH /users/me/preferences`) are live-verified
      working in this step. Fix scope: point Settings' components at
      `userService.ts` (already written, zero callers) instead of
      `profileService.ts`, and wire avatar upload to the real Cloudinary
      endpoint instead of local `data:` URLs. No backend work needed.
- [ ] **`RAZORPAY_WEBHOOK_SECRET` set, live webhook registered.** Confirmed
      still blank this session. Checkout creates a real order today but
      **no subscription ever activates** — the webhook is the only
      activation path, by design (`docs/Deployment.md` §9.4).
- [ ] **`npm audit fix` run in `frontend/`.** `react-router`/`react-router-dom`
      7.12.0–7.18.1 (direct dependency) still carry an unpatched
      CSRF-bypass advisory — confirmed unchanged this session (7
      vulnerabilities: 1 moderate, 6 high). Re-run lint/typecheck/build
      after to confirm nothing broke.
- [ ] **A decision on Smart Practice's 4 mock modes** (100 Questions/
      Sectional/Mock/PYQ). They're still fully `localStorage`-backed with
      no backend module, and the UI presents all 5 modes identically —
      a student cannot tell which ones are real. Either finish the backend
      wiring or visibly label/hide the unfinished modes before launch;
      shipping the current silent ambiguity risks a support/trust problem.

## ✅ Already Resolved Since the Last Audit (Step 70)

- [x] **Source control** — `git init` + pushed to `origin` (a real GitHub
      remote) is confirmed live this session. No longer a blocker.
- [x] **Automated MongoDB backups** — `npm run backup:database` +
      `restore:database` built and restore-drill-verified (Sprint 4 Step 73).
      Still needs a cron/Task Scheduler entry on the real production host —
      see the Strongly Recommended section below.
- [x] **Self-hosted error/slow-query/slow-request/webhook-failure tracking**
      (`SystemEvent`, Sprint 4 Step 74) — closes the "errors are invisible"
      gap without a third-party dependency.

---

## 🟡 Strongly Recommended (not hard blockers, real value)

- [ ] **`ANTHROPIC_API_KEY`** — still blank, confirmed this session. Every
      AI feature (Explanation/Tutor/Question Generator) is fully built,
      entitlement-gated, and live-verified correct (`403` for free-tier
      users tested live this session) — but returns a graceful `503`
      instead of a real answer until a key exists.
- [ ] **`checkRevoked: true`** on `config/firebase.ts`'s `verifyIdToken`
      call — still absent, confirmed this session (Sprint 4 Step 66 finding,
      unfixed). Narrow-window risk: a revoked Firebase token stays valid
      until Nalanda's own short-lived access token expires.
- [ ] **Escape user input before `$regex`** in
      `repositories/aiConversation.repository.ts`'s chat-search — still
      unescaped, confirmed this session (Sprint 4 Step 66 finding,
      unfixed). Scoped to a user's own conversations only, but a crafted
      pattern could still cause event-loop-blocking backtracking.
- [ ] **Schedule `npm run backup:database`** via cron/Task Scheduler on
      the real production host (`docs/BackupStrategy.md` §2.1) — the
      script itself is done and tested, only the timer is missing.
- [ ] **Wire real alerting** against `docs/AlertingStrategy.md`'s
      thresholds — every monitoring signal is queryable today, none of
      them push a notification yet.
- [ ] **Cloudinary `q_auto`/`f_auto` automatic image optimization** — not
      used anywhere in `services/media/cloudinaryUpload.service.ts`,
      confirmed this session. A real, low-effort image-performance win
      left on the table (see Performance findings, final report §4).
- [ ] **Leaderboard in-app page** — the data and API are real; there's no
      signed-in-user-facing route for it today, only the public landing
      page's "Top Rankers" section.

---

## Pre-Deploy Technical Checklist

Everything in `docs/Deployment.md` §14 still applies — the items below are
this step's additions/re-confirmations, not a replacement for that list.

- [ ] All three apps (`backend`/`frontend`/`admin`) build/lint/typecheck
      clean — re-confirmed this session.
- [ ] All 12 backend `verify:*` integration scripts pass — re-confirmed
      this session (`npm run verify:seed`, `:cloudinary`, `:search`,
      `:notifications`, `:gamification`, `:adaptive-practice`,
      `:ai-optimization`, `:ai-tutor`, `:ai-question-generator`,
      `:content-pipeline`, `:cloud-services`, `:monitoring`).
- [ ] `npm run audit:indexes` clean — 37 collections, 136 indexes, zero
      flagged (re-confirmed this session).
- [ ] Production `.env` filled from `.env.production.example` with
      **production-only** credentials (`docs/Deployment.md` §9) — never
      copied from development.
- [ ] TLS certificates issued, `nginx/gateway.conf` domains match reality
      (`docs/Deployment.md` §7.4).
- [ ] `GET /api/health` and `GET /api/health/ready` both return 200 after
      deploy, before routing real traffic.
- [ ] Walk the student journey manually once against the real production
      URLs (this step's own journey test — §3 below — was run against the
      real backend API directly; a browser click-through against
      production hasn't been done, since no browser automation tool exists
      in this environment).

---

## Student Journey — Verified This Step

Every step below was exercised via live, authenticated API calls against
the real backend and real MongoDB Atlas (not mocked, not simulated) —
detail in the final report §3. `Register`/`Login` specifically were
verified by code review only (a real Firebase OAuth exchange needs a
browser, unavailable in this environment) — every step after login used a
real, backend-issued JWT.

Register (code review) → Login (code review) → Dashboard ✅ → Learn ✅ →
Practice ✅ (full session: create → answer → finish → XP/coins/achievement
awarded) → Analytics ✅ → Premium/Entitlements ✅ (correctly gated) → AI
Explanation ✅ (correctly gated, `403` for free tier) → AI Tutor ✅
(correctly gated) → Weekly Exam ✅ → Leaderboard ✅ → Profile ✅ (backend
only — real `GET/PATCH /users/me` confirmed working; frontend doesn't call
it, see Launch-Blocking above)

---

## Launch Decision Rule

Per this step's own instruction: **the application is ready for launch
only if every critical module passes.** Two of the four Launch-Blocking
items above (`RAZORPAY_WEBHOOK_SECRET`, the dependency advisory) are
configuration/command fixes with no code risk. The other two (Profile
wiring, Smart Practice mode disclosure) are small, bounded frontend
changes. **None of the four are done as of this audit — the application is
NOT yet cleared for public launch.** See
`docs/SPRINT_4_STEP_75_FINAL_REPORT.md` for the full module-by-module
verdict.
