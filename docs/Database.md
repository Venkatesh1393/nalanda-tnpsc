# Nalanda TNPSC — Database Design (MongoDB)

| | |
|---|---|
| **Document Owner** | Database Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md`, `docs/InformationArchitecture.md`, `docs/Architecture.md`, `docs/FolderStructure.md` |
| **Database** | MongoDB Atlas (per confirmed stack) |

---

## 1. Modeling Philosophy

MongoDB rewards designing around **access patterns**, not around a normalized relational mental model. Three decisions recur throughout this design:

1. **Embed when data is small, bounded, and always read together with its parent** (e.g., a question's answer options).
2. **Reference when data is large, unbounded, independently queried, or written at a much higher frequency than its parent** (e.g., a user's thousands of question attempts must never live inside the `Users` document).
3. **Denormalize deliberately for read performance**, accepting a controlled amount of duplication (e.g., storing `examCategory` on a `Question` document even though it's technically derivable via `Subject`) — because Nalanda's read-to-write ratio is heavily read-dominated (a user reads/answers questions far more often than the content team edits them), and MongoDB has no cheap joins.

Where the requested list of 23 collections includes an item that is architecturally better modeled as an **embedded sub-document** rather than a standalone top-level collection (notably **Question Options**), this document says so explicitly and explains why, rather than force-fitting every requested name into its own collection.

---

## 2. Collection Catalog Overview

| # | Requested Item | Modeled As | Rationale |
|---|---|---|---|
| 1 | Users | Standalone collection | Auth/identity hot path — must stay small and fast to read on every request. |
| 2 | Profiles | Standalone collection (1:1 with Users) | Larger, less frequently read personalization data — separated so JWT-verification reads don't drag in profile bulk. |
| 3 | Subjects | Standalone collection | Top of content taxonomy; small, slow-changing. |
| 4 | Topics | Standalone collection | Child of Subjects; small, slow-changing. |
| 5 | Subtopics | Standalone collection | Child of Topics; small, slow-changing. |
| 6 | Questions | Standalone collection | Large, independently queried (search/filter by subject/topic/difficulty). |
| 7 | Question Options | **Embedded array within Questions** | Small (~4 items), bounded, always fetched with the question, never queried independently — a textbook embedding case. |
| 8 | Question Attempts | Standalone collection (high-volume) | One document per answer; written constantly, queried for analytics — needs independent indexing/sharding. |
| 9 | Bookmarks | Standalone collection | Polymorphic references to Questions/Study Materials/Current Affairs; grows per user, queried independently of the source content. |
| 10 | Study Plans | Standalone collection | Sizeable, evolving per-user documents; distinct write pattern from Profiles (daily task updates). |
| 11 | Analytics | Standalone collection (materialized view) | Precomputed aggregates, refreshed by background jobs — not computed live from raw attempts on every dashboard load. |
| 12 | Current Affairs | Standalone collection | Independently published, browsed, and searched content. |
| 13 | Mock Tests | Standalone collection | Reusable test *definitions* (question sets), distinct from a user's attempt at one. |
| 14 | Live Exams | Standalone collection | Scheduled instances of a test with cohort/timing semantics — distinct from Mock Tests' on-demand nature. |
| 15 | Leaderboards | Standalone collection (materialized, bounded) | Precomputed top-N rankings per scope/period — never a live full-table sort. |
| 16 | Subscriptions | Standalone collection | Billing state machine, referenced by both student app and Admin Panel. |
| 17 | Payments | Standalone collection | Immutable transaction log, one document per payment event. |
| 18 | Notifications | Standalone collection | High write volume, per-user, time-decaying relevance. |
| 19 | Badges | Standalone collection (small, catalog/reference data) | Admin-managed definitions of what can be earned. |
| 20 | Achievements | Standalone collection (join: User × Badge) | Records *who* earned *what*, *when* — kept separate from the badge catalog itself. |
| 21 | AI History | Standalone collection (high-volume, TTL-managed) | Audit/feedback-loop log of every AI interaction. |
| 22 | Study Materials | Standalone collection | Notes/PDF content, independently versioned and published. |
| 23 | Videos | Standalone collection | Video lesson content, independently versioned and published. |

---

## 3. ER Diagram — Full Platform (Clustered View)

```
┌───────────────────────┐        ┌───────────────────────────────────────────┐
│   IDENTITY CLUSTER     │        │        CONTENT TAXONOMY CLUSTER            │
│                        │        │                                             │
│   Users ──1:1── Profile│        │  Subject ──1:N── Topic ──1:N── Subtopic    │
│      │                 │        │                       │            │       │
└──────┼────────────────┘        │                       │            │       │
       │                          │            ┌──────────┘            │       │
       │                          │            ▼                       ▼       │
       │                          │      StudyMaterials            Videos      │
       │                          └───────────────────────────────────────────┘
       │
       │                          ┌───────────────────────────────────────────┐
       │                          │           TESTING ENGINE CLUSTER           │
       │                          │                                             │
       ├─────────────────────────▶│  Subtopic ──1:N── Question (+ embedded     │
       │  (attempts, bookmarks,   │                     Options[])              │
       │   registrations)         │       │                                     │
       │                          │       │ N:M (via ordered questionIds[])     │
       │                          │       ▼                                     │
       │                          │  MockTest ──1:N── LiveExam (scheduled       │
       │                          │                    instance of a MockTest)  │
       │                          │       │                                     │
       │                          │       ▼                                     │
       │◀─────────────────────────┤  QuestionAttempt (Users × Questions ×       │
       │                          │   MockTest/LiveExam, high volume)           │
       │                          └───────────────────────────────────────────┘
       │
       │                          ┌───────────────────────────────────────────┐
       │                          │     PERSONALIZATION & ANALYTICS CLUSTER    │
       ├─────────────────────────▶│  StudyPlan (1:N per User, one per exam)    │
       │                          │  Analytics (1:N per User, materialized)    │
       │                          │  Bookmark (1:N per User, polymorphic ref)  │
       │                          │  Leaderboard (references Users in entries[])│
       │                          └───────────────────────────────────────────┘
       │
       │                          ┌───────────────────────────────────────────┐
       ├─────────────────────────▶│           COMMERCE CLUSTER                  │
       │                          │  Subscription (1:N per User) ──1:N── Payment│
       │                          └───────────────────────────────────────────┘
       │
       │                          ┌───────────────────────────────────────────┐
       ├─────────────────────────▶│           ENGAGEMENT CLUSTER                │
       │                          │  Notification (1:N per User)                │
       │                          │  Badge (catalog) ──1:N── Achievement        │
       │                          │                          (User × Badge)     │
       │                          └───────────────────────────────────────────┘
       │
       │                          ┌───────────────────────────────────────────┐
       └─────────────────────────▶│              AI CLUSTER                     │
                                  │  AIHistory (1:N per User, per feature)      │
                                  └───────────────────────────────────────────┘

              (Independent: CurrentAffairs — referenced by Bookmark and by
               AI-generated Current-Affairs Quiz questions, but not owned by
               any cluster above)
```

---

## 4. Detailed Collection Designs

### 4.1 Identity Cluster

#### `Users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `firebaseUid` | String | Unique — links to Firebase Auth identity |
| `email` | String | Unique, verified flag tracked separately |
| `authProvider` | Enum: `google`, `email` | Set at registration |
| `role` | Enum: `user`, `moderator`, `content_editor`, `admin` | Drives RBAC (per `docs/Architecture.md` §4) |
| `subscriptionTier` | Enum: `free`, `plus`, `pro`, `institutional` | Denormalized here for fast JWT-claim population, kept in sync from `Subscriptions` |
| `status` | Enum: `active`, `suspended`, `deleted` | Soft-delete supports DPDP Act data-deletion workflow with an audit trail |
| `refreshTokenHash` | String | For refresh-token rotation/revocation (§4 of Architecture.md) |
| `languagePreference` | Enum: `ta`, `en`, `bilingual` | |
| `createdAt`, `lastLoginAt` | Date | |

**Why separate from Profiles:** Every authenticated API request reads this document (for role/tier claims). Keeping it minimal keeps that hot-path read cheap.

#### `Profiles`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | Unique — enforces 1:1 |
| `name`, `photoUrl` | String | |
| `examGoals` | Array of `{ examCategory, targetDate, dailyStudyHours, isPrimary }` | Supports multi-exam users (PRD §7.1) |
| `institutionId` | ObjectId (ref `Institutions`, optional) | Links coaching-center students/owners (Selvam/Rajendran personas) |
| `streak` | `{ current, longest, lastActiveDate }` | Embedded — small, always read with profile |
| `syllabusProgress` | Map: `examCategory → percentComplete` | Denormalized summary; source of truth remains completion events |
| `notificationPreferences` | Embedded object | Read by `preferenceResolver` before every dispatch (`docs/FolderStructure.md` §10) |
| `district` | String, optional | Enables regional analytics/rollout targeting |

---

### 4.2 Content Taxonomy Cluster

#### `Subjects`, `Topics`, `Subtopics`
| Field (common pattern) | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | `{ ta, en }` | Bilingual by design (PRD §8 Localization) |
| `parentId` | ObjectId (ref parent collection; absent for Subjects) | `Topics.subjectId`, `Subtopics.topicId` |
| `examCategories` | Array of Enum | A Subject/Topic can apply to multiple exams (e.g., "General Science" spans Group 4, VAO, Group 2) |
| `order` | Number | Controls Learn-module display sequence |

**Scalability note:** Kept as three flat collections per the requested structure. If the taxonomy grows deep/irregular in the future (e.g., Mains-specific sub-branches), consider migrating to a single `SyllabusNode` collection using the **materialized path** pattern (`path: "subjectId,topicId,subtopicId"`) to support arbitrary depth without schema changes — flagged here as a Phase 2+ consideration, not needed at MVP scale.

#### `Study Materials`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `subtopicId` | ObjectId (ref `Subtopics`) | |
| `title`, `body` | `{ ta, en }` | Rich text or reference to a Cloudinary asset for PDFs |
| `isPremium` | Boolean | Drives the Learn-module paywall (`docs/UserJourney.md` Screen 6) |
| `version` | Number | Supports content revision history |
| `authorId` | ObjectId (ref `Users`, role=content_editor) | |
| `publishedAt` | Date | |

#### `Videos`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `subtopicId` | ObjectId (ref `Subtopics`) | |
| `title` | `{ ta, en }` | |
| `cloudinaryAssetId`, `durationSeconds`, `thumbnailUrl` | String/Number | |
| `transcript` | `{ ta, en }`, optional | Supports search and accessibility |
| `isPremium` | Boolean | |

---

### 4.3 Testing Engine Cluster

#### `Questions` (with embedded Options)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `subtopicId` | ObjectId (ref `Subtopics`) | |
| `topicId`, `subjectId`, `examCategories` | Denormalized copies | Avoids a join chain for every filtered question query |
| `questionText` | `{ ta, en }` | |
| `options` | **Embedded array** of `{ optionId, text: { ta, en }, isCorrect }` | See rationale in §2 |
| `explanation` | `{ ta, en }` | Powers both Learn/Practice review and the AI Explanation fallback |
| `difficulty` | Enum: `easy`, `medium`, `hard` | Feeds the adaptive-difficulty engine (PRD §10) |
| `source` | Enum: `pyq`, `ai_generated`, `curated` | |
| `pyqYear` | Number, optional | |
| `tags` | Array of String | Free-form, supports search |

#### `Question Attempts` (high-volume)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `questionId` | ObjectId (ref `Questions`) | |
| `sessionId` | ObjectId (ref `MockTests`/`LiveExams` attempt, optional) | Null for ad-hoc practice |
| `mode` | Enum: `practice`, `sectional`, `mock`, `live`, `pyq` | |
| `selectedOptionId` | String | References the embedded option's `optionId`, not a separate collection |
| `isCorrect` | Boolean | |
| `timeTakenSeconds` | Number | Powers the "time-per-question" analytics (PRD §7.3) |
| `markedForReview` | Boolean | |
| `attemptedAt` | Date | |

**This is the platform's single highest-volume collection** — every quiz/mock/live-exam answer is one document. All analytics, weak-area detection, and percentile computation ultimately derive from here (via scheduled aggregation, not live queries — see §8 Performance).

#### `Mock Tests`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `examCategory` | Enum | |
| `title`, `year` | String/Number | |
| `type` | Enum: `full`, `sectional` | |
| `questionIds` | Array of ObjectId (ref `Questions`), ordered | Referenced, not embedded — questions are reused across many tests |
| `durationMinutes`, `markingScheme` | Number/Object | |
| `isPremium` | Boolean | |

#### `Live Exams`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `mockTestId` | ObjectId (ref `MockTests`) | Reuses an existing question-set definition |
| `scheduledStartAt`, `scheduledEndAt` | Date | |
| `status` | Enum: `scheduled`, `live`, `completed` | |
| `registeredCount` | Number (counter, not an array) | See anti-pattern note below |

**Anti-pattern avoided:** A naive design would embed `registeredUserIds: [...]` directly on the `LiveExam` document. At cohort scale (thousands of registrants), this creates an **unbounded array** — a well-known MongoDB anti-pattern that degrades document read/write performance and risks hitting the 16MB document size limit. Instead, registration is tracked via `Question Attempts` documents carrying this `LiveExam`'s `sessionId`, with `registeredCount` maintained as a fast counter (incremented atomically, not derived by scanning an array).

---

### 4.4 Personalization & Analytics Cluster

#### `Study Plans`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `examCategory`, `targetDate`, `dailyHours` | | |
| `dailyTasks` | Array of `{ date, taskType, refId, status }` | Bounded to a rolling window (see §8) |
| `planVersion` | Number | |
| `aiPromptVersion` | String | Traceability back to `prompts/` (per `docs/Architecture.md` §5) |

#### `Analytics` (materialized view)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId`, `examCategory` | | |
| `computedAt` | Date | Set by the background aggregation job, not on-request |
| `sectionalScores` | Map: `subjectId → averageScore` | |
| `weakTopics` | Array of `{ topicId, score, rank }` | |
| `percentile`, `rankEstimate` | Number | |
| `trend` | Array of `{ date, score }` | Bounded (e.g., last 90 days); older points rolled into a monthly summary |

#### `Bookmarks`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `contentType` | Enum: `question`, `study_material`, `current_affairs`, `video` | **Polymorphic reference discriminator** |
| `contentId` | ObjectId | Refers to whichever collection `contentType` names |
| `note` | String, optional | Personal annotation |
| `createdAt` | Date | |

#### `Leaderboards` (materialized, bounded)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `scope` | Enum: `liveExam`, `examCategory`, `global` + `scopeRefId` | |
| `periodStart`, `periodEnd` | Date | |
| `entries` | Array of `{ userId, score, rank }`, **capped to top 100** | Never unbounded — a user's own rank outside the top 100 is computed on-demand from `Analytics`, not stored in this array |

---

### 4.5 Current Affairs

#### `Current Affairs`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `date` | Date | |
| `period` | Enum: `daily`, `weekly`, `monthly` | |
| `title`, `body` | `{ ta, en }` | |
| `examRelevanceTags` | Array of String | e.g., `"GroupI-Mains-Ethics"` — powers the Divya-persona relevance filtering (PRD §10 Feature 6) |
| `quizQuestionIds` | Array of ObjectId (ref `Questions`), optional | Auto-generated companion quiz |
| `aiSummaryVersion` | String | |

---

### 4.6 Commerce Cluster

#### `Subscriptions`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `institutionId` | ObjectId, optional | For institutional/B2B seat licensing |
| `tier` | Enum: `free`, `plus`, `pro`, `institutional` | |
| `status` | Enum: `active`, `cancelled`, `expired`, `past_due` | |
| `razorpaySubscriptionId` | String | |
| `currentPeriodEnd`, `autoRenew` | Date/Boolean | |
| `tierHistory` | Array of `{ tier, changedAt }` | Bounded, small — audit of plan changes |

#### `Payments`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId`, `subscriptionId` | ObjectId refs | |
| `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature` | String | |
| `webhookEventId` | String, **unique index** | Enforces webhook idempotency (`docs/Architecture.md` §6) |
| `amount`, `currency`, `status` | Number/String/Enum | |
| `invoiceUrl` | String | |
| `createdAt` | Date | Immutable — payments are never edited, only appended (refunds are new documents referencing the original) |

---

### 4.7 Engagement Cluster

#### `Notifications`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `type` | Enum: `study_reminder`, `live_exam_alert`, `official_notification`, `billing`, `community_reply` | |
| `title`, `body` | `{ ta, en }` | |
| `channel` | Enum: `push`, `email`, `sms`, `in_app` | |
| `isRead` | Boolean | |
| `deepLink` | String | Maps to the route table in `docs/InformationArchitecture.md` §9 |
| `createdAt` | Date | TTL-indexed (see §9) |

**Broadcast fan-out note:** A mass notification (e.g., "official TNPSC notification released") is **not** written as one document per user synchronously in the request path. The `notifications.broadcast` job (per `docs/FolderStructure.md` §10) batch-inserts per-user documents asynchronously, so a 500,000-user broadcast never blocks or spikes the primary write path.

#### `Badges` (catalog) and `Achievements` (earned instances)
| Collection | Field | Type | Notes |
|---|---|---|---|
| `Badges` | `_id`, `name`, `description`, `iconUrl`, `criteria`, `category` | | Small, admin-managed reference data — e.g., "7-Day Streak," "First Mock Completed" |
| `Achievements` | `_id`, `userId`, `badgeId`, `examCategory` (optional), `earnedAt` | ObjectId/ObjectId/Enum/Date | The actual join between a user and a badge; kept separate so the badge catalog can be edited without touching millions of earned-instance records |

---

### 4.8 AI Cluster

#### `AI History`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId (ref `Users`) | |
| `feature` | Enum: `doubt_chatbot`, `mains_evaluation`, `study_plan`, `current_affairs_summary`, `adaptive_difficulty` | |
| `promptVersion` | String | Ties back to a specific file/version in `prompts/` |
| `inputSummary`, `outputSummary` | String | Stored for audit and quality-feedback tuning (`docs/Architecture.md` §5) |
| `confidenceFlag` | Enum: `high`, `low`, `escalated` | |
| `userFeedback` | Enum: `up`, `down`, `none` | |
| `createdAt` | Date | TTL/archival policy differs by feature (see §9) |

---

## 5. Relationships Summary

| Relationship | Cardinality | Embed or Reference |
|---|---|---|
| Users ↔ Profiles | 1:1 | Reference (kept separate for hot-path read size) |
| Subjects → Topics → Subtopics | 1:N chain | Reference (parentId at each level) |
| Subtopics → Questions / StudyMaterials / Videos | 1:N | Reference |
| Questions → Options | 1:N, small & bounded | **Embedded** |
| Users × Questions × MockTests/LiveExams → Question Attempts | N:M (junction) | Reference (high-volume junction collection) |
| MockTests → Questions | N:M via ordered `questionIds[]` | Reference (questions reused across many tests) |
| MockTests → LiveExams | 1:N | Reference |
| Users → Bookmarks → (Questions/StudyMaterials/CurrentAffairs/Videos) | 1:N, polymorphic | Reference with a `contentType` discriminator |
| Users → StudyPlans | 1:N (one per exam goal) | Reference |
| Users → Analytics | 1:N (one per exam goal), materialized | Reference |
| Users → Subscriptions → Payments | 1:N:N | Reference (immutable payment log) |
| Users → Notifications | 1:N | Reference |
| Badges ↔ Users via Achievements | N:M (junction) | Reference |
| Users → AI History | 1:N | Reference |
| Institutions → Profiles (students) / Subscriptions | 1:N | Reference (B2B cluster, per `docs/UserPersonas.md` Rajendran persona) |

---

## 6. Indexing Strategy

| Collection | Index | Purpose |
|---|---|---|
| `Users` | `firebaseUid` (unique), `email` (unique) | Login/lookup on every authenticated request |
| `Profiles` | `userId` (unique) | 1:1 lookup |
| `Subjects`/`Topics`/`Subtopics` | `parentId + order` (compound) | Ordered tree traversal for the Learn module |
| `Questions` | `subtopicId + difficulty`, `examCategories + tags` (compound, multikey) | Filtered practice-quiz generation |
| `Question Attempts` | `userId + attemptedAt` (compound), `sessionId`, `questionId` | User history queries, session grouping, per-question difficulty recalibration |
| `Mock Tests` | `examCategory + type + isPremium` | Practice-mode listing/filtering |
| `Live Exams` | `status + scheduledStartAt` | "Upcoming"/"Live Now" queries (`docs/InformationArchitecture.md` §7.10) |
| `Bookmarks` | `userId + contentType` (compound) | Bookmarks-tab listing per content type |
| `Study Plans` | `userId + examCategory` (unique compound) | One active plan per user per exam |
| `Analytics` | `userId + examCategory` (unique compound) | Dashboard/Analytics-screen lookup |
| `Current Affairs` | `date` (descending), `examRelevanceTags` (multikey) | Feed pagination, Mains-relevance filtering |
| `Leaderboards` | `scope + scopeRefId + periodStart` (compound) | Scoped leaderboard lookup |
| `Subscriptions` | `userId`, `razorpaySubscriptionId` (unique) | Billing lookups |
| `Payments` | `webhookEventId` (unique), `userId + createdAt` | Idempotency enforcement, payment history |
| `Notifications` | `userId + isRead + createdAt` (compound), `createdAt` (TTL) | Unread-count queries, automatic expiry |
| `Achievements` | `userId + badgeId` (unique compound) | Prevents duplicate badge awards |
| `AI History` | `userId + feature + createdAt`, `createdAt` (TTL, feature-dependent) | Feedback-loop queries, automatic archival |

All compound indexes are ordered with the **most selective/most frequently equality-filtered field first**, consistent with MongoDB's index-prefix rules, so a single compound index serves multiple related query shapes.

---

## 7. Validation Strategy

MongoDB's native **`$jsonSchema` collection validators** are applied at the collection level (not just at the application layer), giving a second line of defense consistent with `CLAUDE.md`'s "always validate APIs" rule:

| Collection | Key Validation Rules |
|---|---|
| `Users` | `email` required + valid format; `role` restricted to the defined enum; `authProvider` required |
| `Questions` | `options` array must contain between 2–6 entries; **exactly one** `option.isCorrect: true` enforced at the application layer (schema validators can check array bounds but not cross-element uniqueness — this is why the write path in `services/practice/` double-checks this invariant before save) |
| `Question Attempts` | `selectedOptionId` required; `mode` restricted to enum; `timeTakenSeconds` must be non-negative |
| `Subscriptions` | `tier`/`status` restricted to enums; `currentPeriodEnd` required when `status: active` |
| `Payments` | `webhookEventId` required and unique (enforced via unique index, not just schema) |
| `Notifications` | `channel`/`type` restricted to enums; `userId` required unless a document is explicitly a broadcast-template record |
| `Current Affairs` | `period` restricted to enum; `date` required |

**Validation level:** set to `moderate` (validates inserts and updates to already-valid documents, but doesn't retroactively fail on pre-existing invalid documents) during active development, tightening to `strict` once the schema stabilizes ahead of production launch.

---

## 8. Performance Considerations

1. **Analytics and Leaderboards are materialized, never computed live.** A background job (per `docs/Architecture.md` §9, "read/write separation for analytics") aggregates `Question Attempts` into `Analytics` documents on a schedule (e.g., every few minutes for active users, hourly otherwise) — the Dashboard and Analytics screens always read a precomputed document, never trigger a live aggregation over potentially millions of attempt records.
2. **Denormalized filter fields on `Questions`** (`examCategories`, `topicId`, `subjectId` copied down from the taxonomy chain) avoid a 3-hop join just to answer "give me 20 medium-difficulty Group 4 Aptitude questions."
3. **Bounded arrays everywhere.** `Leaderboards.entries` (top 100), `StudyPlans.dailyTasks` (rolling window), `Analytics.trend` (last 90 days) — every embedded array has an explicit, enforced cap, avoiding the unbounded-array anti-pattern already called out for `LiveExams` in §4.3.
4. **Read-heavy collections get compound indexes covering the query, not just the filter.** E.g., `Question Attempts` on `userId + attemptedAt` supports both "this user's attempts" and "this user's attempts, most recent first" without an in-memory sort.
5. **Write-heavy `Question Attempts` inserts are append-only**, never updated in place — this avoids costly document-relocation/fragmentation that in-place growth of variable-length fields can cause on other collections.
6. **Connection pooling and stateless backend instances** (per `docs/Architecture.md` §9) mean MongoDB connection count scales with backend instance count, not per-user — pool size is tuned at the driver level, not per-request.

---

## 9. Future Scalability

1. **Sharding readiness.** The two collections most likely to require sharding first are `Question Attempts` and `AI History` (both grow roughly linearly with active-user-days). Recommended shard key candidates:
   - `Question Attempts`: a **compound hashed shard key on `userId`** (or `{ userId: hashed }`) — spreads write load evenly across shards while keeping a given user's history reasonably co-located for range queries.
   - `AI History`: similarly `{ userId: hashed }`, or `{ feature: 1, createdAt: 1 }` if cross-user feature-level analysis becomes the dominant query pattern.
   - Sharding is **not enabled at MVP** — MongoDB Atlas's managed replica set with read replicas is sufficient until write volume genuinely requires it (per `docs/Architecture.md` §9's phased approach).
2. **Time-series collections.** `Question Attempts`, `Analytics.trend` entries, and `AI History` are all fundamentally timestamped event/metric data. As volume grows, migrating the raw event layer (`Question Attempts`, `AI History`) to **MongoDB Time Series collections** is a strong Phase 2+ candidate — they offer purpose-built compression and query performance for exactly this "many documents per user over time" shape, without changing the logical schema described above.
3. **TTL and archival policy, tuned per collection's value decay:**
   - `Notifications`: short TTL (e.g., 90 days) — old notifications have near-zero ongoing value.
   - `AI History`: tiered — `doubt_chatbot` interactions TTL'd after ~12 months (high volume, lower long-term value), while `mains_evaluation` history is retained indefinitely (lower volume, high value for a returning Mains aspirant tracking improvement over multiple attempt cycles, per the Divya persona).
   - `Question Attempts`: retained long-term (it's the ground truth behind Analytics and product-level insight into question difficulty calibration), but older raw attempts can be rolled up into monthly summary documents once a user's `Analytics.trend` window has moved past them.
4. **Multi-region readiness.** MongoDB Atlas's global cluster capabilities are available if Nalanda's Phase 4 expansion (per `docs/PRD.md` §13, adjacent state PSCs) introduces meaningfully distinct regional user bases — not needed while the product remains Tamil-Nadu-focused, but the collection design (no hard-coded region assumptions in schemas) doesn't block it later.
5. **Institutions as a first-class future collection.** This design references `institutionId` from `Profiles` and `Subscriptions` in anticipation of the B2B/coaching-center model (`docs/UserPersonas.md`, Rajendran persona) — a full `Institutions` collection (name, branches, seat count, billing contact) should be formally added when the Institutional tier is built, rather than retrofitted.

---

## 10. Recommendations

1. **Do not create a standalone `Question Options` collection.** Keep options embedded in `Questions` as designed in §4.3 — this is the single clearest embed-vs-reference call in this schema and reversing it would add a join to the platform's most frequently read collection for no benefit.
2. **Build the `Analytics` and `Leaderboards` aggregation jobs before the corresponding UI screens go live**, not after — both `docs/UserJourney.md` (Analytics screen) and `docs/InformationArchitecture.md` (Live Exams/Leaderboards) assume these are always precomputed, and retrofitting a materialized-view job onto a live product is far riskier than building it in from day one.
3. **Enforce the bounded-array rule as a team-wide schema-review checklist item.** Every new array field added to any collection in the future should be reviewed for a growth ceiling before merge — this is how the `LiveExams.registeredUserIds` anti-pattern was caught here and should be caught again for whatever comes next.
4. **Track prompt versioning consistently between `AI History` and `Study Plans`.** Both collections store an `aiPromptVersion`/`promptVersion` field pointing back to `prompts/` — keep this field name and semantics identical across collections to make cross-collection AI-quality analysis (e.g., "did the v3 mains-evaluation prompt improve user feedback scores?") a straightforward query rather than a data-cleaning exercise.

---

*End of Document.*
