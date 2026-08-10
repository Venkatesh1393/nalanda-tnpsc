# Nalanda TNPSC — Production Readiness Report

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 70 — Final Production Audit |
| **Last Updated** | 2026-08-10 |
| **Full evidence** | `docs/FINAL_AUDIT.md` |
| **How to deploy once ready** | `docs/DEPLOYMENT_GUIDE.md` |
| **System shape today** | `docs/ARCHITECTURE_FINAL.md` |

## Overall Verdict: **NOT YET READY for public launch — close, with a short, specific, bounded punch list**

This is not a codebase with deep, systemic problems. Eleven of nineteen
functional modules are fully real and independently verified; the backend
passed 9 out of 9 live integration checks with zero failed assertions; the
security posture is sound at the architecture level (JWT design, RBAC,
webhook-only payment activation, no `$where`, no `dangerouslySetInnerHTML`
anywhere). The gaps that remain are specific, named, and — with one
exception — small in scope. This report exists to make sure none of them
get launched past by accident.

---

## Readiness Scorecard

| Area | Status | Detail |
|---|---|---|
| Backend correctness | ✅ **Ready** | Lint/typecheck/build clean; 9/9 integration tests pass |
| MongoDB Atlas | ✅ **Ready** | Live, indexed, cached; backup plan documented but not yet automated |
| Firebase | ✅ **Ready**, 1 minor gap | Live and real; missing `checkRevoked: true` (narrow-window risk) |
| Cloudinary | ✅ **Ready** (backend) | Live-verified end to end; frontend doesn't use it for the one place it should (Profile) |
| Frontend build health | ✅ **Ready** | Lint/typecheck/build clean, code-split |
| Frontend feature completeness | 🟡 **Partial** | 7 of 19 modules have a real, named gap — see Blocking Issues |
| Razorpay | 🟡 **Partial** | Checkout works; subscriptions can't activate (missing webhook secret) |
| AI features | 🟡 **Partial** | Fully built and tested; can't generate real output (missing API key) |
| Automated testing | 🔴 **Not ready** | Zero unit/security tests exist anywhere in the codebase |
| Dependency security | 🔴 **Not ready** | 1 unpatched high-severity advisory on a direct frontend dependency |
| Source control | 🔴 **Not ready** | No `.git` anywhere — the codebase itself has no backup or history |
| Deployment infrastructure | ✅ **Ready to use, not yet activated** | Docker/nginx/CI-CD all built (Steps 68-69) and reviewed; no real host/domain/cert exists yet |

---

## Launch-Blocking Issues (fix before real users touch this)

Ranked by how bad the failure mode is if shipped as-is.

### 1. Profile/Settings is entirely disconnected from the real backend
**What happens today**: a user edits their name, changes preferences, or
uploads an avatar in Settings — it's written to `localStorage` only. On a
different device, a cleared cache, or a reinstall, **it's gone**, silently.
The backend endpoints this should call (`GET/PATCH /users/me`) have existed
and been real since early in the project — there's even a correct frontend
facade (`userService.ts`) already written for it, just never wired to a
page.
**Why this is blocking, not a nice-to-have**: this is a real-user-data-loss
bug wearing a "not yet built" costume. It will look like the product ate a
user's changes.
**Fix scope**: bounded — point `settings-page.tsx`'s components at
`userService.ts` instead of `profileService.ts`, and wire avatar upload to
the existing, real Cloudinary avatar-upload endpoint instead of local
`data:` URLs. No backend work needed at all.

### 2. Payments can take an order without ever granting what was paid for
**What happens today**: checkout creates a real Razorpay order (TEST mode
keys are live). But `RAZORPAY_WEBHOOK_SECRET` is blank, and the webhook is
the *only* path that activates a subscription, by deliberate design (no
"trust the client" shortcut exists). A payment can succeed on Razorpay's
side while the user's account never upgrades.
**Fix scope**: configuration only — register the live webhook URL in the
Razorpay Dashboard, set the same secret in both places. No code change.

### 3. No source control
**What happens today**: this entire codebase exists in exactly one place.
There is no backup, no history, no way to roll back a bad change, and no
way for CI/CD (already built, Steps 68-69) to run at all — every workflow
file is inert until this exists.
**Fix scope**: `git init` + push to a remote — a decision for the user
(previously and correctly not done unilaterally), but the single highest-
leverage five minutes available before launch.

### 4. Unpatched high-severity dependency advisory
`react-router`/`react-router-dom` 7.12.0–7.18.1 (a **direct** frontend
dependency) carry a CSRF-bypass advisory allowing action execution before a
400 response. `npm audit fix` resolves it non-breaking per npm's own
report — this was already known (Sprint 4 Step 66) and never actioned.
**Fix scope**: `npm audit fix` in `frontend/`, then re-run lint/typecheck/
build to confirm nothing broke.

---

## Strongly Recommended Before Launch (not hard blockers, high value)

- **AI features (Explanation/Tutor/Question Generator)**: fully built and
  tested, but silently non-functional without `ANTHROPIC_API_KEY`. Either
  add a real key, or make sure the frontend's "AI unavailable" state (it
  exists — graceful 503 handling was built in) reads as *temporarily
  unavailable*, not broken, to a real user.
- **Smart Practice's 4 mock modes** (100 Questions/Sectional/Mock/PYQ): the
  UI presents all 5 modes identically with no indication that 4 of them
  never leave the browser. At minimum, this should be a conscious decision
  (finish the backend wiring, or visibly label/hide the unfinished modes)
  rather than an invisible gap a user could stumble into mid-exam-prep.
- **Automated MongoDB backups**: today, a bad write or an accidental
  deletion has no recovery path (`docs/BackupStrategy.md` §2.1 — the likely
  free/shared Atlas tier has no automated snapshots). Script the documented
  `mongodump` cron before real user data accumulates.
- **Error tracking**: no Sentry-equivalent exists; an unexpected production
  error is only visible by reading logs after the fact
  (`docs/MonitoringStrategy.md` §3).

---

## Explicitly Not Blocking (known, disclosed, fine to launch without)

- No unit test suite — a real gap, but this codebase's actual correctness
  signal today comes from 9 passing live integration suites + strict
  TypeScript + clean lint, which is a legitimate (if unconventional) safety
  net at this project's current size. Worth fixing next, not before v1.
- Leaderboard has no dedicated in-app page — the data is real and already
  public via the landing page; a signed-in-only view is additive, not a
  correctness issue.
- Legacy Practice-mode bookmarks falling back to `localStorage` — a direct,
  understood consequence of Smart Practice's own mock modes, not a separate
  bug.
- Admin panel's single un-code-split JS bundle — an internal tool, low
  traffic, a deliberate Step 67 scoping call.
- Backend's 9 moderate transitive dependency findings (`exceljs`/
  `firebase-admin` chain) — no direct fix available without a breaking
  downgrade; monitor for upstream patches rather than force one now.

---

## Bottom Line

Ship-readiness here isn't "start over" — it's four specific, mostly-small
items (§ Launch-Blocking) plus a short recommended list. The backend, the
data layer, and the security architecture are genuinely solid and
independently verified this session, not assumed. The remaining gaps are
concentrated almost entirely in "frontend wiring that was never finished"
and "one blank config value" — both fast to close, both precisely named
above rather than left as a vague "needs more testing."
