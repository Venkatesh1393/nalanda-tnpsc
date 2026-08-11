# Nalanda TNPSC — Final System Architecture (As-Built, Step 75)

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 75 — Production Go-Live |
| **Last Updated** | 2026-08-11 |
| **Supersedes** | `docs/ARCHITECTURE_FINAL.md` (Step 70, 2026-08-10) — that snapshot predates Steps 71–74 (Content Workflow, Backend Deployment/PM2, Cloud Services validation/backups, Production Monitoring). Kept for history; this document is current. |
| **Relationship to `docs/Architecture.md`** | That document describes the *target* shape (multi-instance, Redis, job queues, mobile app). This one describes what's *actually built and running* — authoritative for current state where they diverge. |

Every number below was counted live this session (`ls`/`find` against the
real source tree), not carried over from memory.

---

## 1. What Exists

| App | Stack | Status |
|---|---|---|
| `backend/` | Node.js + Express + TypeScript + Mongoose | Real — the only backend, all clients share it |
| `frontend/` | React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui | Real, code-split, PWA-enabled (service worker, 110 precached entries) |
| `admin/` | Same stack as `frontend/`, separate app | Real, single JS bundle (deliberate scope decision, Step 67) |
| `mobile/` | — | Not built |

Single modular monolith, strict layering everywhere:
`routes/ → controllers/ → services/ → repositories/ → models/`.

---

## 2. Backend — By The Numbers

- **37 Mongoose models** (`backend/src/models/`) — up from 22 at Step 70;
  the growth is `AiConversation`/`AiMessage` (AI Tutor), `QuestionVersion`
  (Content Workflow, Step 71), `SystemEvent` (Monitoring, Step 74), and
  others accumulated since.
- **26 top-level route modules** + **15 under `routes/admin/`** (41 total)
  — new this step's predecessors: `routes/admin/monitoring.routes.ts`
  (Step 74).
- **23 service files** + **18 under `services/admin/`** (41 total).
- **11 live, self-cleaning integration scripts** (`npm run verify:*`) —
  the actual correctness safety net, run against real Atlas/Cloudinary
  every time: `seed`, `cloudinary`, `search`, `notifications`,
  `gamification`, `adaptive-practice`, `ai-optimization`, `ai-tutor`,
  `ai-question-generator`, `content-pipeline`, `cloud-services`,
  `monitoring` (12, one more than "11" if counting `seed` separately from
  the rest — see `docs/RUNBOOK.md` §5/§8 for the exact command list).
- **Still 0 unit tests** — no test runner installed anywhere, unchanged
  since every prior audit; the live integration suite above is this
  project's actual safety net.
- **Two operational scripts new since Step 70**: `backup:database` /
  `restore:database` (Step 73), `audit:indexes` (Step 74).

## 3. Frontend — By The Numbers

- Routed pages lazy-loaded (`React.lazy` + `Suspense`, `routes/app-routes.tsx`)
  since Step 67 — main entry chunk **219.79 kB (52.96 kB gzip)** this
  session's build, down further from Step 70's already-reduced 424.74 kB.
- Server state via TanStack Query everywhere, no separate global store for
  server data.
- PWA: a service worker now generates on build (`vite-plugin-pwa`,
  `generateSW` mode, 110 precache entries) — not present in Step 70's
  snapshot; offline/installability support exists at the build-tooling
  level, not independently verified as a feature this session (out of this
  step's "verify existing modules" scope).

---

## 4. Data Flow

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  frontend/  │  │   admin/    │  │  (mobile —  │
│  (student)  │  │  (staff)    │  │  not built) │
└──────┬──────┘  └──────┬──────┘  └─────────────┘
       │  HTTPS/REST, versioned /api/v1
       │  Bearer JWT (access) + HttpOnly refresh cookie
       └────────────────┬──────────────────────────┘
                         ▼
      helmet+cors+compression+rate-limit+requestMonitoring
                         │
              routes → controllers → services → repositories
                         │
     ┌────────────┬──────┴──────┬──────────────┬──────────────┐
     ▼            ▼             ▼              ▼              ▼
┌─────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  ┌────────────┐
│ MongoDB │ │In-process │ │ Firebase  │ │ Cloudinary │  │  Razorpay  │
│  Atlas  │ │mem. cache │ │Admin SDK  │ │ (uploads)  │  │ (Orders    │
│(primary,│ │(Redis-    │ │(identity  │ │            │  │  API, TEST │
│ command-│ │ ready,not │ │verify only│ │            │  │  mode)     │
│ monitor-│ │ Redis-    │ │           │ │            │  │            │
│ ed)     │ │ backed)   │ │           │ │            │  │            │
└─────────┘ └───────────┘ └───────────┘ └───────────┘  └────────────┘
                                                               │
                                                    ┌──────────▼─────────┐
                                                    │ Anthropic (AI ×3   │
                                                    │ features) — code   │
                                                    │ real, key blank    │
                                                    └────────────────────┘
                         │
              (all 4 external services + MongoDB feed)
                         ▼
              ┌───────────────────────┐
              │   SystemEvent          │  ← new, Step 74: errors,
              │  (self-hosted ops log) │    slow queries/requests,
              └───────────────────────┘    webhook failures
```

## 5. What's New Since the Step 70 Snapshot

| Area | What changed |
|---|---|
| **Content lifecycle** | `Question` documents now carry a `workflow` subdocument (draft → pending_review → approved → published, `models/shared/contentWorkflow.plugin.ts`) — Smart Practice/Live Exam question selection filters on `workflow.status: 'published'`. `QuestionVersion` gives version history. (Step 71/71.5) |
| **Deployment** | `backend/ecosystem.config.js` (PM2, bare-metal alternative to Docker), `process.send('ready')` in `server.ts` for zero-downtime reload. (Step 72) |
| **Cloud services resilience** | `utils/resilience.ts` (`withTimeout`/`withRetry`) applied to Cloudinary/Razorpay/Firebase calls; explicit MongoDB connection timeouts; `npm run backup:database`/`restore:database` (EJSON/gzip, no external tool dependency); `npm run verify:cloud-services` (one-shot credential check across all 5 external services). (Step 73) |
| **Monitoring** | `SystemEvent` model — self-hosted error/slow-query/slow-request/webhook-failure log (30-day TTL), written from `errorHandler.middleware.ts`, `requestMonitoring.middleware.ts`, `config/database.ts`'s MongoDB command-monitoring listener, and `payment.service.ts`'s webhook handler. `AIHistory.latencyMs` added. `GET /admin/monitoring/*`, `GET /admin/payments/stats` new admin endpoints. (Step 74) |
| **Source control** | `git init` + pushed to a real GitHub remote — no longer absent (was the #3 launch-blocker as of Step 70). |

## 6. Key Architectural Facts (re-confirmed live this session)

- **Auth is a two-layer handoff**: Firebase verifies identity only; the
  backend mints its own RS256 JWT that every authenticated route actually
  checks. Re-confirmed live this session — a request with no token gets
  `401`; an expired token (15-minute TTL) is correctly rejected mid-session.
- **Caching is real but single-process** — `MemoryCacheProvider`,
  16.8×–6378× speedups measured live this session (`npm run benchmark:cache`).
  **Do not run more than one backend instance** until `CACHE_DRIVER=redis`
  is implemented.
- **No background job queue** — Leaderboard/analytics are live MongoDB
  aggregations, cached where it matters. `StudentAnalytics` remains a
  dormant model (schema exists, never written to).
- **Payments are webhook-gated with no exception** — re-confirmed live:
  `services/payment.service.ts` has no code path where a client-reported
  success grants an entitlement.
- **AI features have zero tool-use surface** — all three integrations call
  Anthropic with no `tools` array; output is Zod-schema-validated text
  only, never an action with a side effect. All four AI system prompts
  (`prompts/*.ts`) carry explicit, defense-in-depth prompt-injection
  boundaries — re-read and confirmed present this session.
- **MongoDB is now command-monitored** (`monitorCommands: true`,
  Step 74) — every `find`/`aggregate`/`update`/`delete`/`insert` over
  200ms is logged and recorded, connection-wide, independent of which
  model or file issued it.

---

## 7. What's Real vs. Aspirational (vs. `docs/Architecture.md`)

Unchanged since Step 70 — re-confirmed, not re-derived:

| Target (`docs/Architecture.md`) | Reality today |
|---|---|
| Load balancer + N stateless instances | Single instance; needs the Redis cache swap first |
| Redis | Interface built, in-memory only |
| Job Queue Workers | Does not exist |
| Mobile App | Does not exist |
| CDN / Edge / WAF | `nginx/gateway.conf` built (Step 69), not deployed to a real host yet |
| Chart.js | Actual charts use Recharts (known, harmless doc/code naming mismatch) |

---

## 8. Module Inventory Cross-Reference

See `docs/SPRINT_4_STEP_75_FINAL_REPORT.md` Part 1 for the current
module-by-module PASS/PARTIAL/FAIL verdict (supersedes
`docs/FINAL_AUDIT.md` Part 1, which is the Step 70 snapshot this document
also supersedes for architecture purposes).
