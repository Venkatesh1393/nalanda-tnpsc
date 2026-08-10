# Nalanda TNPSC — Enterprise Folder Structure

| | |
|---|---|
| **Document Owner** | Software Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md`, `docs/InformationArchitecture.md`, `docs/Architecture.md` |
| **Relationship to other docs** | `docs/Architecture.md` §2 gave a high-level folder sketch per app. This document is the detailed, enterprise-grade expansion of that sketch — every folder named here maps back to a layer, module, or flow already justified in `Architecture.md`. |

### Organizing Principle

Nalanda TNPSC is structured as a **monorepo** with three independent client apps (`frontend/`, `admin/`, `mobile/`) and one backend (`backend/`), plus a **`shared/` package** that holds anything used by more than one client — this is the direct mechanism for satisfying `CLAUDE.md`'s "never duplicate code" and "create reusable components" rules *across* apps, not just within one.

```
Nalanda-TNPSC/
├── frontend/          (Student Web App)
├── admin/              (Admin Panel)
├── mobile/             (Mobile App)
├── backend/            (Node.js/Express API — single backend for all clients)
├── shared/             (cross-app package: components, hooks, utils, types)
├── database/           (schema references, seeds, migrations)
├── tests/              (cross-app E2E tests; unit/integration tests live inside each app)
├── deployment/         (CI/CD, Docker, infrastructure configuration)
├── assets/             (shared brand assets — already exists at repo root)
├── prompts/            (versioned AI prompt templates — already exists at repo root)
└── docs/               (this document set)
```

---

## 1. Frontend (`frontend/`) — Student Web App

```
frontend/
├── public/                        # Static files served as-is (favicon, manifest, robots.txt)
├── src/
│   ├── pages/                     # Route-level screens — one folder per module from
│   │   ├── dashboard/              # docs/InformationArchitecture.md's Student Dashboard tree
│   │   ├── learn/
│   │   ├── practice/
│   │   ├── liveExams/
│   │   ├── currentAffairs/
│   │   ├── analytics/
│   │   ├── community/
│   │   ├── bookmarks/
│   │   ├── payments/
│   │   ├── settings/
│   │   └── auth/                   # Registration, OTP, Login screens
│   ├── components/
│   │   └── features/               # App-specific composite components NOT reusable
│   │                                # elsewhere (e.g., ExamGoalSwitcher, StreakBadge) —
│   │                                # generic reusable ones live in shared/components
│   ├── hooks/                      # App-specific hooks only (see shared/hooks for
│   │                                # cross-app hooks)
│   ├── services/                   # API client wrappers, one file per backend module
│   │   ├── learnService.ts
│   │   ├── practiceService.ts
│   │   ├── analyticsService.ts
│   │   ├── paymentsService.ts
│   │   ├── aiService.ts
│   │   └── authService.ts
│   ├── store/                      # Global state: auth session, exam-goal context,
│   │                                # language preference, subscription tier
│   ├── routes/                     # Route configuration + guards (auth required,
│   │                                # tier-gated routes, role checks)
│   ├── i18n/                       # Tamil/English translation resource files
│   ├── styles/                     # Tailwind config extensions, design tokens
│   ├── App.tsx                     # Root app shell (layout, providers, router outlet)
│   └── main.tsx                    # Vite entry point
├── tests/                          # Unit + component tests, mirrors src/ structure
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `public/` | Assets that must be served verbatim at a fixed URL (favicon, PWA manifest) — bypasses the JS bundler entirely. |
| `src/pages/` | One folder per navigable module (matches `docs/InformationArchitecture.md` exactly), each containing that module's route-level screen components. Keeps "which file renders this URL" always obvious. |
| `src/components/features/` | Composite, feature-aware components specific to the student app (e.g., a streak badge tied to Nalanda's specific gamification rules) that don't belong in the cross-app `shared/` package because they're not reusable outside this app's context. |
| `src/hooks/` | Hooks specific to this app's screens (e.g., `useDashboardData`) — anything generic enough to reuse in `admin/` or `mobile/` belongs in `shared/hooks` instead. |
| `src/services/` | Thin API-client layer — every network call goes through here, never directly in a component. Mirrors `backend/src/services` module boundaries one-to-one so a developer can always find the matching backend service. |
| `src/store/` | Global, cross-page state (who's logged in, which exam is active, current language) — deliberately minimal; page-local state stays in the page/component. |
| `src/routes/` | Central route table plus guard logic (redirect unauthenticated users, block tier-gated pages) — keeps access-control logic out of individual page components. |
| `src/i18n/` | Translation strings and locale-switching logic — isolated so Tamil/English bilingual support (a core differentiator per `docs/CompetitorAnalysis.md`) is centrally maintained, not scattered. |

---

## 2. Backend (`backend/`) — API Server

```
backend/
├── src/
│   ├── api/                        # See Section 6 (API) for full detail
│   ├── services/                   # See Section 6 (Services) for full detail
│   ├── repositories/               # Data-access layer — only place querying MongoDB
│   ├── models/                     # See Section 11 (Database) for schema detail
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── rbac.middleware.ts       # Role/tier authorization
│   │   ├── validate.middleware.ts   # Request schema validation
│   │   ├── rateLimit.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── integrations/                # Thin adapters for every third-party SDK
│   │   ├── firebaseAdmin/
│   │   ├── cloudinary/
│   │   ├── razorpay/                # See Section 9 (Payments)
│   │   └── aiProvider/               # See Section 8 (AI)
│   ├── jobs/                        # Queue producers/consumers for async work
│   │   ├── mainsEvaluation.job.ts
│   │   ├── currentAffairsIngestion.job.ts
│   │   └── notificationDispatch.job.ts
│   ├── config/                      # Environment loading, DB/Redis connection setup
│   ├── utils/                       # Backend-only pure helpers (no DB/framework coupling)
│   ├── types/                       # Backend-specific TypeScript interfaces/DTOs
│   ├── app.ts                       # Express app assembly (middleware registration)
│   └── server.ts                    # Process entry point (listen, graceful shutdown)
├── tests/                           # See Section 12 (Tests)
├── tsconfig.json
└── package.json
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `src/repositories/` | The *only* layer permitted to construct MongoDB/Mongoose queries. Services never query the database directly — they call a repository method. This single-responsibility boundary is what makes the business logic in `services/` unit-testable without a real database. |
| `src/middleware/` | Each cross-cutting concern (authentication, authorization, validation, rate limiting, error formatting) lives in its own file and is composed explicitly in route definitions — never bundled into one "do everything" middleware, per `CLAUDE.md`'s SOLID-principles rule. |
| `src/integrations/` | Every third-party SDK (Firebase Admin, Cloudinary, Razorpay, the AI provider) is wrapped in a thin adapter here. If a provider is ever swapped, only this folder changes — no service or controller code should import a third-party SDK directly. |
| `src/jobs/` | Background workers for anything too slow or bursty to run inline on a request (Mains-answer evaluation, current-affairs ingestion, notification fan-out) — implements the async path described in `docs/Architecture.md` §5 (AI Flow). |
| `src/config/` | Centralizes reading environment variables and establishing DB/Redis connections once, so no other file reaches into `process.env` directly. |
| `src/utils/` | Pure, framework-agnostic helper functions (date formatting, string utilities, validation helpers) — if a function needs a database or Express request object, it does not belong here. |

---

## 3. Admin (`admin/`) — Admin Panel

```
admin/
├── src/
│   ├── pages/
│   │   ├── overview/                # Platform-wide KPI dashboard
│   │   ├── content/                 # Notes, videos, question bank, mock tests, live exams,
│   │   │                            # current affairs — CMS screens
│   │   ├── users/                   # User search, roles, bans
│   │   ├── institutions/             # Coaching-center (B2B) management
│   │   ├── subscriptions/            # Payments dashboard, refunds, pricing config
│   │   ├── examCalendar/
│   │   ├── moderation/               # Flagged community posts, escalated AI feedback
│   │   ├── notifications/            # Broadcast composer
│   │   └── auditLogs/
│   ├── components/
│   │   └── features/                 # Admin-specific composites (e.g., BulkUploadTable,
│   │                                 # CohortAnalyticsPanel)
│   ├── services/                     # Admin-scoped API calls (elevated-permission endpoints)
│   ├── guards/                       # Role-based route protection (Admin/Editor/Moderator/
│   │                                 # Support — distinct permission sets per role)
│   └── routes/
├── tests/
└── package.json
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `src/pages/content/` | Mirrors the student-facing content modules one-for-one (per `docs/InformationArchitecture.md`'s "admin mirrors student IA, inverted" principle) — every content type a student consumes has a matching management screen here. |
| `src/pages/institutions/` | Supports the B2B/coaching-center persona (Rajendran, per `docs/UserPersonas.md`) — branch/batch setup, cohort analytics, white-label configuration. |
| `src/guards/` | Distinct from `frontend/src/routes` guards because admin roles are finer-grained (Admin vs. Content Editor vs. Moderator vs. Support each see a different subset of `pages/`). |

---

## 4. Shared Components (`shared/components/`)

```
shared/
└── components/
    ├── ui/                          # Pure presentational primitives, zero business logic
    │   ├── Button/
    │   ├── Card/
    │   ├── Modal/
    │   ├── Input/
    │   ├── Badge/
    │   ├── Skeleton/                # Loading-state placeholders (per docs/UserJourney.md,
    │   │                            # every screen's "Loading States" section)
    │   ├── ChartWrapper/             # Chart.js wrapper with Nalanda's design tokens applied
    │   └── LanguageToggle/
    ├── layout/                       # Shell components: Sidebar, TopBar, TabBar (mobile),
    │                                 # PageContainer
    └── feedback/                     # Toast, ErrorBanner, EmptyState, UpsellPrompt —
                                       # standardized so every screen's error/success/upsell
                                       # messaging (per docs/UserJourney.md's cross-cutting
                                       # standards table) looks and behaves identically
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `ui/` | The atomic design-system layer — any component here must have **no knowledge of Nalanda's domain** (no "exam," "subscription," or "question" concepts inside a `Button`). This is what lets `frontend/`, `admin/`, and `mobile/` (via a React Native-compatible subset) all render a consistent look without copy-pasting styles. |
| `feedback/` | Directly implements the "Cross-Cutting Standards" table from `docs/UserJourney.md` — one `UpsellPrompt` component, for example, guarantees every premium-gating moment across Learn, Practice, and Analytics reads with the same honest, non-dark-pattern tone. |

---

## 5. Services (Two Distinct Meanings — Both Documented)

"Services" means two different things depending on which side of the API boundary you're on. Both are documented here to avoid ambiguity.

```
frontend/src/services/    # CLIENT-SIDE: thin HTTP-call wrappers (fetch/axios + typed
                           # response parsing). One file per backend module. No business
                           # logic — just "call this endpoint, return typed data."

backend/src/services/     # SERVER-SIDE: actual business logic. One folder per domain.
                           ├── auth/
                           ├── learning/
                           ├── practice/
                           ├── analytics/
                           ├── payments/            # See Section 9
                           ├── ai/                   # See Section 8
                           ├── community/
                           ├── notifications/        # See Section 10
                           └── admin/
```

### Folder Explanations
| Location | Purpose |
|---|---|
| `frontend/src/services/*.ts` | Each file exports typed functions like `getDashboardSummary()` — purely a network-call abstraction so components never call `fetch` directly, and so a backend endpoint change requires updating exactly one file. |
| `backend/src/services/*/` | Each domain folder owns its business rules — e.g., `services/practice/scoreCalculator.ts` computes a test score, `services/analytics/weakAreaDetector.ts` aggregates weak topics. Services depend on `repositories/` for data and `integrations/` for third-party calls, never the reverse. |

---

## 6. API (`backend/src/api/`)

```
backend/src/api/
├── routes/
│   ├── auth.routes.ts
│   ├── learn.routes.ts
│   ├── practice.routes.ts
│   ├── liveExams.routes.ts
│   ├── currentAffairs.routes.ts
│   ├── analytics.routes.ts
│   ├── community.routes.ts
│   ├── bookmarks.routes.ts
│   ├── payments.routes.ts           # See Section 9
│   ├── notifications.routes.ts      # See Section 10
│   ├── ai.routes.ts                 # See Section 8
│   ├── settings.routes.ts
│   └── admin/                       # Admin-only route namespace, separately guarded
│       ├── content.routes.ts
│       ├── users.routes.ts
│       ├── institutions.routes.ts
│       └── auditLogs.routes.ts
├── controllers/                     # One controller per route file — parses the request,
│   │                                 # calls the matching service, shapes the HTTP response.
│   │                                 # Contains no business logic itself.
│   └── (mirrors routes/ 1:1)
└── validators/                       # Request-schema validation, one per route/controller
    └── (mirrors routes/ 1:1)
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `routes/` | Pure route-to-controller wiring plus middleware attachment (which auth/RBAC/rate-limit rules apply to this endpoint) — a route file should be readable top-to-bottom as a table of contents for that module's endpoints. |
| `routes/admin/` | Kept in a distinct namespace (and typically mounted under `/api/v1/admin`) so admin-only endpoints are trivially auditable as a group and can carry a stricter, separately-tested authorization middleware stack. |
| `controllers/` | Deliberately "thin" — if a controller is doing anything beyond input parsing, calling one service method, and formatting the response envelope, that logic has leaked out of `services/` and should be moved back. |
| `validators/` | Centralized schema definitions (e.g., "a mock-test submission must include these fields, in these types") so invalid requests are rejected before ever reaching a controller or service. |

---

## 7. Hooks (`shared/hooks/` and app-local `hooks/`)

```
shared/
└── hooks/
    ├── useDebounce.ts
    ├── useLocalStorage.ts
    ├── useMediaQuery.ts
    ├── useOnlineStatus.ts             # Powers the offline/online distinction required by
    │                                  # docs/UserJourney.md's Dashboard and Learn screens
    ├── useCountdown.ts                # Powers OTP resend timers, exam-mock countdowns
    └── usePagination.ts

frontend/src/hooks/   admin/src/hooks/   mobile/src/hooks/
    (app-specific hooks that depend on that app's own store/services and therefore
     can't live in shared/ — e.g., frontend's useExamGoal(), admin's useCohortFilter())
```

### Folder Explanations
| Location | Purpose |
|---|---|
| `shared/hooks/` | Generic, domain-agnostic hooks — a `useCountdown` doesn't know or care whether it's counting down an OTP resend timer or a Live Exam start time. Promoting a hook here requires it to have zero dependency on any one app's state management. |
| App-local `hooks/` | Hooks that are inherently tied to that app's specific store/services (e.g., `useExamGoal()` in `frontend/` reads from the student app's exam-goal context, which doesn't exist in `admin/`). |

---

## 8. AI (`backend/src/services/ai/` + `backend/src/integrations/aiProvider/` + `prompts/`)

```
backend/src/services/ai/
├── orchestrator.ts                  # Entry point every controller calls; routes a request
│                                     # to sync or async handling (per docs/Architecture.md §5)
├── promptLoader.ts                  # Loads and versions templates from the repo-root
│                                     # `prompts/` folder
├── handlers/
│   ├── doubtChatbot.handler.ts       # Synchronous path
│   ├── adaptiveDifficulty.handler.ts # Synchronous path
│   ├── studyPlanGenerator.handler.ts # Synchronous path
│   ├── mainsEvaluation.handler.ts    # Asynchronous/queued path
│   └── currentAffairsSummarizer.handler.ts  # Asynchronous/batch path
├── responseValidator.ts              # Rejects/flags low-confidence or off-topic output
│                                      # before it reaches a client (per docs/UserJourney.md
│                                      # Screen 8's edge cases)
└── cache.ts                          # Redis-backed caching for repeat queries

backend/src/integrations/aiProvider/
└── client.ts                        # The only file that imports the AI provider's SDK

prompts/                              # (repo root, already established in docs/Architecture.md)
├── study-plan-generator.md
├── mains-answer-evaluation.md
├── current-affairs-summarizer.md
└── doubt-chatbot-system-prompt.md
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `services/ai/orchestrator.ts` | The single entry point for all AI features — guarantees the sync/async split and response validation happen consistently, regardless of which feature is calling in. |
| `services/ai/handlers/` | One handler per AI feature from `docs/PRD.md` §10 — keeps each feature's prompt-assembly and post-processing logic isolated and independently testable. |
| `integrations/aiProvider/client.ts` | Isolates the actual AI provider SDK/API calls — if the underlying model or provider changes, this is the only file that must change. |
| `prompts/` (repo root) | Deliberately kept **outside** `backend/src` as plain, versioned text files — non-engineers (content/subject-matter reviewers) can review and propose prompt changes (e.g., refining the Mains-evaluation rubric) without touching application code, satisfying the auditability need called out in `docs/Architecture.md` §5. |

---

## 9. Payments (`backend/src/services/payments/` + `backend/src/integrations/razorpay/`)

```
backend/src/services/payments/
├── subscriptionManager.ts           # Plan upgrade/downgrade/cancel business rules
├── orderCreator.ts                  # Builds a Razorpay order from a plan selection
├── webhookProcessor.ts              # Verifies signature, applies idempotent state
│                                     # transitions (per docs/Architecture.md §6)
├── invoiceGenerator.ts
└── refundHandler.ts

backend/src/integrations/razorpay/
└── client.ts                        # The only file that imports the Razorpay SDK
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `webhookProcessor.ts` | The authoritative source of truth for "did this payment actually succeed" — implements the idempotent, signature-verified webhook handling that `docs/Architecture.md` §6 identifies as the fix for the billing-trust failures seen in competitors. |
| `subscriptionManager.ts` | Owns all plan-state-transition rules (what happens on upgrade, downgrade, cancellation, renewal failure) so this logic exists in exactly one place, referenced by both the student-facing Payments module and the Admin Panel's Subscriptions dashboard. |

---

## 10. Notifications (`backend/src/services/notifications/` + `jobs/notificationDispatch.job.ts`)

```
backend/src/services/notifications/
├── notificationBuilder.ts           # Composes notification content per type (study
│                                     # reminder, mock/live-exam alert, official TNPSC
│                                     # notification, billing alert, community reply)
├── channelDispatchers/
│   ├── push.dispatcher.ts
│   ├── email.dispatcher.ts
│   └── sms.dispatcher.ts
├── preferenceResolver.ts             # Checks each user's notification preferences
│                                     # (Settings module) before dispatching
└── templates/                        # Notification copy templates, per channel and type
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `channelDispatchers/` | One dispatcher per delivery channel — adding a new channel (e.g., WhatsApp) means adding one new file here, not touching the notification-building logic. |
| `preferenceResolver.ts` | Ensures every dispatch respects the user's own Settings → Notification Preferences (per `docs/InformationArchitecture.md` §7.5) — notifications are never sent without checking this first. |

---

## 11. Database (`database/` + `backend/src/models/`)

```
database/
├── seed/
│   ├── examCategories.seed.ts        # Group 1/2/2A/4/VAO/Police/Forest/TRB reference data
│   ├── syllabusTaxonomy.seed.ts
│   └── subscriptionPlans.seed.ts
├── migrations/
│   └── (timestamped schema-evolution scripts)
└── indexes.md                        # Documented (not code) index strategy per collection

backend/src/models/
├── User.model.ts
├── Exam.model.ts
├── Subject.model.ts / Unit.model.ts / Topic.model.ts
├── Question.model.ts
├── Test.model.ts                     # Covers quizzes, sectional tests, mocks, PYQs
├── LiveExam.model.ts
├── CurrentAffairs.model.ts
├── Analytics.model.ts                # Aggregated per-user performance snapshots
├── Subscription.model.ts
├── Bookmark.model.ts
├── CommunityThread.model.ts
├── Notification.model.ts
├── Institution.model.ts               # B2B coaching-center accounts
└── AuditLog.model.ts
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `database/seed/` | Reference/lookup data that must exist before the app is usable (exam categories, syllabus structure) — kept separate from user-generated data, and safe to re-run in any environment. |
| `database/migrations/` | Ordered, timestamped scripts for evolving schemas over time — never mutate a model's shape without a corresponding migration entry, so staging/production stay reproducible. |
| `backend/src/models/` | One file per MongoDB collection (Mongoose schema definitions) — this is the only place a collection's shape is defined; `repositories/` consume these models, never redefine shape inline in a query. |

---

## 12. Tests

```
frontend/tests/       # Unit + component tests (colocated conceptually with src/, mirrored structure)
admin/tests/          # Same pattern for the Admin Panel
backend/tests/
├── unit/             # Pure logic — services, utils — no DB or network involved
├── integration/      # Repository + database interaction tests (against a test DB instance)
└── contract/         # Verifies API responses match the documented envelope/schema

tests/                 # REPO ROOT — cross-app end-to-end tests
├── e2e/
│   ├── registration-to-first-quiz.e2e.ts
│   ├── mock-test-full-flow.e2e.ts
│   ├── subscription-upgrade.e2e.ts
│   └── admin-content-publish-to-student-visibility.e2e.ts
└── fixtures/          # Shared test data/accounts used across e2e scenarios
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `backend/tests/unit/` | Fast, isolated tests of business logic — enabled specifically by the repository/service separation described in Section 2, since services can be tested with a mocked repository instead of a real database. |
| `backend/tests/integration/` | Verifies repositories and the actual database behave as expected together — run against a dedicated test MongoDB instance, never against staging/production data. |
| Root `tests/e2e/` | Full-stack scenarios that cross app boundaries (e.g., admin publishes a new mock test → it appears correctly in the student app) — justifies living outside any single app's folder. |

---

## 13. Deployment (`deployment/`)

```
deployment/
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── admin.Dockerfile
├── ci/
│   ├── lint-and-typecheck.yml
│   ├── test.yml
│   ├── build.yml
│   └── deploy-staging.yml / deploy-production.yml
├── environments/
│   ├── staging.env.example
│   └── production.env.example        # Placeholders only — real secrets live in a
│                                       # secrets manager, never committed (per
│                                       # docs/Architecture.md §10)
└── infra/
    └── (infrastructure-as-code definitions — load balancer, autoscaling rules,
        CDN configuration — as the platform matures past MVP)
```

### Folder Explanations
| Folder | Purpose |
|---|---|
| `docker/` | One Dockerfile per deployable unit (backend API, frontend static build, admin static build) — keeps each app's build independent and independently versioned. |
| `ci/` | Pipeline definitions matching the flow in `docs/Architecture.md` §7 (lint/type-check → test → build → deploy), split into separate files so a failure in one stage is immediately attributable. |
| `environments/*.env.example` | Documents *which* environment variables each environment needs, without ever containing real values — real secrets are injected at deploy time from a secrets manager. |

---

## Full Folder-Purpose Reference (Quick Lookup)

| Folder | App/Layer | One-Line Purpose |
|---|---|---|
| `frontend/src/pages/` | Frontend | Route-level screens, one folder per IA module |
| `frontend/src/components/features/` | Frontend | App-specific composite components |
| `frontend/src/services/` | Frontend | Typed API-call wrappers |
| `admin/src/pages/content/` | Admin | CMS screens mirroring student content modules |
| `admin/src/guards/` | Admin | Fine-grained role-based route protection |
| `shared/components/ui/` | Shared | Domain-agnostic design-system primitives |
| `shared/components/feedback/` | Shared | Standardized toast/error/upsell components |
| `shared/hooks/` | Shared | Domain-agnostic reusable hooks |
| `backend/src/api/routes/` | Backend | Route-to-controller wiring |
| `backend/src/api/controllers/` | Backend | Thin request/response handling |
| `backend/src/services/` | Backend | Business logic, one domain per folder |
| `backend/src/repositories/` | Backend | Sole layer permitted to query MongoDB |
| `backend/src/models/` | Backend | Mongoose schema definitions |
| `backend/src/middleware/` | Backend | Auth, RBAC, validation, rate limiting, errors |
| `backend/src/integrations/` | Backend | Thin adapters for every third-party SDK |
| `backend/src/jobs/` | Backend | Async/queued background workers |
| `backend/src/services/ai/` | Backend | AI orchestration, handlers, response validation |
| `prompts/` | Repo root | Versioned, non-engineer-reviewable AI prompt templates |
| `backend/src/services/payments/` | Backend | Subscription/order/webhook/refund logic |
| `backend/src/services/notifications/` | Backend | Notification composition and multi-channel dispatch |
| `database/seed/` | Database | Reference/lookup data |
| `database/migrations/` | Database | Ordered schema-evolution scripts |
| `tests/e2e/` (repo root) | Tests | Cross-app, full-stack scenario tests |
| `deployment/docker/` | Deployment | Per-app containerization |
| `deployment/ci/` | Deployment | Pipeline stage definitions |

---

*End of Document.*
