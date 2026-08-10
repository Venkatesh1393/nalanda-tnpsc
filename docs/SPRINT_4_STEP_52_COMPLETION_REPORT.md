# Sprint 4 Step 52 Completion Report — Admin Portal Foundation

| | |
|---|---|
| **Step** | Sprint 4 Step 52 — Nalanda Admin Portal Foundation |
| **Date** | 2026-08-04 |
| **Scope** | `admin/` app scaffold, admin authentication/RBAC reuse, admin layout, real Admin Dashboard, real User Management, Audit Log foundation, testing, docs |
| **Result** | **PASS** — see [Final Verdict](#final-verdict) |

Explicitly out of scope, per instruction: bulk question upload, Content/Questions/Exams/Current-Affairs/Live-Exams/Subscriptions CMS, Institutional/B2B Management, Moderation. These render as honest placeholder pages, not fabricated data.

---

## 1. Method

1. Read `CLAUDE.md`, `docs/PROJECT_CONTEXT.md`, `docs/MASTER_ROADMAP.md`, `docs/FolderStructure.md`, `docs/Architecture.md`, `docs/Authentication.md`, `docs/Database.md`, `docs/API.md`, `docs/InformationArchitecture.md` for the authoritative current state before building anything.
2. Read the real backend RBAC/auth implementation (`middleware/auth.middleware.ts`, `middleware/rbac.middleware.ts`, `constants/roles.ts`, `types/jwt.types.ts`, `models/User.model.ts`) and the real frontend auth stack (`api/client.ts`, `providers/auth-provider.tsx`, `services/{firebaseAuthService,authService}.ts`) to reuse both exactly, per the step's explicit "do not build a separate insecure authentication system" instruction.
3. Found and resolved a real role-taxonomy conflict between the build instruction and the actual codebase (§2) before writing any code.
4. Built the backend admin module (routes → controllers → services → repositories, matching the codebase's established layering exactly), then the `admin/` frontend app.
5. Ran `typecheck`/`lint`/`build` for `backend`, `admin`, and `frontend` (the last to confirm zero impact on the student app).
6. Wrote and ran a throwaway `tsx` script against the live dev server with real signed JWTs for temporary student/admin/super_admin accounts — the same "bypass Firebase token verification only, drive everything else for real" pattern every prior Sprint 3 real-backend step used — then deleted it and every document it created.
7. Updated `docs/PROJECT_CONTEXT.md` and `docs/MASTER_ROADMAP.md`, and wrote this report.

**What this step could not do**: drive a real browser through `admin/`'s login screen and route guards. No browser-automation tool (Playwright, `chromium-cli`) was available in this session's environment. The `admin/` dev server was left runnable (`npm run dev`, port 5180) for the user to click through directly — every RBAC decision it depends on was independently verified at the HTTP layer instead (§3).

---

## 2. The Role Taxonomy Conflict — Resolved Before Writing Code

The build instruction's role list — `student, premium_student, content_editor, admin, super_admin` — matched neither:
- `docs/Authentication.md` §6 (`user | moderator | content_editor | admin | support`), nor
- the actual implemented code, `backend/src/constants/roles.ts` (identical to the doc).

Two of the instruction's five roles had no code equivalent (`student`, `premium_student`), and two existing roles (`moderator`, `support`) weren't mentioned at all. Rather than silently pick a side — and because `docs/Authentication.md` explicitly designed `role` and `subscriptionTier` as permanently independent JWT claims specifically to prevent this kind of conflation — this was surfaced to the user directly.

**Decision (user-confirmed): minimal extension.** Keep `user`/`moderator`/`content_editor`/`admin`/`support` exactly as they are; add exactly one new role, `super_admin`, as the sole highest-privilege tier. "Premium student" is not a role — it is (and remains) `role: 'user'` combined with `subscriptionTier !== 'free'`, the same design every other tier-gated feature in the app already uses.

This kept the change backward-compatible: no JWT shape change, no `User` model migration, no existing RBAC check broken.

---

## 3. RBAC — Verified at the HTTP Layer, Not Assumed

`backend/src/routes/admin/index.ts` applies `authenticate` + `authorizeRoles(...ADMIN_ACCESS_ROLES)` once, centrally, ahead of every `/admin/*` sub-router. This means the boundary holds even if the frontend's `ProtectedRoute` component were removed, buggy, or bypassed entirely — satisfying the step's explicit "never rely only on hidden frontend buttons" instruction structurally, not just by convention.

A throwaway script (`backend/test-admin-rbac.tmp.ts`, written, run, then deleted) created three real, temporary `User`+`Profile` documents (role `user`/`admin`/`super_admin`), signed real JWTs for each via the backend's own `signAccessToken`, and drove the live dev server (`http://localhost:5000`) over real HTTP:

| # | Assertion | Result |
|---|---|---|
| 1 | No token → `GET /admin/dashboard` → `401` | PASS |
| 2 | Student (`role: user`) → `GET /admin/dashboard` → `403` | PASS |
| 3 | Admin → `GET /admin/dashboard` → `200` | PASS |
| 4 | Dashboard stats are real numbers (not fabricated), `recentRegistrations` is an array | PASS |
| 5 | Student → `GET /admin/users` → `403` | PASS |
| 6 | Admin → `GET /admin/users` → `200` | PASS |
| 7 | Admin (not super_admin) → `PATCH .../role` → `403` | PASS |
| 8 | Super_admin → `PATCH .../role` → `200`, role actually changed | PASS |
| 9 | Super_admin attempting to change **their own** role → `400` (self-demotion guard) | PASS |
| 10 | Admin → `PATCH .../status` (suspend) → `200`, status actually changed | PASS |
| 11 | Student → `GET /admin/audit-logs` → `403` | PASS |
| 12 | Super_admin → `GET /admin/audit-logs` → `200` | PASS |
| 13 | The role-change action from #8 appears in the audit log with `previousRole`/`newRole` metadata and no password/token field | PASS |

**13/13 passed.** All three temporary `User`/`Profile` documents and their `AuditLog` entries were deleted in the script's `finally` block before it exited; no shared/seeded data was touched.

---

## 4. Per-Area Summary

| Area | Status | Notes |
|---|---|---|
| Reuse existing auth/RBAC | ✅ Real | Same Firebase project, same `POST /auth/google`, same JWT/cookie session model as `frontend/` — no parallel auth system |
| Admin access control | ✅ Real | Centrally gated server-side (§3); frontend `ProtectedRoute` is a UX convenience on top, not the boundary |
| Protected frontend routing | ✅ Real | All 11 requested routes exist in `admin/`, behind `ProtectedRoute` |
| Admin layout | ✅ Real | Sidebar, Topbar, Breadcrumbs, profile menu; search/notifications are disclosed disabled placeholders (no backend for either yet) |
| Admin dashboard | ✅ Real | Every number is a live `countDocuments()`/batched query — no fabricated values |
| User management | ✅ Real | List/search/filter/paginate/view/status/role, all backend-authorized |
| Audit log foundation | ✅ Real | `AuditLog` model + write path + read endpoint; no passwords/tokens/secrets ever stored |
| Bulk question upload | Not built | Explicitly excluded from this step, per instruction |
| Content/Questions/Exams/Current-Affairs/Live-Exams/Subscriptions/Analytics CMS | Placeholder pages only | Routes and sidebar entries exist; no backend, honestly disclosed as "coming soon" |
| Institutional/B2B Management, Moderation | Not built | Not part of this step's requested scope |

---

## 5. Quality Gates

| Check | backend | admin | frontend |
|---|---|---|---|
| Typecheck | ✅ Clean | ✅ Clean | ✅ Clean (re-verified unaffected) |
| Lint | ✅ Clean | ✅ Clean | not re-run (no files touched) |
| Build | ✅ Clean | ✅ Clean | ✅ Clean (re-verified unaffected) |
| Automated test suite | None installed (unchanged from every prior step) | None installed | None installed |
| RBAC/functional verification | Throwaway HTTP script, 13/13 passed, test data deleted after | Not browser-click-through-verified (no automation tool available) | N/A |

`npm install` for `admin/` reported 2 high-severity `npm audit` advisories, transitive dependencies — not investigated or "fixed" with `--force` in this session, since that risks breaking-change churn outside this step's scope; flagged here for a future session's attention, same disclosure discipline as the backend's own pre-existing `firebase-admin` advisory note in `docs/PROJECT_CONTEXT.md`.

---

## 5a. Follow-up (same day) — "Register Account for New Admins"

The login page originally shipped Google-only. Asked to add registration, the security question was flagged before writing code: a public "create an admin account" form is a real privilege-escalation hole, so the user chose between two safe designs and picked **both**.

1. **Email/Password sign-in/registration** added to `admin/`'s login page — reuses the exact same `POST /auth/email` endpoint `frontend/` already calls. A self-registered account still lands as plain `role: 'user'` by default; nothing about this path grants admin access by itself.
2. **Invite Admin** — a new, `super_admin`-only feature. `POST /admin/invites {email, role}`:
   - Email already has a `User` → role changed immediately (`200`).
   - No `User` yet → a `pending` `AdminInvite` document is created (`201`), consumed **atomically** the instant that email first signs in (Google or Email/Password, either app) — a small addition to the one shared `services/auth/userSync.service.ts` function both login paths already go through, so a race between two near-simultaneous first sign-ins for the same email can't double-apply the invite.
   - `GET /admin/invites`, `DELETE /admin/invites/:id` (revoke) — all three routes `super_admin`-only.
   - Every outcome (create/consume/revoke/immediate-promotion) writes to the same `AuditLog` this step already built.

A second throwaway script verified 12 assertions: access control on both create and revoke (non-super_admin → `403`), immediate promotion of an existing account, pending-invite creation for a new email, the invite correctly applying its role (not the default) on a simulated first sign-in, revoke succeeding once and correctly rejecting a second revoke (`400`), and the full audit trail for all four action types — **12/12 passed**, test data deleted after. `backend`/`admin` `typecheck`/`lint`/`build` re-verified clean.

---

## 6. Final Verdict

**PASS.**

- Real authentication/RBAC reuse confirmed — no separate or insecure auth system was built.
- Students verifiably cannot reach any `/admin/*` endpoint (401/403 at the HTTP layer, independent of the frontend).
- Admin/super_admin access verifiably works, including the `super_admin`-only role-change boundary and its self-demotion guard.
- Every Admin Dashboard number is real and live; no fabricated data anywhere in this step's scope.
- Audit logging is real, append-only, and provably excludes secrets.
- All three apps build clean; the student-facing `frontend/` app was independently re-verified as unaffected.
- Bulk question upload was correctly **not** implemented, per instruction.
- One real, disclosed conflict (role taxonomy) was resolved with the user before any code was written, rather than guessed at.
- The one gap this session's environment could not close — a real-browser click-through of `admin/`'s own login/guard UI — is disclosed, not hidden, and a running dev server was handed to the user for that specific check.

