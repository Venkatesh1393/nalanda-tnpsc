# Nalanda TNPSC — Final Architecture (As-Built)

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 70 — Final Production Audit |
| **Last Updated** | 2026-08-10 |
| **Relationship to `docs/Architecture.md`** | That document describes the *target* shape (multi-instance, Redis, job queues, mobile app) written early in the project. This document describes what is *actually built and running* today — the two will diverge in places; where they do, this one is authoritative for current state. |

---

## 1. What Exists

Four independent codebases in one repository, no shared package/monorepo
tooling (plain `npm` per app):

| App | Stack | Port (dev) | Status |
|---|---|---|---|
| `backend/` | Node.js + Express + TypeScript + Mongoose | 5000 | Real, the only backend — all four clients below share it |
| `frontend/` | React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui (`radix-ui`) | 5173 | Real, code-split (Sprint 4 Step 67) |
| `admin/` | Same stack as `frontend/`, separate app | 5180 | Real, not yet code-split (deliberate scope decision) |
| `mobile/` | — | — | **Not built.** Directory does not contain a real app. |

No microservices — a single modular-monolith Express app, organized in
strict layers: `routes/ → controllers/ → services/ → repositories/ →
models/`. Every domain module follows this same shape; there is no
exception anywhere in the codebase.

---

## 2. Backend — By The Numbers (counted this session, not estimated)

- **22 Mongoose models** (`backend/src/models/`)
- **39 route modules**: 24 top-level (`auth`, `dashboard`, `learn`,
  `practice`, `liveExam`, `analytics`, `leaderboard`, `payments`,
  `notifications`, `search`, `ai`, `aiTutor`, `adaptivePractice`,
  `gamification`, `currentAffairs`, `health`, ...) + 15 under
  `routes/admin/` (dashboard, users, invites, syllabus, questions,
  learningContent, currentAffairs, liveExams, subscriptions, payments,
  aiUsage, notifications, aiQuestionGenerator, auditLogs)
- **~23 service files**, one clean 1:1 module boundary with the route list
  above, plus 13 admin-specific services under `services/admin/`
- **9 real, self-cleaning integration test scripts** (`npm run verify:*`)
  — this project's actual correctness safety net, run against live
  Atlas/Cloudinary every time, not a mocked test double
- **0 unit tests** — no test runner installed anywhere (see
  `docs/FINAL_AUDIT.md` Part 3)

## 3. Frontend — By The Numbers

- **~34 routed pages** under `frontend/src/pages/` (plus 9 landing-page
  sections composed into the single public Home route)
- **All real page routes are lazy-loaded** (`React.lazy` + one `Suspense`
  boundary, `routes/app-routes.tsx`) since Sprint 4 Step 67 — main JS
  entry chunk 424.74 kB (117.65 kB gzip), down from a single 2,024.79 kB
  bundle pre-split
- Server state via **TanStack Query** everywhere (`lib/query-client.ts`,
  1-minute default `staleTime`) — no separate global state store for
  server data
- `App.tsx` is a design-system preview screen only, reachable at
  `/dev/preview`, never linked from real UI

---

## 4. Data Flow (as it actually works today)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  frontend/  │  │   admin/    │  │  (mobile —  │
│  (student)  │  │  (staff)    │  │  not built) │
└──────┬──────┘  └──────┬──────┘  └─────────────┘
       │  HTTPS/REST, versioned /api/v1           
       │  Bearer JWT (access token, response body)
       │  + HttpOnly refresh-token cookie          
       └────────────────┬──────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   backend/ (Express) │
              │  helmet+cors+rate-   │
              │  limit → routes →    │
              │  controllers →       │
              │  services →          │
              │  repositories        │
              └──────────┬───────────┘
     ┌────────────────────┼────────────────────┬───────────────┬──────────────┐
     ▼                    ▼                    ▼               ▼              ▼
┌─────────┐        ┌─────────────┐      ┌───────────┐   ┌───────────┐  ┌────────────┐
│ MongoDB │        │  In-process  │      │ Firebase  │   │ Cloudinary │  │  Razorpay  │
│  Atlas  │        │ memory cache │      │ Admin SDK │   │ (uploads)  │  │ (Orders    │
│(primary)│        │(Redis-ready, │      │(identity  │   │            │  │  API, TEST │
│         │        │ not yet      │      │verify only│   │            │  │  mode)     │
│         │        │ Redis-backed)│      │           │   │            │  │            │
└─────────┘        └──────────────┘      └───────────┘   └───────────┘  └────────────┘
                                                                                │
                                                                    ┌───────────▼──────────┐
                                                                    │ Anthropic (AI Explain/│
                                                                    │ Tutor/Question Gen) — │
                                                                    │ code real, key blank  │
                                                                    └───────────────────────┘
```

Key architectural facts, all confirmed this session:

- **Auth is a two-layer handoff, not one system**: Firebase verifies
  *identity* only (`verifyFirebaseToken` middleware, used exclusively on
  `/auth/google` and `/auth/email`); the backend then mints its **own**
  RS256 JWT (separate access/refresh keypairs, 15-minute access token) that
  every other authenticated route actually checks. Firebase tokens are
  never accepted anywhere else in the API.
- **Caching is real but single-process**: `config/cache.ts`'s
  `MemoryCacheProvider` is live and measurably effective (Part 3 of
  `docs/FINAL_AUDIT.md` — up to 1653× on cache hits), but doesn't share
  state across instances. `docs/Architecture.md`'s target Redis layer is
  accepted in config (`CACHE_DRIVER=redis`) but not implemented — a
  same-file swap point when it's needed (see `docs/Deployment.md` §6).
  **Do not run more than one backend instance until this is done.**
- **No background job queue exists.** Leaderboard rankings, analytics
  aggregates, and rank percentiles are all computed via **live MongoDB
  aggregation on every request** (cached where it matters — Leaderboard —
  since Step 67), not a scheduled materialized view. The `StudentAnalytics`
  model exists in the schema but has never been written to — it's the
  intended home for a future scheduled job, currently dormant.
- **Payments are webhook-gated, by design, with no exception.** No code
  path anywhere lets a client-reported "payment succeeded" grant an
  entitlement — only a signature-verified Razorpay webhook does
  (`docs/FINAL_AUDIT.md` Part 1 #12 for why this currently blocks real
  activation until a webhook secret is configured).
- **AI features have zero tool-use/function-calling surface.** All three
  AI integrations (Explanation, Tutor, Question Generator) call Anthropic
  with no `tools` array — the model can only ever produce Zod-schema-
  validated text that gets stored, never an action with a side effect.

---

## 5. What's Real vs. What's Aspirational (vs. `docs/Architecture.md`)

| `docs/Architecture.md` describes | Reality today |
|---|---|
| Load balancer + N stateless Node instances | Single instance; horizontal scaling needs the Redis cache swap first (§4) |
| Redis (cache + session/queue backing store) | Interface built, in-memory only — `docs/Deployment.md` §6 |
| Job Queue Workers (mains eval, AI batch jobs) | Does not exist — no mains-exam evaluation feature has been built at all |
| Mobile App (React Native) | Does not exist |
| CDN / Edge / WAF | Not provisioned — `nginx/gateway.conf` (Sprint 4 Step 69) is the closest thing, and even that isn't deployed to a real host yet |
| Chart.js | Actual charts use Recharts (a known, disclosed, harmless doc/code naming mismatch — see project memory) |

None of this is a regression — it's the honest gap between a documented
target architecture written early and a system that has grown iteratively
since. `docs/Deployment.md` §6 and this table together are the single
source of truth for "what needs to change before scaling out," so a future
session doesn't have to re-derive it.

---

## 6. Module Inventory Cross-Reference

See `docs/FINAL_AUDIT.md` Part 1 for the full 19-module PASS/PARTIAL/FAIL
breakdown with evidence — not duplicated here to avoid the two documents
drifting apart. The one-line summary: **11 fully real, 7 partially real
with a specific named gap each, 1 (Profile/Settings) not wired to the real
backend at all despite that backend being real and available.**
