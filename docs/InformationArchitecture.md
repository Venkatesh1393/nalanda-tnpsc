# Nalanda TNPSC — Information Architecture

| | |
|---|---|
| **Document Owner** | UX / Product Design |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md` |
| **Scope** | Complete navigation structure across all four Nalanda surfaces, plus internal architecture for every cross-cutting module |

---

## 1. IA Principles

1. **Four surfaces, one architecture.** The public **Website**, the authenticated **Student Dashboard** (web), the **Admin Panel**, and the **Mobile App** are distinct navigational shells, but they share the same underlying modules (Learning, Practice, Analytics, etc.) so a concept never means two different things in two different places.
2. **Shallow before deep.** No core learning/practice action should require more than 3 taps/clicks from the Dashboard, consistent with the low-bandwidth, time-scarce personas in `docs/UserPersonas.md` (Priya, Karthik).
3. **Settings is the umbrella; Profile is a tab within it.** `docs/UserJourney.md` describes a "Profile" screen that also handles notification preferences and account actions. This document formalizes **Settings** as the parent IA node, with **Profile** as its first, default tab — the two documents describe the same destination at different zoom levels, not a contradiction.
4. **Exam-scoped, not just content-scoped.** Because a user may be preparing for more than one exam (PRD §7.1), every module's navigation must carry an implicit "which exam am I currently viewing" context, switchable from the Dashboard.
5. **Admin mirrors the student IA, inverted.** Wherever a student *consumes* something (a note, a test, a current-affairs post), the Admin Panel has a matching *manage* node for the same content — this keeps the two IAs conceptually paired rather than independently invented.

---

## 2. Platform Overview — Four Surfaces, Shared Modules

```
                         ┌───────────────────────────┐
                         │   NALANDA TNPSC PLATFORM  │
                         └─────────────┬─────────────┘
          ┌───────────────┬────────────┼────────────┬───────────────┐
          │               │            │            │               │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌──▼───────┐  ┌─▼─────────┐
    │  Website  │  │   Student   │  │  Admin   │  │  Mobile   │
    │  (Public) │  │  Dashboard  │  │  Panel   │  │   App     │
    └───────────┘  └─────────────┘  └──────────┘  └───────────┘
          │               │            │            │
          └───────────────┴─────┬──────┴────────────┘
                                 │
                  ┌──────────────▼──────────────────────────────┐
                  │           SHARED CORE MODULES                │
                  │  Learning · Practice · Analytics · Payments   │
                  │  Settings · Community · Notifications         │
                  │  Bookmarks · Current Affairs · Live Exams      │
                  └────────────────────────────────────────────┘
```

Each surface below is a distinct **navigational shell** wrapping some subset of the shared modules, tailored to that surface's audience and device constraints.

---

## 3. Website (Public / Marketing) — Navigation

### Purpose
Unauthenticated, SEO-facing surface. Drives Registration (per `docs/UserJourney.md`, Screen 1).

### Navigation Tree

```
Website (Home)
├── Exams
│   ├── Group 1
│   ├── Group 2
│   ├── Group 2A
│   ├── Group 4
│   ├── VAO
│   ├── Police
│   ├── Forest
│   └── TRB
├── Current Affairs (public preview — teaser of the full module)
├── Pricing
│   ├── Free
│   ├── Plus
│   ├── Pro
│   └── Institutional (Coaching Centers)
├── For Coaching Centers  (B2B landing page, per the Rajendran persona)
├── Success Stories / Testimonials
├── About Nalanda
├── Blog / SEO Content Hub
├── Contact / Support
├── Login
└── Get Started Free  (→ Registration)
```

### Breadcrumb Examples
- `Home > Exams > Group 4`
- `Home > Pricing > Institutional`
- `Home > Blog > "TNPSC Group 2 Syllabus 2026"`

Public pages are shallow by design (max depth 2) since breadcrumbs here exist mainly for SEO structured data, not user wayfinding.

---

## 4. Student Dashboard (Authenticated Web App) — Navigation

### Purpose
The primary working surface for every individual learner persona (Priya, Karthik, Divya, Selvam).

### Navigation Shell
- **Top bar (persistent):** Nalanda logo · Exam-goal switcher · Global search · Notifications bell · Language toggle · Profile avatar
- **Left sidebar (persistent on desktop, collapsible drawer on tablet):** primary module list below

### Navigation Tree

```
Student Dashboard
├── Dashboard (home)
├── Learn
│   ├── Syllabus Explorer (Subject → Unit → Topic)
│   ├── Notes
│   ├── Video Lessons
│   └── Downloaded / Offline Content
├── Practice
│   ├── Topic-wise Quizzes
│   ├── Sectional Tests
│   ├── Full Mock Tests
│   └── Previous Year Questions (PYQs)
├── Live Exams
│   ├── Upcoming Scheduled Mocks
│   ├── Live Now
│   └── Past Live Exam Results
├── Current Affairs
│   ├── Daily
│   ├── Weekly Digest
│   ├── Monthly Capsule
│   └── Current Affairs Quizzes
├── Analytics
│   ├── Test-by-Test Results
│   ├── Weak Areas
│   ├── Progress Trends
│   └── Rank / Percentile
├── Community
│   ├── Doubt Forum
│   ├── Notification/Result Discussion Threads
│   └── My Posts & Replies
├── Bookmarks
│   ├── Saved Notes
│   ├── Saved Questions
│   └── Saved Current Affairs
├── Payments
│   ├── My Subscription
│   ├── Upgrade Plan
│   ├── Invoices
│   └── Payment Methods
├── Notifications  (also surfaced via the top-bar bell)
├── Settings
│   ├── Profile  (name, photo, exam goal, language)
│   ├── Notification Preferences
│   ├── Privacy & Data (export/delete, per DPDP Act)
│   └── Help & Support
└── Logout
```

### Breadcrumb Examples
- `Dashboard > Learn > History > Ancient Tamil Nadu > Sangam Age`
- `Dashboard > Practice > Full Mock Tests > TNPSC Group 4 Mock #12 > Results`
- `Dashboard > Analytics > Weak Areas > General Science`
- `Dashboard > Current Affairs > Monthly Capsule > June 2026`
- `Dashboard > Settings > Profile`

Breadcrumbs are shown for any page **3+ levels deep** (Learn and Practice being the deepest modules); shallow modules (Dashboard, Notifications, Bookmarks) rely on the sidebar highlight alone.

---

## 5. Admin Panel — Navigation

### Purpose
Internal tool for content teams, moderators, and platform admins (PRD §11). Mirrors the student IA in "manage" form, plus B2B/coaching-center oversight.

### Navigation Shell
- **Left sidebar (role-aware — items hidden per role: Admin / Content Editor / Moderator / Support)**
- **Top bar:** environment indicator (staging/production), admin search, admin account menu

### Navigation Tree

```
Admin Panel
├── Overview Dashboard  (platform-wide KPIs — PRD §12 Success Metrics)
├── Content Management (CMS)
│   ├── Notes & Study Material
│   ├── Video Lessons
│   ├── Question Bank
│   │   ├── Add/Edit Questions
│   │   ├── Bulk Upload
│   │   └── Duplicate Detection
│   ├── Mock Tests & Test Series
│   ├── Live Exams
│   │   ├── Schedule a Live Exam
│   │   └── Monitor Active Live Exam
│   └── Current Affairs
│       ├── Publish Daily Update
│       └── Compile Weekly/Monthly Capsule
├── User Management
│   ├── Search / View Users
│   ├── Roles & Permissions
│   └── Bans & Suspensions
├── Institutional / B2B Management (coaching centers)
│   ├── Institute Accounts
│   ├── Branch & Batch Setup
│   ├── Cohort Analytics
│   └── White-Label Configuration
├── Subscriptions & Payments
│   ├── Active Subscriptions
│   ├── Refunds & Disputes
│   ├── Plan & Pricing Configuration
│   └── Revenue Analytics
├── Exam Calendar Management
│   ├── Official Notification Dates
│   ├── Hall Ticket Release Dates
│   └── Result Dates
├── Community Moderation
│   ├── Flagged Posts Queue
│   ├── Moderator Assignment
│   └── Escalated AI-Explanation Feedback (per `docs/UserJourney.md`, Screen 8)
├── Notifications Broadcast
│   ├── Compose Notification
│   └── Segment by Exam / Tier / Region
├── Analytics & Reporting
│   ├── Funnel Conversion
│   ├── Retention Cohorts
│   └── Content Engagement
└── Audit Logs
```

### Breadcrumb Examples
- `Admin > Content Management > Question Bank > Bulk Upload`
- `Admin > Institutional / B2B Management > Institute Accounts > "Dexter-style Institute" > Cohort Analytics`
- `Admin > Subscriptions & Payments > Refunds & Disputes`

---

## 6. Mobile App — Navigation

### Purpose
Android-first (per PRD §8) companion/primary surface, optimized for short sessions and offline caching (Karthik, Priya personas).

### Navigation Shell
- **Bottom tab bar (5 tabs max, per mobile IA best practice):** Home · Learn · Practice · Analytics · More
- **"More" tab** absorbs lower-frequency modules to avoid tab-bar overcrowding: Live Exams, Current Affairs, Community, Bookmarks, Payments, Settings, Notifications
- Each tab owns its own navigation **stack** (native back-button behavior), rather than the web's sidebar model

### Navigation Tree

```
Mobile App
├── [Tab] Home
│   ├── Dashboard (today's plan, streak, quick actions)
│   └── Notification Center (bell icon → stack push)
├── [Tab] Learn
│   ├── Syllabus Explorer
│   │   └── Unit
│   │       └── Topic (Notes / Video)
│   │           └── AI Explanation (modal/sheet, not a stack push)
│   └── Downloaded Content
├── [Tab] Practice
│   ├── Mode Picker (Topic Quiz / Sectional / Mock / PYQ)
│   ├── Test-Taking Screen (full-screen, tab bar hidden during a timed test)
│   └── Results → Analytics (cross-tab deep link)
├── [Tab] Analytics
│   ├── Overview
│   ├── Weak Areas
│   └── Rank/Percentile
└── [Tab] More
    ├── Live Exams
    ├── Current Affairs
    ├── Community
    ├── Bookmarks
    ├── Payments (Subscription)
    ├── Settings
    │   ├── Profile
    │   ├── Notification Preferences
    │   ├── Privacy & Data
    │   └── Help & Support
    └── Logout
```

### "Screen Path" (Mobile Equivalent of Breadcrumbs)
Mobile apps favor a **header title + native back arrow** over literal breadcrumb trails, but the underlying path is identical to the web IA for continuity:
- `Learn → History → Sangam Age` (header shows "Sangam Age"; back arrow returns to "History")
- `Practice → Full Mock Test → Group 4 Mock #12 → Results`
- `More → Live Exams → Sunday National Mock`

A **persistent exam-goal chip** (e.g., "Group 4 ▾") stays visible near the top across tabs, giving the same "which exam am I in" context the web sidebar provides.

---

## 7. Cross-Cutting Module Deep-Dives

Each module below appears in multiple surfaces (per the matrix in Section 8). This section defines each module's **own internal hierarchy**, independent of which shell it's viewed through.

### 7.1 Learning Module

```
Learning
└── Exam (context, e.g., "Group 4")
    └── Subject (e.g., Tamil, General Science, Aptitude, Current Affairs, TN History)
        └── Unit (e.g., "Physics")
            └── Topic (e.g., "Laws of Motion")
                ├── Notes (Tamil / English toggle)
                ├── Video Lesson
                ├── Bookmark action
                ├── Download PDF (tier-gated)
                └── "Practice this topic" → Practice Module (deep link)
```
**Breadcrumb:** `Learn > General Science > Physics > Laws of Motion`

### 7.2 Practice Module

```
Practice
└── Exam (context)
    ├── Topic-wise Quiz
    │   └── Subject → Topic → Question Set
    ├── Sectional Test
    │   └── Section (e.g., Aptitude only)
    ├── Full Mock Test
    │   └── Mock Test Instance (year/edition)
    │       └── Result → Analytics (module handoff)
    └── PYQ
        └── Year → Full Paper or Topic-filtered subset
```
**Breadcrumb:** `Practice > Full Mock Test > Group 2A Mock #7 > Results`

### 7.3 Analytics

```
Analytics
└── Exam (context)
    ├── Per-Test Result
    │   ├── Score & Percentile
    │   ├── Sectional Breakdown
    │   └── Time-per-Question
    ├── Weak Areas (aggregated across all tests)
    ├── Progress Trends (time-series)
    └── Rank/Percentile (cohort-relative)
```
**Breadcrumb:** `Analytics > Progress Trends > Last 30 Days`

### 7.4 Payments

```
Payments
├── My Subscription (current tier, renewal date)
├── Upgrade / Downgrade Plan
│   └── Razorpay Checkout (external handoff)
├── Invoices
│   └── Individual Invoice (download)
└── Payment Methods
    └── Saved Method Management
```
**Breadcrumb:** `Payments > Invoices > July 2026`

### 7.5 Settings

```
Settings
├── Profile  (default tab)
│   ├── Name / Photo
│   ├── Exam Goal(s)  (→ Choose Exam flow)
│   └── Language Preference
├── Notification Preferences
├── Privacy & Data
│   ├── Export My Data
│   └── Delete Account
└── Help & Support
```
**Breadcrumb:** `Settings > Privacy & Data`

### 7.6 Community

```
Community
├── Doubt Forum
│   └── Subject → Topic Thread
│       └── Individual Question Thread
│           ├── Replies (peer + moderator)
│           └── "Escalated from AI Explanation" tag (per `docs/UserJourney.md`, Screen 8)
├── Notification/Result Discussion
│   └── Per-Notification Thread (e.g., "Group 4 2026 Answer Key Discussion")
└── My Posts & Replies
```
**Breadcrumb:** `Community > Doubt Forum > General Science > "Why is X the answer?"`

### 7.7 Notifications

```
Notifications
├── Study Reminders
├── Mock/Live Exam Schedule Alerts
├── Official TNPSC Notification Alerts
├── Subscription/Billing Alerts
└── Community Activity (replies to my posts)
```
Notifications is a **flat list module** (no deep hierarchy) surfaced identically via the bell icon on web and the Home tab on mobile — intentionally shallow since it is a time-sensitive, glanceable module, not a content-browsing one.

### 7.8 Bookmarks

```
Bookmarks
├── Saved Notes  (from Learning)
├── Saved Questions  (from Practice)
└── Saved Current Affairs  (from Current Affairs)
```
Bookmarks is a **cross-module index**, not a content source of its own — every item here deep-links back into its originating module (Learn, Practice, or Current Affairs) rather than duplicating content.

### 7.9 Current Affairs

```
Current Affairs
├── Daily Update
├── Weekly Digest
├── Monthly Capsule
│   └── Theme-tagged sections (Ethics/Governance-relevant, for Mains — per the Divya persona)
└── Current Affairs Quiz
    └── Auto-generated from the last N days' content
```
**Breadcrumb:** `Current Affairs > Monthly Capsule > June 2026 > Governance & Ethics`

### 7.10 Live Exams

```
Live Exams
├── Upcoming Scheduled Mocks
│   └── Individual Scheduled Mock (registration, countdown)
├── Live Now
│   └── Active Timed Session (full-screen, mirrors Practice's mock-test UI)
└── Past Live Exam Results
    └── Individual Past Live Exam → Analytics (module handoff)
```
Live Exams is deliberately a **distinct module from Practice**, even though the test-taking screen is shared — the whitespace identified in `docs/CompetitorAnalysis.md` (no competitor runs well-executed, cohort-wide scheduled live test events) depends on Live Exams having its own identity (scheduling, cohort framing, "X,XXX aspirants taking this now") rather than being buried as just another mock inside Practice.
**Breadcrumb:** `Live Exams > Upcoming > "Sunday National Mock — Group 2"`

---

## 8. Global Navigation Matrix

| Module | Website | Student Dashboard | Admin Panel | Mobile App | Min. Access Tier |
|---|---|---|---|---|---|
| **Learning** | Preview only | Full | Manage (CMS) | Full (+ offline cache) | Free (some content gated to Plus) |
| **Practice** | — | Full | Manage (Question Bank) | Full | Free (limited), Plus (unlimited) |
| **Live Exams** | Schedule preview | Full | Schedule & Monitor | Full | Plus |
| **Current Affairs** | Public teaser | Full | Publish | Full | Free (daily), Plus (monthly capsule) |
| **Analytics** | — | Full | Platform-wide reporting | Full (condensed) | Free (basic), Pro (deep/rank) |
| **Payments** | Pricing page | Full | Subscriptions dashboard | Full | All (view), transacting requires auth |
| **Settings** | — | Full | Admin account settings | Full | All |
| **Community** | — | Full | Moderation queue | Full | Free (view), Plus (post) |
| **Notifications** | — | Full | Broadcast composer | Full | All |
| **Bookmarks** | — | Full | — | Full | All |

---

## 9. Illustrative Route Map

Not implementation code — an IA-level path reference to keep naming consistent once development begins.

| Path Pattern | Screen |
|---|---|
| `/` | Website Home |
| `/exams/:examSlug` | Website exam landing page |
| `/pricing` | Website Pricing |
| `/for-coaching-centers` | Website B2B landing |
| `/app/dashboard` | Student Dashboard home |
| `/app/learn/:subject/:unit/:topic` | Learn — Topic view |
| `/app/practice/:mode` | Practice — Mode picker/results (`mode` = quiz \| sectional \| mock \| pyq) |
| `/app/live-exams/:examInstanceId` | Live Exams — instance detail |
| `/app/current-affairs/:period` | Current Affairs (`period` = daily \| weekly \| monthly) |
| `/app/analytics/:view` | Analytics (`view` = results \| weak-areas \| trends \| rank) |
| `/app/payments/subscription` | Payments — My Subscription |
| `/app/settings/:section` | Settings (`section` = profile \| notifications \| privacy \| help) |
| `/app/community/:threadId` | Community — thread detail |
| `/admin/content/questions` | Admin — Question Bank |
| `/admin/institutions/:instituteId` | Admin — Institute detail |
| `/admin/subscriptions` | Admin — Subscriptions dashboard |

---

## 10. Recommendations

1. **Enforce the Settings/Profile hierarchy consistently.** `docs/UserJourney.md` names the destination "Profile"; this document nests it under "Settings." Standardize on **Settings → Profile (default tab)** everywhere so engineering, design, and content don't diverge on naming.
2. **Keep Live Exams structurally separate from Practice, even though they share a test-taking UI.** This is a deliberate IA choice, not a duplication — collapsing them would erase the cohort/scheduled-event framing that is a genuine competitive whitespace per `docs/CompetitorAnalysis.md`.
3. **Cap the mobile bottom tab bar at 5 items and route everything else through "More."** Mobile IA best practice degrades quickly past 5 tabs; Current Affairs, Community, Bookmarks, Payments, and Settings are all lower-frequency than Home/Learn/Practice/Analytics for the core personas.
4. **Make the exam-goal switcher a persistent, first-class navigation element on every surface** (top bar on web, tab-bar-adjacent chip on mobile) — every module's content is meaningless without knowing which exam is currently in context, and multiple personas (Priya considering Group 4 + VAO, Divya focused solely on Group 1) depend on this being always visible, never buried in a settings page.
5. **Mirror the student and admin IAs deliberately.** Every content module a student sees (Learn, Practice, Current Affairs, Live Exams) has a matching "manage" node in the Admin Panel under the same name — this keeps content-team mental models aligned with what students actually experience.
6. **Treat Bookmarks as a pure index, never a content fork.** Bookmarked items must deep-link to their live, up-to-date source in Learn/Practice/Current Affairs rather than storing a static copy, to avoid the "stale duplicate content" problem.

---

*End of Document.*
