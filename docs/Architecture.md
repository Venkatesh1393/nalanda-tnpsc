# Nalanda TNPSC — System Architecture

| | |
|---|---|
| **Document Owner** | Software Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md`, `docs/InformationArchitecture.md` |
| **Confirmed Stack** | React + Vite + TypeScript + TailwindCSS + Framer Motion (frontend) · Node.js + Express (backend) · MongoDB Atlas (database) · Firebase Auth + JWT (auth) · Cloudinary (storage) · Razorpay (payments) · Chart.js (charts) |

### Architectural Intent

`CLAUDE.md` mandates production-ready code, TypeScript everywhere, SOLID principles, clean architecture, and no duplication. This document translates those rules into an actual system shape: a **layered, modular-monolith backend** (not a premature microservice split — this is a pre-launch product per the PRD's Phase 1 MVP scope) fronted by **four independent clients** (Website, Student Dashboard, Admin Panel, Mobile App — per `docs/InformationArchitecture.md`) that all speak to one versioned REST API.

---

## 1. High-Level Architecture

```
┌──────────────────────────────── CLIENTS ────────────────────────────────┐
│                                                                            │
│   ┌───────────┐   ┌────────────────┐   ┌────────────┐   ┌─────────────┐  │
│   │  Website  │   │ Student Web App │  │ Admin Panel │  │  Mobile App │  │
│   │(React/Vite│   │ (React/Vite/TS) │  │(React/Vite) │  │(React Native│  │
│   │    /TS)   │   │                 │  │             │  │  / shared   │  │
│   │           │   │                 │  │             │  │  TS logic)  │  │
│   └─────┬─────┘   └────────┬────────┘  └──────┬──────┘  └──────┬──────┘  │
└─────────┼───────────────────┼──────────────────┼────────────────┼─────────┘
          │                   │                  │                │
          └───────────────────┴────────┬─────────┴────────────────┘
                                        │  HTTPS / REST (JSON) — versioned /api/v1
                              ┌─────────▼─────────┐
                              │   CDN / Edge/WAF   │   (static assets, DDoS/bot filtering)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │   Load Balancer    │
                              └─────────┬─────────┘
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
             │  Node.js /   │    │  Node.js /    │    │  Node.js /   │
             │  Express     │    │  Express      │    │  Express     │
             │  Instance 1  │    │  Instance 2   │    │  Instance N  │
             │ (stateless)  │    │  (stateless)  │    │ (stateless)  │
             └──────┬───────┘    └───────┬───────┘    └───────┬──────┘
                    └───────────────────┬┴───────────────────┘
      ┌───────────────┬─────────────────┼─────────────────┬───────────────┐
      │                │                │                 │               │
┌─────▼─────┐  ┌────────▼────────┐ ┌────▼──────┐  ┌────────▼──────┐ ┌─────▼─────┐
│ MongoDB   │  │ Redis (cache +  │ │ Firebase  │  │  Job Queue     │ │  External │
│ Atlas     │  │ session/queue   │ │ Admin SDK │  │  Workers       │ │  Services │
│ (primary  │  │ backing store)  │ │(token     │  │ (mains eval,   │ │ Cloudinary│
│  data)    │  │                 │ │ verify)   │  │  AI batch jobs)│ │ Razorpay  │
└───────────┘  └─────────────────┘ └───────────┘  └───────┬────────┘ │ AI/LLM API│
                                                            │          └───────────┘
                                                    ┌───────▼────────┐
                                                    │  AI Orchestration│
                                                    │  Service + Prompt│
                                                    │  Library (`prompts/`)│
                                                    └──────────────────┘
```

### Architecture Style
- **Backend:** A single, well-modularized Express application ("modular monolith") organized by **clean-architecture layers** (Routes → Controllers → Services → Repositories → Models), not by technical microservices. This matches `CLAUDE.md`'s "clean architecture" and "SOLID principles" rules while avoiding the operational overhead a pre-PMF product doesn't need — the PRD's own roadmap (Phase 1 → Phase 4) implies scale-up over years, not day one.
- **Frontend:** Three independent React/Vite SPAs (Website, Student Dashboard, Admin Panel) sharing a common internal UI/component library and TypeScript type-definitions package, so "never duplicate code" holds true *across* apps, not just within one.
- **Mobile:** A separate client (React Native recommended, to maximize shared TypeScript business-logic/types with the web apps) consuming the exact same REST API — no parallel backend.

---

## 2. Folder Structure

The existing repository root (`admin/`, `assets/`, `backend/`, `database/`, `docs/`, `frontend/`, `mobile/`, `prompts/`) already anticipates this shape. Below is the intended structure for each.

### 2.1 `backend/` — Clean Architecture Layers

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/          (route definitions per module — thin, no business logic)
│   │   ├── controllers/     (parse request → call service → shape response)
│   │   └── validators/      (request schema validation, per module)
│   ├── services/            (business logic — one service per domain: auth, learning,
│   │                          practice, analytics, payments, ai, community, admin)
│   ├── repositories/        (data-access layer — only place that talks to MongoDB models)
│   ├── models/               (Mongoose schemas — User, Exam, Question, Test, Subscription,
│   │                          CurrentAffairs, Bookmark, Notification, CommunityThread, ...)
│   ├── middleware/           (auth/JWT verification, RBAC, rate limiting, error handler,
│   │                          request logging, input sanitization)
│   ├── integrations/         (thin adapter clients — firebaseAdmin, cloudinary, razorpay,
│   │                          aiProvider — isolate all third-party SDK calls here)
│   ├── jobs/                 (queue producers/consumers — mains-evaluation worker,
│   │                          current-affairs ingestion worker, notification dispatch)
│   ├── config/               (env config loader, DB connection, Redis connection)
│   ├── utils/                (shared pure helpers — no framework or DB dependencies)
│   └── types/                (shared TypeScript interfaces/DTOs)
├── tests/                    (unit + integration tests, mirroring src/ structure)
└── package.json
```

### 2.2 `frontend/` — Student Web App

```
frontend/
├── src/
│   ├── pages/                (route-level screens — Dashboard, Learn, Practice, ... per
│   │                          docs/InformationArchitecture.md navigation tree)
│   ├── components/
│   │   ├── ui/               (dumb, reusable primitives — Button, Card, Modal, Chart wrapper)
│   │   └── features/         (feature-specific composite components)
│   ├── hooks/                (data-fetching & stateful logic, one concern per hook)
│   ├── services/              (API client wrappers — one file per backend module, mirrors
│   │                           backend/src/services boundaries)
│   ├── store/                 (global state — auth session, exam-goal context, language)
│   ├── routes/                (route configuration, guards for auth/tier gating)
│   ├── styles/                (Tailwind config extensions, design tokens)
│   ├── i18n/                  (Tamil/English translation resources)
│   └── types/                 (shared with backend DTOs where practical)
└── package.json
```

### 2.3 `admin/` — Admin Panel (Separate App, Shared UI Kit)

```
admin/
├── src/
│   ├── pages/                 (Overview, Content Management, User Management, ... per
│   │                           docs/InformationArchitecture.md Admin nav tree)
│   ├── components/
│   ├── services/               (calls the same backend, admin-scoped endpoints)
│   └── guards/                 (role-based route protection — Admin/Editor/Moderator/Support)
└── package.json
```

### 2.4 `mobile/` — Mobile App

```
mobile/
├── src/
│   ├── screens/                (Home, Learn, Practice, Analytics, More — per mobile tab
│   │                            structure in docs/InformationArchitecture.md)
│   ├── navigation/              (tab + stack navigators)
│   ├── components/
│   ├── services/                 (same API contracts as frontend/services)
│   └── offline/                  (local cache/sync layer for downloaded content)
└── package.json
```

### 2.5 `database/`, `assets/`, `prompts/`

```
database/
├── seed/                        (reference data — exam categories, syllabus taxonomy)
└── migrations/                   (schema evolution scripts for MongoDB)

assets/
└── brand/                        (shared logos, illustrations used across all clients)

prompts/
├── study-plan-generator.md        (versioned prompt templates, not code — reviewed like copy)
├── mains-answer-evaluation.md
├── current-affairs-summarizer.md
└── doubt-chatbot-system-prompt.md
```
Keeping prompts as version-controlled, reviewable text files (not inline strings buried in service code) is itself a clean-architecture decision — it lets non-engineers (content/subject-matter reviewers) audit and improve AI behavior without touching `backend/src`.

---

## 3. Communication Flow

```
Client (any surface)
   │  1. HTTPS request with Firebase ID Token or Nalanda JWT in Authorization header
   ▼
CDN / Edge
   │  2. Static assets served from edge; API calls pass through to origin
   ▼
Load Balancer
   │  3. Routes to a healthy, stateless Express instance
   ▼
Express App
   │  4. Middleware chain: CORS → rate limit → auth verify → RBAC → validation
   ▼
Controller → Service → Repository
   │  5. Business logic executes; repository issues MongoDB queries via Mongoose
   ▼
MongoDB Atlas / Redis / Integrations
   │  6. Data persisted/fetched; cache checked/updated; third-party calls made as needed
   ▼
Response
   │  7. Controller shapes a consistent JSON envelope (data / error / meta) back to client
   ▼
Client renders / updates local state
```

**Contract discipline:** every endpoint returns a consistent envelope (`{ success, data, error, meta }`) so all four clients can share one API-response-handling utility — directly serving the "never duplicate code" rule across apps.

---

## 4. Authentication Flow

Combines **Firebase Authentication** (identity verification: Google OAuth + Email OTP) with a **backend-issued JWT** (authorization for Nalanda's own API), rather than trusting Firebase tokens directly on every request.

```
┌────────┐      1. Sign in (Google or Email OTP)      ┌──────────┐
│ Client │ ───────────────────────────────────────────▶│ Firebase │
│        │◀─────────────────────────────────────────── │   Auth   │
└───┬────┘      2. Firebase ID Token (short-lived)      └──────────┘
    │
    │  3. POST /api/v1/auth/session  { firebaseIdToken }
    ▼
┌─────────────────────┐   4. Verify token via Firebase   ┌──────────────┐
│   Backend (Express)  │──────────Admin SDK──────────────▶│ Firebase Admin│
│                       │◀─────────────────────────────────│    SDK       │
└──────────┬───────────┘   5. Decoded, verified claims     └──────────────┘
           │
           │  6. Find-or-create User in MongoDB; attach role, subscription tier,
           │     exam-goal(s) as custom claims
           ▼
┌─────────────────────┐
│  Issue Nalanda JWT   │  7. Access token (short TTL, e.g., 15 min)
│  + Refresh Token     │     Refresh token (long TTL, e.g., 30 days, stored hashed in DB/Redis)
└──────────┬───────────┘
           │
           ▼
      Client stores:
      - Access JWT in memory (not localStorage, to reduce XSS token-theft risk)
      - Refresh token in an HttpOnly, Secure, SameSite=Strict cookie

  Subsequent API calls → Authorization: Bearer <Nalanda JWT>
  On 401 (expired access token) → silent refresh via refresh-token cookie → new access JWT
  On refresh-token reuse/anomaly → revoke session, force re-login (rotation-detection security)
```

### Why not just use Firebase tokens directly on every API call?
- Firebase ID tokens carry identity, not Nalanda-specific authorization state (subscription tier, role, exam goals) — embedding that in a Nalanda-issued JWT avoids a database lookup on every single request for that data, while still re-verifying against Firebase at session-issuance time.
- A backend-owned JWT lets Nalanda **revoke or rotate sessions independently** of Firebase (important for the "Logout of all devices" edge case in `docs/UserJourney.md`, Screen 12).

### Role-Based Access Control (RBAC)
JWT custom claims carry a `role` (`user | moderator | content_editor | admin`) and `subscriptionTier` (`free | plus | pro | institutional`). Middleware order is always: **authenticate → authorize (role) → authorize (tier)** — never combined into one ad-hoc check, so each concern stays independently testable (SOLID: single-responsibility middleware).

---

## 5. AI Flow

The AI layer sits behind a dedicated **AI Orchestration Service** in `backend/src/services/ai`, never called directly from controllers — this isolation is what makes it possible to swap or version the underlying model/provider without touching feature code.

```
Client request (e.g., "Explain this question", "Evaluate my Mains answer",
                "Generate my study plan")
        │
        ▼
Controller (thin) → AI Service
        │
        │  1. Load the relevant prompt template from `prompts/` (versioned, reviewable text)
        │  2. Inject context: user's exam goal, weak areas, question/answer content,
        │     retrieved current-affairs snippets (as applicable)
        ▼
   Request classification:
   ┌─────────────────────────┬───────────────────────────────────────────┐
   │  SYNCHRONOUS (fast path) │  ASYNCHRONOUS (queued path)                │
   │  - Doubt chatbot reply   │  - Mains-answer evaluation (rubric-based,  │
   │  - Adaptive difficulty   │    slower, higher token cost)              │
   │    recommendation        │  - Current-affairs summarization (batch,   │
   │  - Study-plan tweak      │    runs on ingestion, not per-request)     │
   └───────────┬──────────────┴──────────────────┬──────────────────────┘
               │                                  │
               ▼                                  ▼
      Cache check (Redis)                 Enqueue job (Job Queue)
      - Hit → return cached                - Worker picks up job
        response immediately               - Calls AI provider with
      - Miss → call AI provider              full rubric prompt
                                            - Persists result to MongoDB
               │                            - Notifies user (Notifications
               ▼                              module) when ready
        AI Provider API call
        (rate-limited, timeout-bounded,
         retried with backoff)
               │
               ▼
        Response parsing & validation
        (reject/flag malformed or
         low-confidence output before
         showing to user — never surface
         a raw, unvalidated model reply)
               │
               ▼
        Cache write (Redis) + persist
        interaction (MongoDB, for
        analytics & feedback-loop tuning)
               │
               ▼
        Return to client
```

### Key Design Decisions
- **Synchronous vs. asynchronous split** directly reflects the PRD: a doubt-chatbot reply must feel instant (`docs/UserJourney.md` Screen 8 shows a streaming "AI is thinking" state), while Mains-answer evaluation is inherently slower and rubric-heavy, so it's queued and the user is notified when ready rather than blocking a request.
- **Low-confidence handling:** per `docs/UserJourney.md` Screen 8, the AI Service must detect and flag low-confidence or off-topic responses *before* they reach the client, offering escalation to the Community module instead of presenting an unreliable answer as fact.
- **Prompt versioning:** every prompt template in `prompts/` is versioned; the AI Service logs which prompt version produced which response, so a content-team edit to a prompt is auditable and reversible — critical for the mains-evaluation rubric, where a bad prompt change could silently degrade feedback quality for every user.
- **Cost/latency control:** aggressive caching of repeated doubt-chatbot questions (many users ask near-identical questions on popular topics) and current-affairs summaries (generated once per article, served to all users) keeps AI provider spend proportional to unique content, not total requests.

---

## 6. Payments Flow

Razorpay handles all payment collection; Nalanda's backend never touches raw card data (PCI scope stays with Razorpay), consistent with the PRD's security requirements.

```
┌────────┐  1. User selects a plan, clicks "Pay Now"      ┌─────────┐
│ Client │────────────────────────────────────────────────▶│ Backend │
└────────┘                                                  └────┬────┘
                                                                  │ 2. Create Razorpay Order
                                                                  │    (amount, currency, receipt
                                                                  │     ID = internal subscription
                                                                  │     intent record)
                                                                  ▼
                                                          ┌───────────────┐
                                                          │   Razorpay    │
                                                          │  Order API    │
                                                          └───────┬───────┘
                                                                  │ 3. orderId returned
┌────────┐  4. Backend returns orderId + publishable key    ┌────┴────┐
│ Client │◀─────────────────────────────────────────────────│ Backend │
└───┬────┘                                                  └─────────┘
    │ 5. Opens Razorpay Checkout (hosted UI — card/UPI/netbanking)
    ▼
┌───────────────┐
│   Razorpay     │  6. User completes payment
│   Checkout     │
└───────┬────────┘
        │ 7. Returns paymentId, orderId, signature to client
        ▼
┌────────┐  8. Client sends these to backend for verification  ┌─────────┐
│ Client │──────────────────────────────────────────────────────▶│ Backend │
└────────┘                                                       └────┬────┘
                                                                       │ 9. Verify HMAC signature
                                                                       │    server-side (never trust
                                                                       │    client-reported "success")
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  Razorpay Webhook│  10. Authoritative
                                                              │  (server-to-     │      confirmation —
                                                              │   server, signed)│      activation is
                                                              └────────┬────────┘      gated on this,
                                                                       │               not the client
                                                                       │               callback alone
                                                                       ▼
                                                          Update Subscription record
                                                          (MongoDB): tier, renewal date,
                                                          payment history
                                                                       │
                                                                       ▼
                                                          Notify user (in-app +
                                                          email receipt) — plan
                                                          now active
```

### Key Design Decisions
- **Dual confirmation (client callback + server webhook):** the client-side "payment succeeded" callback improves perceived responsiveness (immediate "Confirming your payment..." state per `docs/UserJourney.md` Screen 10), but **actual plan activation only happens once the Razorpay webhook is received and its signature verified** — this prevents the exact failure mode called out in `docs/CompetitorAnalysis.md` (Testbook's unauthorized-charge and billing-trust complaints), where a mismatch between client-perceived and server-confirmed state erodes trust.
- **Idempotency:** webhook processing is idempotent (keyed on Razorpay's event ID), so retried webhook deliveries never double-activate or double-charge a subscription.
- **Refunds/cancellations** are modeled as first-class state transitions on the Subscription record (not just external Razorpay-side actions), so the Admin Panel's Subscriptions & Payments dashboard (`docs/InformationArchitecture.md` §5) always reflects ground truth.

---

## 7. Deployment Architecture

```
                        ┌────────────────────────────┐
                        │        Git Repository       │
                        │  (feature branches → PR →   │
                        │   main)                     │
                        └──────────────┬─────────────┘
                                       │  CI pipeline triggers on PR/merge
                                       ▼
                        ┌────────────────────────────┐
                        │     CI: Lint · Type-check   │
                        │   · Unit Tests · Build       │
                        └──────────────┬─────────────┘
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
             ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
             │  Staging Env   │ │ Production Env │ │  Preview Envs  │
             │ (auto-deploy   │ │ (deploy on      │ │ (per-PR, for   │
             │  on merge to   │ │  tagged release) │ │  design/QA     │
             │  develop)      │ │                 │ │  review)       │
             └───────┬───────┘ └────────┬────────┘ └───────────────┘
                     │                  │
        ┌────────────┼──────────────────┼────────────────┐
        ▼            ▼                  ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌────────────────┐ ┌──────────────┐
│ Frontend/Admin │ │  Backend API   │ │ MongoDB Atlas  │ │  Cloudinary  │
│ (static hosting│ │ (containerized,│ │ (managed,       │ │  (managed)   │
│  + CDN, e.g.    │ │  autoscaling   │ │  multi-region   │ │              │
│  Vercel/Netlify │ │  compute, e.g. │ │  replica set)   │ │              │
│  -style)        │ │  Render/Railway│ │                 │ │              │
│                 │ │  /ECS-style)   │ │                 │ │              │
└───────────────┘ └───────────────┘ └────────────────┘ └──────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Observability   │
                   │ - Centralized   │
                   │   logging        │
                   │ - APM/error      │
                   │   tracking       │
                   │ - Uptime/health  │
                   │   checks         │
                   └────────────────┘
```

- **Frontend/Admin:** built as static assets by Vite, deployed to a CDN-backed static host — fast, cheap, and trivially scalable since there's no server-side rendering requirement for this product.
- **Backend:** containerized Express app behind a load balancer, horizontally autoscaled based on CPU/request-latency thresholds — matches the PRD's non-functional requirement to survive concurrent mock-test-start spikes.
- **Environments:** strict separation of `staging` (pre-release validation) and `production`, plus ephemeral per-PR preview environments for design/QA sign-off before merge.
- **Mobile:** built and distributed through standard app-store release pipelines (Play Store primary, per PRD's Android-first guidance), decoupled from the web CI/CD cadence.

---

## 8. Caching Strategy

| Layer | What's Cached | Why |
|---|---|---|
| **CDN/Edge** | Static assets (JS/CSS bundles, images, fonts) | Fastest possible load for low-bandwidth users (Priya persona); reduces origin load. |
| **Redis — API response cache** | Current affairs feed, leaderboards/percentile snapshots, syllabus taxonomy | These change infrequently relative to read volume; avoids recomputation on every request. |
| **Redis — AI response cache** | Doubt-chatbot answers to frequently-asked questions, current-affairs summaries | Directly controls AI provider cost (Section 5); many users ask near-identical questions. |
| **Redis — session/rate-limit store** | Refresh-token metadata, per-user/IP rate-limit counters | Needed for stateless backend instances to share session/abuse state across all Express nodes. |
| **MongoDB query optimization** (not a cache layer, but adjacent) | Compound indexes on frequently filtered fields (exam, subject, difficulty, userId + date) | Keeps p95 query latency low without needing an app-level cache for every read path. |
| **Client-side (mobile)** | Downloaded notes/PDFs, last-synced dashboard state | Enables the PRD's offline-study requirement; explicitly distinct from a "no connectivity" error state (`docs/UserJourney.md` Screen 5). |
| **Browser (web)** | Static assets via standard HTTP cache headers; short-lived in-memory cache for repeated Analytics chart re-renders within a session | Reduces redundant network calls during a single study session. |

**Cache invalidation principle:** every cache write carries a clear TTL or an explicit invalidation trigger tied to the underlying write path (e.g., publishing a new Current Affairs entry invalidates that day's cache key) — no cache entry is ever "invalidate on a timer and hope," which would risk showing stale content that contradicts the "never use dummy/stale data" spirit of `CLAUDE.md`'s rules.

---

## 9. Scaling Strategy

1. **Stateless backend, horizontally scaled.** Every Express instance is interchangeable — session state lives in Redis/JWT, never in-process memory — so instances can be added/removed behind the load balancer without sticky sessions.
2. **Database scaling via MongoDB Atlas's managed primitives.** Start with a replica set for read scaling and high availability; design schemas and access patterns (from day one) to be sharding-ready (e.g., avoid unbounded document growth, choose shard-key candidates like `examCategory` or `userId` early) even if sharding isn't enabled until user volume demands it.
3. **Decouple spiky workloads via the job queue.** Mock-test-start spikes (thousands of users beginning a scheduled Live Exam simultaneously — PRD §8, Scalability) are absorbed by (a) pre-warming/caching the test's question set ahead of the scheduled time, and (b) queuing any heavy post-submission processing (detailed analytics computation) rather than computing it synchronously in the request path.
4. **AI workload isolation.** AI Orchestration Service calls are rate-limited and queued independently of the core API's capacity — a surge in AI usage (e.g., many students requesting explanations right before an exam) must never degrade unrelated functionality like login or test submission.
5. **CDN-first for all static and semi-static content.** Notes, video lessons, and current-affairs content are served through Cloudinary's and the CDN's edge network, keeping the origin backend focused purely on dynamic, personalized requests.
6. **Read/write separation for analytics.** Heavy analytics aggregation (percentile computation across the full user base) runs against read replicas or scheduled batch jobs, never against the primary write path that handles live test submissions.

---

## 10. Security

| Domain | Measures |
|---|---|
| **Transport** | HTTPS everywhere (enforced via HSTS); no plaintext fallback on any surface. |
| **Authentication** | Firebase-verified identity + short-lived Nalanda JWT access tokens; HttpOnly/Secure/SameSite refresh-token cookies; refresh-token rotation with reuse detection (Section 4). |
| **Authorization** | RBAC middleware (`role` + `subscriptionTier` claims) applied consistently as a separate concern from authentication — never inferred ad hoc inside a controller. |
| **Input handling** | Schema validation (per-route validators) on every request; sanitization against NoSQL injection (parameterized Mongoose queries, no raw query construction from user input) and XSS (output encoding on any user-generated content shown in Community/Bookmarks). |
| **Rate limiting & abuse prevention** | Per-IP and per-user rate limits on auth endpoints (OTP request/verify, login) and AI endpoints (prevent both brute-force and AI-cost abuse); temporary lockouts on repeated OTP failures (`docs/UserJourney.md` Screen 3). |
| **Payments** | Razorpay webhook signature verification (HMAC) on every incoming webhook; no card data ever touches Nalanda's servers; idempotent webhook processing (Section 6). |
| **File uploads** | **Implemented 2026-08-03 (Sprint 3 Step 50) as a backend-proxied upload, not the signed/scoped-token design this row originally described** — see `docs/PROJECT_CONTEXT.md` §13 for the full reasoning (short version: server-side MIME-type/extension/file-size validation, required by this step, isn't enforceable by a signed-widget token before Cloudinary accepts the file). The client never gets any Cloudinary credential at all — `multer` buffers the upload in memory, the backend validates MIME/extension/size, then streams it to Cloudinary via the server-held API secret (`services/media/cloudinaryUpload.service.ts`). `CLOUDINARY_API_SECRET` still never reaches the frontend, satisfying this row's actual security intent through a different mechanism. Covers avatars, question/current-affairs images, and study-material files; mains-answer uploads aren't built yet (AI Orchestration/Sprint 4 scope). |
| **Secrets management** | All API keys/credentials (Firebase service account, Razorpay keys, Cloudinary secret, AI provider key, JWT signing key) stored in a secrets manager or environment-injected config, never committed to source control. |
| **Data privacy (DPDP Act)** | Encryption at rest (MongoDB Atlas default) and in transit; explicit user consent capture at registration; self-serve data export/delete flows (`docs/UserJourney.md` Screen 11) with a defined fulfillment SLA. |
| **Auditability** | All Admin Panel actions (content edits, refunds, role changes, bans) logged to an append-only Audit Log collection, per PRD §11 — every privileged action is attributable and reviewable. |
| **Dependency & supply-chain hygiene** | Automated dependency vulnerability scanning in CI; lockfile-pinned dependencies; regular patching cadence for both frontend and backend packages. |
| **AI-specific safety** | Output validation before any AI response reaches a user (Section 5); explicit scope-limiting in prompts (e.g., mains-evaluation prompt cannot be redirected into unrelated tasks via user input); logged, versioned prompts for auditability of AI behavior changes. |

---

## Cross-Document Consistency Notes

- The **Payments flow** here implements the exact error states specified in `docs/UserJourney.md` Screen 10 (no false success, no duplicate charges, transparent processing state) — this document explains *why* those UX guarantees are achievable (webhook-gated activation, idempotency).
- The **Folder Structure** in Section 2 is the direct technical realization of the four-surface model defined in `docs/InformationArchitecture.md` Section 2 — Website, Student Dashboard, Admin Panel, and Mobile App map one-to-one onto `frontend/`, `admin/`, and `mobile/`, all served by the single `backend/`.
- The **AI Flow**'s synchronous/asynchronous split operationalizes every AI feature enumerated in `docs/PRD.md` §10, and its low-confidence-escalation behavior implements the AI Explanation screen's edge cases from `docs/UserJourney.md` Screen 8.

---

*End of Document.*
