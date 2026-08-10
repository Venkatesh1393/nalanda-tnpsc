# Nalanda TNPSC — Product Requirement Document (PRD)

| | |
|---|---|
| **Document Owner** | Product Management |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Product** | Nalanda TNPSC — AI-powered TNPSC Exam Preparation Platform |

---

## 1. Vision

Tamil Nadu produces one of the largest pools of competitive government exam aspirants in India, yet TNPSC preparation today is fragmented across WhatsApp groups, YouTube channels, printed guides, and coaching centers concentrated in a handful of cities. Aspirants in tier-2/tier-3 towns and rural areas are structurally disadvantaged — not by ability, but by access to structured guidance, updated content, and honest feedback on their preparation.

**Nalanda TNPSC's vision is to become the single most trusted, AI-guided preparation companion for every TNPSC aspirant in Tamil Nadu — from a first-time Group 4 candidate in a village to a repeat Group 1 Mains candidate — by combining structured content, adaptive practice, and personalized AI mentorship in both Tamil and English, accessible on any device, at a price every aspirant can afford.**

The name "Nalanda" invokes the ancient seat of learning — the platform's promise is that rigorous, high-quality preparation should not be gated by geography or income.

---

## 2. Business Goals

### Short-term (0–6 months)
- Launch MVP covering Group 4, VAO, and Group 2/2A prelims (highest-volume, lowest-complexity exams) to validate product-market fit.
- Acquire first 50,000 registered users through organic (SEO, YouTube, Instagram) and community-led growth.
- Establish a free-to-premium funnel with at least one paid tier live at launch.
- Achieve a Day-7 retention rate of ≥25% for active test-takers.

### Mid-term (6–18 months)
- Expand coverage to Group 1 (Prelims + Mains + Interview guidance), Police, Forest, and TRB.
- Cross 500,000 registered users and 50,000 paying subscribers.
- Achieve positive unit economics (CAC recovered within 3 months of subscription revenue).
- Build a recognizable brand associated with "AI-based smart preparation" in the TNPSC ecosystem.

### Long-term (18–36 months)
- Become the #1 app (by MAU and app store ranking) for TNPSC preparation in Tamil Nadu.
- Diversify into adjacent state PSC exams (Kerala PSC, Karnataka PSC) and central exams (SSC, Banking) using the same platform architecture.
- Build a B2B vertical: license the platform/content to coaching institutes and government libraries (Illam Thedi Kalvi-style public access points).
- Establish a sustainable revenue mix: subscriptions, institutional licensing, and affiliate/publisher partnerships (no low-trust ad-driven model).

---

## 3. Target Users

| Segment | Description | Primary Exams |
|---|---|---|
| **First-time aspirants** | College students / recent graduates (21–26) preparing for their first government exam | Group 4, VAO, Group 2A |
| **Working aspirants** | Employed individuals (in private sector or contract govt roles) studying part-time, evenings/weekends | Group 2, Group 1 |
| **Serious/repeat aspirants** | Multi-attempt candidates, often full-time preparation, higher intent and willingness to pay | Group 1, Group 2, TRB |
| **Uniformed services aspirants** | Physically-oriented exams requiring both written and physical test prep | Police, Forest |
| **Teaching aspirants** | B.Ed/TET-qualified candidates preparing for recruitment | TRB |
| **Rural/low-bandwidth users** | Users on 2G/3G networks, budget Android devices, Tamil-first readers | All categories, cutting across segments |

---

## 4. User Personas

### Persona 1 — "Kalaivani", the First-Generation Aspirant
- **Age:** 22, B.Sc. graduate from a government arts college in Villupuram district.
- **Context:** First in her family to attempt a government exam. Preparing for Group 4 / VAO. Uses a shared family smartphone with a budget data plan. Comfortable in Tamil, moderately confident in English.
- **Pain points:** Cannot afford coaching institute fees (₹15,000–₹40,000). Confused by conflicting free YouTube content. No way to know if her preparation is "on track."
- **Needs:** Free/low-cost structured syllabus coverage, Tamil-medium explanations, mock tests with rank/percentile feedback, offline-friendly content.

### Persona 2 — "Arun", the Working Professional
- **Age:** 27, works as a private-sector accountant in Coimbatore, preparing for Group 2/2A on the side.
- **Context:** Has 1–2 hours per day, mostly at night. Owns a mid-range smartphone, stable Wi-Fi at home.
- **Pain points:** No time for long lectures; needs high-density, exam-focused content. Struggles to track weak areas across multiple part-time study sessions.
- **Needs:** Bite-sized daily targets, adaptive practice that prioritizes weak topics, push reminders, progress dashboards.

### Persona 3 — "Meena", the Repeat Group 1 Aspirant
- **Age:** 25, full-time aspirant, third attempt at Group 1, previously cleared Prelims but not Mains.
- **Context:** Studies 8+ hours a day. Has already consumed most free content and is looking for an edge — mains answer writing practice, interview prep, current affairs depth.
- **Pain points:** Mains answer evaluation is subjective and hard to get feedback on without a mentor/coaching institute. Current affairs volume is overwhelming.
- **Needs:** AI-assisted mains answer evaluation, curated/summarized monthly current affairs, mentor-style personalized study plans, mock interview practice.

### Persona 4 — "Suresh", the Uniformed Services Candidate
- **Age:** 24, preparing for TN Police Constable/SI exam alongside physical fitness training.
- **Context:** Splits time between physical training and written exam prep. Needs efficient, high-yield study material.
- **Pain points:** Written exam content is often bundled with irrelevant Group 4-style material; physical exam eligibility/criteria info is scattered.
- **Needs:** Exam-specific question banks, eligibility/physical standards reference info, quick-revision formats (flashcards, one-liners).

---

## 5. User Journey

| Stage | User Action | Platform Response | Key Emotion to Design For |
|---|---|---|---|
| **1. Awareness** | Discovers Nalanda via YouTube, Instagram, referral, or search ("TNPSC Group 4 syllabus 2026") | SEO-optimized landing pages, free syllabus/notification content, clear value proposition | Curiosity, skepticism |
| **2. Onboarding** | Signs up (Google login / Email OTP), selects target exam(s) and target exam date | Guided exam-selection flow, personalized dashboard generated instantly | Trust, "this understands my goal" |
| **3. Diagnostic** | Takes a short diagnostic test or skips to browse content | AI generates an initial skill map and suggested study plan | Motivation, "I know where I stand" |
| **4. Structured Study** | Follows daily/weekly study plan, reads notes, watches short videos | Progress tracking, streaks, reminders, syllabus completion % | Momentum, accomplishment |
| **5. Practice** | Attempts topic-wise quizzes and previous year questions | Instant scoring, explanations, difficulty adapts to performance | Confidence building |
| **6. Mock Testing** | Takes full-length mock tests under timed, exam-simulated conditions | All-India/state rank, percentile, sectional analysis, weak-topic report | Reality check, urgency |
| **7. Revision** | Reviews bookmarked questions, flashcards, AI-summarized current affairs | Spaced-repetition revision queue | Relief, reinforcement |
| **8. Pre-Exam** | Final week before actual TNPSC exam | Exam-day checklist, hall ticket reminders, last-mile revision capsule | Calm, readiness |
| **9. Post-Exam** | Exam completed; awaits result | Answer-key discussion, expected cutoff analysis, community discussion | Closure, anticipation |
| **10. Retention/Next Cycle** | Clears exam and exits, or continues preparing for next attempt/next exam | Success story capture (for marketing, with consent) or re-engagement into next-stage prep (e.g., Group 1 Mains after clearing Prelims) | Loyalty, advocacy |

---

## 6. Competitor Analysis

| Platform | Category | Strengths | Weaknesses / Gaps | Nalanda's Differentiation |
|---|---|---|---|---|
| **Winmeen** | TNPSC-focused website/app | Deep, long-standing free Tamil content library; strong SEO presence | Dated UI/UX, limited personalization, no real adaptive testing, weak analytics | Modern UI, AI-personalized plans, adaptive difficulty |
| **Testbook** | Pan-India multi-exam platform | Large question bank, slick mock test engine, strong brand | TNPSC content is a small subset of a generic multi-exam catalog; not Tamil-first; generic explanations | TNPSC-only depth, Tamil-medium-first design, exam-specific personas |
| **Adda247 / Adda247 Tamil** | Pan-India multi-exam platform | Strong marketing reach, live classes, PDF content | Similar genericization issue; mains answer-writing feedback is manual/limited | AI-assisted mains evaluation, community trust at regional level |
| **GKToday / Local current affairs sites** | Current affairs content | Reliable daily current affairs | No test engine, no personalization, static content consumption only | AI-summarized, TNPSC-relevance-tagged current affairs integrated into practice |
| **Regional coaching institutes (Shankar IAS, Race, Lawrence, Sura Guides, etc.)** | Offline/hybrid coaching + publications | Deep subject-matter trust, mentor relationships, established brand in Tamil Nadu | High cost, geographically limited, low tech investment, no adaptive analytics | Democratized access at a fraction of the cost, statewide reach, always-on AI mentor |
| **WhatsApp/Telegram study groups** | Informal peer content sharing | Free, community-driven, fast circulation of notes | Unverified/incorrect content, no structure, high noise, no tracking | Verified content, structured curriculum, personal progress tracking |

**Key whitespace Nalanda can own:** No existing player combines (a) TNPSC-only specialization, (b) true Tamil-first bilingual UX, (c) AI-personalized adaptive learning and mains evaluation, and (d) affordable pricing accessible to rural aspirants — at production quality.

---

## 7. Functional Requirements

### 7.1 Authentication & Onboarding
- Sign up/login via Google OAuth and Email OTP.
- Exam-goal selection (multi-select: Group 1, 2, 2A, 4, VAO, Police, Forest, TRB).
- Target exam date and daily study-hour availability input, used to seed the study plan.
- Language preference (Tamil / English / bilingual mixed view).

### 7.2 Content & Study Material
- Structured syllabus explorer per exam category, broken into subjects → units → topics.
- Notes in text form (Tamil and English), organized by topic.
- Short-form video lessons per topic.
- Downloadable PDFs for offline study (premium-gated where applicable).
- Daily/monthly current affairs module with TNPSC-relevance tagging.
- Previous Year Question (PYQ) papers, organized by exam and year, with solutions.

### 7.3 Practice & Testing Engine
- Topic-wise quizzes with instant scoring and explanations.
- Full-length mock tests simulating actual TNPSC exam pattern, timing, and negative marking rules.
- Sectional tests (e.g., only Aptitude, only Tamil/English language section).
- Adaptive practice mode: question difficulty adjusts based on live performance.
- Previous year paper solving mode with year-wise and topic-wise filters.
- Bookmarking of questions/notes for later revision.
- Post-test analytics: score, percentile/rank (within Nalanda's user base), time-per-question, sectional strengths/weaknesses.

### 7.4 Mains & Descriptive Preparation (Group 1 / TRB)
- Answer-writing practice module with a text/handwriting-upload submission flow.
- Structured evaluation rubric (content, structure, relevance, language).
- Model answers library.

### 7.5 Personalization & Progress
- AI-generated personalized study plan based on target exam, date, and available study hours.
- Daily task list / streak tracker.
- Syllabus completion dashboard.
- Weak-area identification and targeted revision suggestions.
- Spaced-repetition based revision queue for bookmarked/flagged content.

### 7.6 Community & Support
- Doubt-resolution forum (topic-tagged Q&A among users, moderated).
- Discussion threads around each official notification and exam result.
- Notification center for exam dates, hall tickets, results, and platform updates.

### 7.7 Notifications & Reminders
- Push notifications for daily study reminders, mock test schedules, and official TNPSC notification alerts.
- Email/SMS reminders for subscription renewal and exam-date countdowns.

### 7.8 Search & Navigation
- Global search across notes, questions, and current affairs.
- Filter/sort by exam category, subject, difficulty, and year.

### 7.9 Payments & Subscription
- Razorpay-based checkout for premium plans.
- Plan management (upgrade, renew, cancel) from user account.
- Invoice/receipt generation.

### 7.10 Multi-Platform Access
- Responsive web application (desktop and mobile browser).
- Native/cross-platform mobile app (per `mobile/` scope) with offline-capable content caching.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Pages/screens must load within 2 seconds on 4G and remain usable on 3G; mock test engine must handle timed submissions with no data loss on network drop. |
| **Scalability** | Backend must support concurrent mock-test-taking spikes (e.g., thousands of users starting a scheduled mock test at the same time) without degraded response times. |
| **Availability** | Target 99.5%+ uptime; graceful degradation (read-only content access) during backend maintenance windows. |
| **Security** | All traffic over HTTPS; Firebase Authentication for identity; role-based access control for admin functions; secure handling of payment data (no card data stored directly — delegated to Razorpay). |
| **Data Privacy** | Compliance with India's Digital Personal Data Protection (DPDP) Act — explicit consent for data collection, clear privacy policy, user data export/delete rights. |
| **Accessibility** | WCAG-conscious design (readable font sizes, color contrast, screen-reader-friendly where feasible) given a portion of users may have visual/reading difficulty. |
| **Localization** | True bilingual support (Tamil/English) at the UI and content level, not just translated labels — including Tamil-medium explanations for STEM/aptitude topics. |
| **Low-Bandwidth Optimization** | Compressed media, lazy loading, offline caching for notes/PDFs, lightweight mobile app footprint for budget Android devices. |
| **Device Support** | Modern evergreen browsers; Android-first mobile support given target demographic device usage patterns. |
| **Auditability** | Admin actions (content edits, user management, refunds) logged for accountability. |
| **Reliability of Test Engine** | Auto-save of in-progress test answers; recovery from accidental app close/network drop without losing test state. |

---

## 9. Premium Features

| Tier | Target User | Included |
|---|---|---|
| **Free** | All users | Syllabus explorer, limited notes, limited daily quizzes, basic current affairs, community forum access, ads (non-intrusive) |
| **Plus (entry paid tier)** | Persona 1 (Kalaivani), Persona 2 (Arun) | Full notes library, unlimited topic-wise quizzes, full mock test series (exam-specific), sectional tests, ad-free experience, downloadable PDFs |
| **Pro (advanced tier)** | Persona 3 (Meena), Persona 4 (Suresh) | Everything in Plus + AI personalized study plan, AI mains-answer evaluation, current affairs deep-dive/monthly capsules, priority doubt resolution, performance prediction & rank estimation, mock interview module (for Group 1/TRB) |
| **Institutional/B2B** | Coaching centers, libraries, Illam Thedi Kalvi-style centers | Bulk licensing, cohort-level analytics for mentors/instructors, white-labeled access codes |

Additional premium add-ons (a-la-carte): printed material discounts via publisher partnerships, live doubt-clearing sessions, one-on-one mentor calls.

---

## 10. AI Features

1. **Personalized Study Plan Generator** — Given target exam, exam date, and available daily hours, generates a day-by-day plan that adapts as the user falls behind or ahead of schedule.
2. **Adaptive Practice Engine** — Adjusts question difficulty and topic recommendation in real time based on a user's live accuracy and speed.
3. **Weak-Area Detection** — Analyzes test/quiz history to surface the specific topics/sub-topics dragging down performance, not just subject-level scores.
4. **AI Doubt-Resolution Chatbot** — Tamil/English conversational assistant that answers syllabus-related questions instantly, escalating to human moderators when confidence is low.
5. **AI Mains Answer Evaluation** — For Group 1/TRB descriptive answers: evaluates structure, relevance, and content coverage against a model rubric, giving actionable feedback (not just a score).
6. **Current Affairs Summarizer & Relevance Tagger** — Ingests daily news and produces TNPSC-exam-relevant summaries, tagged by likely subject/topic linkage.
7. **Performance Prediction / Rank Estimator** — Uses mock test performance trends (relative to the platform's user base) to estimate likely percentile/rank ahead of the actual exam.
8. **Voice-Based Q&A (Tamil)** — Allows users to ask questions verbally in Tamil, useful for users less comfortable typing in English.
9. **Mock Test Proctoring Signals (lightweight)** — Basic integrity signals (tab-switch detection, time-per-question anomalies) for high-stakes mock tests, to build discipline for the real exam environment — explicitly not for punitive action, only self-awareness feedback.
10. **Smart Revision Scheduler** — Spaced-repetition algorithm that resurfaces previously bookmarked/incorrect questions at optimal intervals.

---

## 11. Admin Features

- **Content Management System (CMS)** — Create/edit/publish notes, videos, quizzes, mock tests, and current affairs entries without code deployment.
- **Question Bank Management** — Bulk upload, tagging (exam, subject, topic, difficulty, year), versioning, and duplicate detection.
- **User Management** — View/search users, manage roles (admin/moderator/content-editor/user), handle support escalations, manage bans/suspensions for abuse.
- **Subscription & Payments Dashboard** — View active subscriptions, handle refunds/disputes, configure pricing/plans, view revenue analytics.
- **Exam Calendar Management** — Maintain official TNPSC notification dates, hall ticket release dates, and result dates that drive user-facing reminders.
- **Analytics Dashboard** — Platform-wide usage metrics, funnel conversion (free → paid), content engagement, test attempt volumes, retention cohorts.
- **Notification Broadcast Tool** — Send targeted push/email/SMS notifications by exam category, subscription tier, or user segment.
- **Community Moderation** — Review/remove flagged forum posts, manage moderator permissions, handle reported content.
- **Audit Logs** — Track all admin-level actions for accountability and rollback capability.

---

## 12. Success Metrics

| Category | Metric | Target Signal |
|---|---|---|
| **Acquisition** | New registered users/month | Steady month-over-month growth post-launch |
| **Activation** | % of new users completing onboarding + first diagnostic test | ≥60% |
| **Engagement** | DAU/MAU ratio | ≥20% (indicates habitual daily use, important for exam prep) |
| **Retention** | D1 / D7 / D30 retention | D7 ≥25%, D30 ≥15% at MVP stage, improving over time |
| **Monetization** | Free-to-paid conversion rate | ≥3–5% within first 90 days of a user's signup |
| **Monetization** | ARPU (Average Revenue Per Paying User) | Tracked monthly, benchmarked against subscription tier mix |
| **Product Quality** | Mock test completion rate (started vs. finished) | ≥80% |
| **Product Quality** | App store rating | ≥4.3 average |
| **Trust/NPS** | Net Promoter Score | ≥40 among active paid users |
| **Outcome (leading indicator of mission success)** | Self-reported exam clearance rate among active Pro users (survey-based) | Track and publish year-over-year improvement |
| **Retention health** | Monthly churn rate (paid subscribers) | <7% monthly |

---

## 13. Future Roadmap

### Phase 1 — MVP (0–6 months)
- Group 4, VAO, Group 2/2A prelims coverage.
- Core test engine, notes, current affairs, basic AI study plan.
- Web app + Firebase auth + Razorpay integration.

### Phase 2 — Depth & Differentiation (6–12 months)
- Group 1 (Prelims, Mains, Interview) and TRB coverage.
- AI mains-answer evaluation and mock interview module.
- Native mobile app (Android-first) with offline caching.
- Community/doubt-resolution forum.

### Phase 3 — Scale & Stickiness (12–24 months)
- Police and Forest exam coverage, including physical-standards reference content.
- Voice-based Tamil Q&A and expanded AI mentor capabilities.
- Institutional/B2B licensing for coaching centers and public study centers.
- Performance prediction / rank estimator at scale (requires sufficient user base for statistical confidence).

### Phase 4 — Expansion (24–36 months)
- Extend platform architecture to adjacent state PSCs (Kerala PSC, Karnataka PSC, Andhra/Telangana) and central exams (SSC, Banking, Railways) as a multi-state product line.
- Explore regional language expansion beyond Tamil/English for cross-state offerings.
- Publisher/content partnerships for premium printed material bundling.
- Alumni/success-story network to reinforce trust and organic referral growth.

---

*End of Document.*
