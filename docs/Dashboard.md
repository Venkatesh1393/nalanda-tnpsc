# Nalanda TNPSC — Student Dashboard

| | |
|---|---|
| **Document Owner** | UX Design / Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-31 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UserJourney.md` Screen 5 (the baseline single-screen spec this document deep-dives), `docs/InformationArchitecture.md` §4 (the Student Dashboard shell), `docs/Database.md` §4.1/§4.3/§4.4/§4.7 (Profiles, StudyPlans, Analytics, Badges/Achievements), `docs/API.md` §2 (Dashboard APIs), `docs/Smart_Practice.md` §13-§15 (XP/Coins/Achievements), `docs/Analytics.md` (Weak Areas, Rank Prediction, AI Recommendation), `docs/Learn_Module.md` (Continue Learning handoff), and `docs/UI_Design_System.md` §35-§39 as the visual/motion authority every component below builds on |

### Scope Note

`docs/UserJourney.md` Screen 5 gave a single-screen summary of the Dashboard: today's tasks, streak, syllabus completion, module navigation cards. This document is the **complete, widget-by-widget specification** of the authenticated home screen a student actually lands on every day — nineteen distinct widgets, each with its own data source, layout, interaction, and loading/empty/error behavior, composed into one coherent, glanceable page rather than nineteen independent features bolted together.

**Relationship to the Dashboard *shell*:** this document specifies the **content** of the Dashboard — everything that scrolls inside `<main>`. The persistent chrome around it (sidebar, top bar, exam-goal switcher, search) is already fully specified in `docs/InformationArchitecture.md` §4 and `docs/Navigation.md` §2 and is not re-derived here; `layouts/dashboard-layout.tsx` (that chrome) is a separate, not-yet-built piece of work (`docs/MASTER_ROADMAP.md` Phase 7) — see §20 for how this document's content is meant to slot into it once it exists.

---

## Page Flow (Top to Bottom)

```
Welcome Banner
   ↓
Daily Study Goal · Today's Tasks   (side-by-side on desktop, stacked on mobile)
   ↓
Stats Row — Study Streak · XP Points · Coins · Rank   (four tiles, one row)
   ↓
Weekly Progress
   ↓
Continue Learning
   ↓
Recommended Topics · Weak Subjects   (side-by-side on desktop)
   ↓
Current Affairs Summary · Upcoming Exams   (side-by-side on desktop)
   ↓
Quick Practice
   ↓
AI Mentor Card
   ↓
Notifications · Recent Activity   (side-by-side on desktop)
   ↓
Achievements
   ↓
Premium Banner
```

**Ordering rationale:** greeting and the single most-actionable thing (today's goal/tasks) come first; effort/standing (streak, XP, coins, rank) follows as a quiet status check, not a headline; content recommendations (Continue Learning → Recommended → Weak Subjects) come next since they're the meat of daily use; current affairs and exam awareness follow; Quick Practice and the AI Mentor are always-available accelerators; Notifications/Activity/Achievements are reflective, lower-urgency reading; the Premium Banner closes the page — a confident, low-emphasis pause-point upsell, never the first thing a student sees (`docs/UI_Design_System.md` §36).

**Data pipeline note:** every widget below reads either a single combined `GET /dashboard/summary` response (`docs/API.md` §2, extended here to include `streak`, `xp`, `coins`, `rank`, and `subscriptionTier` alongside its documented fields) or its own dedicated existing endpoint (`GET /current-affairs`, `GET /leaderboard/me`, etc.) — never a widget-specific bespoke shape invented in isolation. No widget computes anything live from raw `Question Attempts`; per `docs/Database.md` §8, that's what the `Analytics` materialization job is for.

---

## 1. Welcome Banner

**Purpose:** Establish "this is your space, and it knows where you are" in the first glance — the emotional opener before any data or action.

**Data source:** `Profiles.name` (`docs/Database.md` §4.1), the active entry from `Profiles.examGoals`.

**Layout & UI:** A full-width, low-chrome header band (no card border — it's the page's own header, not a widget among widgets): a time-of-day-aware greeting ("Good morning, Kalaivani"), the active exam-goal chip (`docs/UI_Design_System.md` §37's exam-goal switcher chip, e.g. "Group 4 ▾"), and a single primary **Continue Studying** button deep-linking to the next recommended Learn topic (`docs/UserJourney.md` Screen 5) — the same destination Continue Learning (§9) links to, so a student never has to choose between two competing "keep going" buttons that mean different things.

**Interactions:** Tapping the exam-goal chip opens the quick-switch menu for multi-exam users (`docs/InformationArchitecture.md` recommendation #4) — not re-specified here, already owned by the shell.

**Animations:** Fades and rises in first (`motion-base`, docs/UI_Design_System.md §19), leading the page's staggered reveal — everything below follows in sequence, never all at once.

**Loading/Empty/Error:** Name/goal are part of the shared summary fetch (§21) — while pending, the greeting text and chip render as skeleton bars; a brand-new user with no exam goal set yet shows a fallback prompt ("Set your target exam") routing to Onboarding (`docs/Onboarding.md`) rather than a broken empty chip.

---

## 2. Daily Study Goal

**Purpose:** Answer "how much do I need to do today, and how close am I" — the goal-setting counterpart to Today's Tasks' checklist.

**Data source:** `StudyPlans.dailyHours` (target) and today's summed study duration from `Question Attempts`/Learn engagement (progress) — both surfaced through `GET /dashboard/summary`.

**Layout & UI:** A compact card pairing a slim horizontal progress bar (`docs/UI_Design_System.md` §37's syllabus-completion-bar treatment, reused here for a daily rather than syllabus-wide percentage) with two tabular-numeral figures — "32 of 60 min today" — never a bare percentage alone, since minutes are the more concrete, motivating unit for a daily goal.

**Interactions:** None beyond a "Adjust goal" text link routing to the Study Hours step of Settings/Onboarding (`docs/Onboarding.md` Screen 4) — this widget only reports progress against a goal set elsewhere, it doesn't let the goal be edited inline.

**Animations:** The progress bar fills with a smooth width transition (`motion-base`) when data first resolves, not an instant snap — the same "earned, gradual reveal" treatment as Analytics' score ring.

**Loading/Empty/Error:** Skeleton bar + skeleton figures while pending. A user with no study plan yet (skipped Onboarding's Study Hours step) sees "Set a daily goal to track your progress here" instead of a 0/0 that reads as broken.

---

## 3. Today's Tasks

**Purpose:** The single most actionable widget on the page — a concrete, checkable list of what the AI Study Plan (`docs/PRD.md` §10 Feature 1) recommends for today.

**Data source:** `GET /dashboard/today-tasks` (`docs/API.md` §2) → `StudyPlans.dailyTasks` for today's date (`docs/Database.md` §4.4).

**Layout & UI:** A card listing 3-6 tasks, each a row with a type icon (video/notes/quiz/revision), a title, and a checkbox — completing a task calls `POST /dashboard/tasks/{taskId}/complete` (`docs/API.md` §2) and the row animates to a checked, slightly muted "done" state rather than disappearing (so a student can see what they *did* accomplish today, not just what's left).

**Interactions:** Tapping a task's title (not just the checkbox) deep-links into that task's actual content (Learn topic, Practice session) — the checklist and the content are one continuous action, per `docs/Learn_Module.md`'s "one continuous loop" principle.

**Animations:** Checking a task uses a quick `motion-fast` checkmark-draw + row-dim — deliberately restrained, not celebratory (per `docs/UI_Design_System.md` §32, celebration is reserved for genuine milestones, and finishing one small task isn't one). Completing the *entire* day's list, however, may show a small "All done for today" confirmation line — still calm, not confetti.

**Loading/Empty/Error:** Skeleton rows while pending. All tasks done → a positive empty state ("Nothing left for today — great pace"), never a bare empty list. No study plan at all (Onboarding skipped or its AI generation failed and fell back to a general plan, `docs/Onboarding.md` §6) → a prompt to generate one, not a silent gap.

---

## 4. Study Streak

**Purpose:** A quiet, felt sense of consistency over time — the first of four compact stat tiles in one row (§4-§7 share one layout treatment, specified once here).

**Data source:** `Profiles.streak` (`current`, `longest`) — `docs/Database.md` §4.1.

**Shared tile layout (applies to §4-§7):** Four equal-width `StatCard`-pattern tiles (label, large tabular-numeral value, small icon) in a single responsive row — 4-across on desktop, 2×2 on tablet, a horizontally-scrollable or stacked single column on mobile. No tile uses a chart; per `docs/UI_Design_System.md` §37, these are deliberately plain numbers, not visualizations, keeping the row scannable in under a second.

**This tile specifically:** value is the current streak ("12 days"), icon is the restrained streak-flame glyph (`docs/UI_Design_System.md` §23/§37 — non-cartoonish, no mascot). A secondary caption shows the longest streak for context ("Best: 21").

**Animations:** The streak number counts up once on first load (shared count-up treatment, `hooks/use-count-up.ts`'s existing pattern) — but the flame glyph itself never pulses or animates on every visit; `motion-celebratory` is reserved specifically for the moment a **new** milestone streak is reached, not shown on ordinary return visits.

**Loading/Empty/Error:** Skeleton tile. A user on day 1 shows "1 day" plainly — never "0" or a broken dash, since day 1 of activity is itself a real, current streak.

---

## 5. XP Points

**Data source:** cumulative XP total, per `docs/Smart_Practice.md` §13 — "a cumulative, transparent measure of effort actually invested."

**This tile:** value is the running total ("4,230 XP"), a small trend caption shows this week's gain ("+180 this week"). Per §13, XP only ever increases — the trend caption is the only place a delta appears, and it is never negative.

**Everything else (layout, animation, loading):** identical to §4's shared tile treatment.

---

## 6. Coins

**Data source:** spendable coin balance, per `docs/Smart_Practice.md` §14 — "a lightweight, functional currency... a balance that goes up and down."

**This tile:** value is the current balance ("340"), icon distinct from XP's (a coin/circle glyph, never reusing the Sangam Gold premium accent — coins are a gameplay currency, not a premium/achievement signal, so they stay in the neutral icon-tint used by the other three tiles, per the strict one-meaning-per-accent-color rule in `docs/UI_Design_System.md` §7).

**Everything else:** identical to §4's shared tile treatment. No trend caption (a rising-and-falling balance doesn't have a single meaningful "this week" delta the way XP's monotonic total does).

---

## 7. Rank

**Data source:** `GET /leaderboard/me` (`docs/API.md` §9) → `Analytics.percentile`/`rankEstimate` (`docs/Database.md` §4.4), scoped to the active exam goal.

**This tile:** value is the percentile ("Top 18%"), caption shows the plain rank estimate among the cohort ("#412 of 2,280"). Per `docs/Analytics.md` §11 and `docs/Database.md` §9/§10's small-cohort honesty rule, a low-volume exam category (e.g. Forest) shows a visible "based on a smaller group of aspirants" caption instead of the normal rank caption, and a genuinely new user with too little data shows "Take a few mock tests to see your rank" rather than a fabricated number.

**Everything else:** identical to §4's shared tile treatment.

---

## 8. Weekly Progress

**Purpose:** The effort-over-time counterpart to the Daily Study Goal's single-day snapshot — "have I actually been consistent this week."

**Data source:** daily summed study minutes for the last 7 days, from `Question Attempts`/Learn engagement (`docs/Analytics.md` §12's Study Time data source, scoped to a week instead of that view's full 1-4 week range).

**Layout & UI:** A card containing a smooth trend chart (`components/charts/trend-line-chart.tsx` — gradient-fill area, minimal gridlines, custom tooltip, per `docs/UI_Design_System.md` §17) plotting minutes studied per day, Mon-Sun. A one-line takeaway caption sits above the chart ("You studied 4 of the last 7 days") — the chart is never left to speak entirely for itself, per `docs/Analytics.md` §5's reading-guidance precedent.

**Interactions:** A "View full Analytics" link routes to the Analytics module's Study Time/Consistency views (`docs/Analytics.md` §12-§13) for a student who wants the longer, multi-week picture.

**Animations:** The chart draws in on first resolve (Recharts' default line-draw, no bespoke animation needed beyond what the component already provides).

**Loading/Empty/Error:** Skeleton chart block. A brand-new user with no activity yet shows an encouraging empty state ("Start today and this fills in as you go") instead of a flat zero-line chart that reads as broken.

---

## 9. Continue Learning

**Purpose:** The single highest-intent shortcut on the page — resume exactly where the student left off, zero navigation required.

**Data source:** the most recently in-progress Subtopic (`docs/Database.md` §4.2) for the active exam goal — the same underlying concept the Welcome Banner's "Continue Studying" button (§1) points at, surfaced here with fuller context.

**Layout & UI:** A single, prominent card (`components/subject-card.tsx`-style: icon, subject/topic/subtopic breadcrumb text, a progress bar for that subtopic) with a primary "Resume" button — this is the one card on the page styled with the subtle `primary-50` emphasis wash `docs/UI_Design_System.md` §37 reserves for "the single most prominent card," matching the Dashboard Components spec exactly.

**Interactions:** Tapping anywhere on the card (not just the button) resumes into Learn at that exact subtopic, per `docs/Learn_Module.md` §3's reading-position-resume behavior.

**Animations:** Standard card fade-rise on load; no special hover flourish beyond the interactive-card hover already standard for clickable cards (`docs/UI_Design_system.md` §14).

**Loading/Empty/Error:** Skeleton card. A brand-new user with nothing in progress yet shows "Start your first topic" routing into Subjects (`docs/Learn_Module.md` §1) instead of an empty resume card.

---

## 10. Recommended Topics

**Purpose:** What to study *next*, once Continue Learning's single in-progress item runs out — the Adaptive Learning Engine's forward-looking suggestion (`docs/Smart_Practice.md` §11), surfaced for browsing rather than passive consumption only.

**Data source:** derived from `Analytics.weakTopics` combined with exam-relevance weighting — the same ranking logic already described for Weak Areas (`docs/Analytics.md` §8), reframed here as constructive "what's next" rather than a diagnostic list.

**Layout & UI:** A horizontally-scrollable row (mobile) / 3-column grid (desktop) of compact topic cards (`components/subject-card.tsx`), each with a one-line "reason" caption ("Frequently tested in Group 4 Prelims") so a recommendation never feels arbitrary.

**Interactions:** Tapping a card routes into Learn at that topic, or offers a direct "Practice this topic" shortcut (`docs/Learn_Module.md` §6's pre-filtered practice handoff) — the same dual entry point Learn itself offers.

**Animations:** Staggered fade-rise per card (`staggerChildren`, ~60ms per card) — the same reveal rhythm as the Landing Page's Feature Cards and Current Affairs Preview, for a consistent "this is how card rows animate in Nalanda" vocabulary.

**Loading/Empty/Error:** Skeleton cards. Too little attempt data to recommend anything meaningfully yet → "Complete a few quizzes and we'll start recommending topics here," never a generic filler recommendation.

---

## 11. Weak Subjects

**Purpose:** The direct, ranked, actionable diagnostic — closing the insight-to-action loop identical in spirit to `docs/Analytics.md` §8.

**Data source:** `Analytics.weakTopics`, aggregated to subject level for Dashboard-glance density (the full topic-level breakdown lives in Analytics itself, not duplicated here).

**Layout & UI:** A ranked list (not a chart, per `docs/Analytics.md` §8's own reasoning — the need here is a clear action list, not another visualization) of the 3 lowest-scoring subjects, each row: subject name, accuracy figure, and a **"Study this topic"** button.

**Interactions:** The button routes into Learn at that subject's syllabus entry point, or directly starts a Practice session filtered to it.

**Animations:** Row-by-row fade-in, matching the list-reveal rhythm used elsewhere on the page (no bespoke treatment).

**Loading/Empty/Error:** Skeleton rows. Subjects with under 5 attempts show "Not enough data yet" rather than a falsely precise score (`docs/Analytics.md` §2's own rule, applied here). A student with strong, even performance everywhere sees an encouraging "No clear weak spots right now — keep it up" rather than an empty list that reads as missing data.

---

## 12. Current Affairs Summary

**Purpose:** A daily-freshness proof point inside the authenticated app, mirroring the Landing Page's own current-affairs preview (`docs/Landing_Page_Design.md` §12) but now reading the full, authenticated feed rather than the public teaser.

**Data source:** `GET /current-affairs` (`docs/API.md` §13), `period=daily`, already-built via `services/currentAffairsService.ts` — reused directly, not re-implemented.

**Layout & UI:** A compact card listing 2-3 of today's current-affairs headlines with a one-line excerpt each, and a "See Full Current Affairs" link.

**Interactions:** Tapping a headline opens the full entry (`docs/InformationArchitecture.md` §7.9); the card also surfaces a bookmark icon per item, consistent with Current Affairs' own bookmarking support.

**Animations:** Standard card-row fade-in.

**Loading/Empty/Error:** Skeleton rows (already-established pattern from the Landing Page's own Current Affairs Preview — reused, not reinvented). No new content published yet today → "Nothing new today — check back soon," never a blank card.

---

## 13. Upcoming Exams

**Purpose:** Scheduling awareness for the platform's Live Exams whitespace feature (`docs/InformationArchitecture.md` §7.10, `docs/CompetitorAnalysis.md`'s identified differentiator) — "is there a cohort-wide mock coming up I should plan around."

**Data source:** `LiveExams` where `status: "scheduled"`, sorted by `scheduledStartAt` (`docs/Database.md` §4.3).

**Layout & UI:** A short list (1-3 entries) of upcoming scheduled Live Exams, each showing title, exam category, and a countdown-to-start or formatted date/time; a **Register/View** action per entry.

**Interactions:** Tapping an entry routes into Live Exams' instance detail (`docs/InformationArchitecture.md` §9's `/app/live-exams/:examInstanceId`).

**Animations:** Standard row fade-in; an entry starting within the next hour may show a small pulsing "Live soon" indicator — restrained, not an alarming flashing badge.

**Loading/Empty/Error:** Skeleton rows. Nothing scheduled right now → "No live exams scheduled yet — we'll notify you," never an empty dead zone with no explanation.

---

## 14. Quick Practice

**Purpose:** The fastest path into Practice without navigating away from the Dashboard at all — a direct implementation of the Quick Actions philosophy (`docs/Navigation.md` §9) surfaced as a permanent Dashboard widget rather than only a `Cmd/Ctrl+K` command.

**Data source:** none — purely navigational shortcuts to existing Practice modes (`docs/Smart_Practice.md`).

**Layout & UI:** A row of 3-4 compact action buttons/chips: **100 Questions** (the signature mode, `docs/Smart_Practice.md` §1), **Topic Quiz**, **Sectional Test**, **Mock Test** — each a one-tap deep link into `POST /practice/sessions` pre-filled with that mode (`docs/API.md` §6).

**Interactions:** Tapping a mode immediately starts that practice mode — no intermediate confirmation screen, since starting practice is a low-risk, easily-abandoned action.

**Animations:** Standard button-row fade-in; a subtle press/lift on tap consistent with the Button component's existing hover/active states — no bespoke treatment needed.

**Loading/Empty/Error:** None applicable — static, always-available actions with no data dependency. A free-tier user who has hit a daily mode limit sees that mode's chip in a visibly disabled state with a small lock affordance (`docs/UI_Design_System.md` §36), rather than letting them start a session they can't finish.

---

## 15. AI Mentor Card

**Purpose:** Make the platform's AI presence felt on the one screen a student visits daily, not only inside Practice/Analytics — combining a synthesized recommendation with a direct doubt-resolution entry point.

**Data source:** the AI Recommendation synthesis already described in `docs/Analytics.md` §14 ("Focus on Ancient History this week...") plus a direct entry point into the AI doubt chatbot (`docs/PRD.md` §10 Feature 4).

**Layout & UI:** A card using the AI Teal treatment reserved exclusively for AI surfaces (`docs/UI_Design_System.md` §7, §35) — a short, specific, plain-language tip (never generic filler) and an **"Ask AI a question"** button using the AI gradient button variant.

**Interactions:** Tapping the tip's supporting link jumps to the specific Analytics view that justifies it (`docs/Analytics.md` §14's traceability rule); the "Ask AI" button opens the doubt-chatbot panel (`docs/UserJourney.md` Screen 8) without leaving the Dashboard, per the glassmorphism floating-panel treatment already specified for that surface (`docs/UI_Design_System.md` §20).

**Animations:** The "AI is thinking" three-dot pulse (`docs/UI_Design_System.md` §35) only ever appears inside the chat panel once opened — the card itself, at rest, uses the same calm entrance as every other widget, never its own idle pulsing animation (that would compete with the AI orb's dedicated moments in Onboarding/Hero, diluting what makes those distinct, per `docs/Onboarding.md` §6's continuity principle applying in reverse here — the Dashboard's AI card is calm precisely because the orb-pulse moment is reserved elsewhere).

**Loading/Empty/Error:** Skeleton tip line while pending. Too little data for a confident recommendation yet → the same honest placeholder already specified in `docs/Analytics.md` §14 ("Complete a few more practice sessions and we'll start giving you personalized recommendations here").

---

## 16. Notifications

**Purpose:** A glanceable preview of what's waiting, without requiring a trip to the full Notifications module — distinct from the persistent top-bar bell (`docs/InformationArchitecture.md` §4), which remains the always-available, real-time entry point once `dashboard-layout.tsx` exists; this widget is the Dashboard-content-area's own reflection of the same data.

**Data source:** `GET /notifications` (`docs/API.md` §15), most recent 3-4 entries.

**Layout & UI:** A compact card listing recent notifications (type icon, title, relative time, unread dot), with a "View All" link to the full Notifications module (`docs/InformationArchitecture.md` §7.7).

**Interactions:** Tapping an entry marks it read (`PATCH /notifications/{id}/read`) and follows its `deepLink`.

**Animations:** Standard row fade-in; a new/unread entry's dot uses a subtle one-time pop-in, not a persistent pulse (persistent pulsing badges read as anxiety-inducing per the Navigation.md §5 rule against numeric badge overload — this widget already shows content, so it doesn't need an additional attention-grabbing animation on top).

**Loading/Empty/Error:** Skeleton rows. Nothing new → "You're all caught up," never an empty list with no framing.

---

## 17. Recent Activity

**Purpose:** A reflective, chronological log of what the student has actually *done* recently — distinct from Notifications (things the platform surfaced *to* them) and from Weekly Progress (an aggregate chart) — this is the plain, human-readable "what did I do" trail.

**Data source:** a synthesized reverse-chronological feed drawn from recent `Question Attempts` (completed sessions), `Bookmarks` (items saved), and `Achievements` (badges earned) — the same underlying collections already described in `docs/Database.md` §4.3-§4.4/§4.7, presented as one merged timeline rather than three separate lists.

**Layout & UI:** A simple vertical timeline/list (icon per activity type, a one-line description, relative timestamp) — e.g. "Completed Group 4 Mock #3 — 2 hours ago," "Bookmarked 'Sangam Age' — yesterday."

**Interactions:** Tapping an entry deep-links to that specific result/content (a completed session's result view, a bookmarked note).

**Animations:** Standard list fade-in, staggered per row.

**Loading/Empty/Error:** Skeleton rows. A brand-new user with no activity yet → "Your activity will show up here once you start studying," paired with a direct link into Learn/Practice.

---

## 18. Achievements

**Purpose:** The dignified, adult-audience gamification payoff (`docs/Smart_Practice.md` §15) — visible aspiration without looking like a locked-out wall of gray.

**Data source:** `Achievements` (earned) joined against the `Badges` catalog (`docs/Database.md` §4.7).

**Layout & UI:** The Achievement badge grid already specified in `docs/UI_Design_System.md` §39/`docs/Smart_Practice.md` §15 — earned badges in full color, unearned in low-opacity grayscale with a small lock glyph, a "View All" link to the full grid (Profile/Settings) if the Dashboard shows only a truncated subset (6-8 badges).

**Interactions:** Tapping any badge (earned or not) shows its name and unlock criteria in a small tooltip/popover — an unearned badge's criteria being visible is itself part of "aspiration without looking broken."

**Animations:** At rest, no animation beyond standard grid fade-in — `motion-celebratory` is reserved specifically for the *moment* a badge is newly earned (`docs/Smart_Practice.md` §15), never replayed on every subsequent Dashboard visit just because the badge happens to render on screen.

**Loading/Empty/Error:** Skeleton grid. A brand-new user with zero earned badges yet still shows the full grid in its grayscale/locked state (never hidden) — the aspiration *is* the empty state here, not a separate message.

---

## 19. Premium Banner

**Purpose:** The page's closing, low-emphasis upsell — appearing after every other section has already delivered real value, never as the first thing a student sees (`docs/UI_Design_System.md` §36).

**Data source:** `subscriptionTier` from the shared summary fetch (§21) — this widget renders differently (or not at all) depending on tier.

**Layout & UI:** For a Free-tier user: a card using the Premium Components treatment (`docs/UI_Design_System.md` §36) — Sangam Gold accent at low saturation, a specific, honest benefit statement ("Unlock unlimited mock tests and AI Mains evaluation with Plus"), and an **Upgrade** button routing to Subscription (`docs/InformationArchitecture.md` §7.4). For a Plus/Pro/Institutional user, this widget **does not render at all** — an already-paying user is never shown an upsell for something they already have, which would read as either a bug or a trust-eroding dark pattern.

**Interactions:** "Upgrade" routes to the Pricing/Subscription comparison table (`docs/Landing_Page_Design.md` §15's pattern, reused for the authenticated Subscription screen).

**Animations:** Standard card fade-in — no urgency-driven treatment (no countdown, no pulsing "limited time"), per the platform's explicit rejection of dark-pattern urgency (`docs/UI_Design_System.md` §1's "calm confidence over urgency-driven dark patterns").

**Loading/Empty/Error:** Renders only once `subscriptionTier` resolves from the shared summary fetch — never shown speculatively before that's known, to avoid a flash of an upsell for a user who turns out to already be Pro.

---

## 20. Layout, Responsive Behavior, and the Dashboard Shell

**Grid composition:** Widgets compose into a responsive grid — full-width for Welcome Banner/Stats Row/Weekly Progress/Continue Learning/Quick Practice/AI Mentor/Achievements/Premium Banner; explicit two-column pairs for Daily Study Goal+Today's Tasks, Recommended Topics+Weak Subjects, Current Affairs+Upcoming Exams, and Notifications+Recent Activity (per the Page Flow diagram above) on desktop/tablet, collapsing to a single stacked column in the same top-to-bottom order on mobile — no widget is ever hidden on mobile, only reflowed.

**Relationship to `dashboard-layout.tsx` (not yet built):** this document's content assumes it will eventually render inside that shell's `<main>`, alongside the persistent sidebar/top bar/exam-goal switcher already specified in `docs/InformationArchitecture.md` §4. Until that shell exists (`docs/MASTER_ROADMAP.md` Phase 7), the Dashboard page renders its own minimal header (logo, theme toggle, logout) directly, exactly as `pages/onboarding/onboarding-page.tsx` already does for the same not-yet-built-shell reason — this is a known, temporary simplification, not a design decision to skip the shell permanently.

**Motion principle (applies across every widget above):** the page reveals top-to-bottom with a single staggered fade-rise on first load (`docs/UI_Design_System.md` §19's `motion-base`, staggered ~60-80ms per widget) — never nineteen independently-timed entrance animations competing for attention. Within a widget, motion is reserved for genuine state changes (a task getting checked, a chart resolving) — per §32's core rule, if removing an animation wouldn't lose any information about what just happened, it shouldn't exist. Only the Achievements' new-badge-earned moment and a full-day-of-tasks-completed moment (§3, §18) ever reach for `motion-celebratory`; everything else stays within `motion-fast`/`motion-base`.

**Skeleton discipline:** every widget's loading state is a skeleton matching its own eventual shape (`docs/UI_Design_System.md` §26), never a single page-wide spinner — a slow network should reveal the Dashboard's structure immediately, with individual widgets resolving independently and asynchronously as their own data arrives.

---

## 21. Data Grouping (What Actually Gets Fetched)

To avoid nineteen independent, uncoordinated network calls for what is substantially overlapping data, widgets share fetches by **query key**, not by a bespoke shared-state mechanism:

| Shared fetch | Widgets that read it |
|---|---|
| `GET /dashboard/summary` (extended, §0) | Welcome Banner (§1), Daily Study Goal (§2), Stats Row — Streak/XP/Coins (§4-§6), Premium Banner (§19) |
| `GET /leaderboard/me` | Rank tile (§7) |
| `GET /dashboard/today-tasks` | Today's Tasks (§3) |
| Weekly study-minutes aggregate | Weekly Progress (§8) |
| Continue-learning lookup | Continue Learning (§9) |
| Recommended-topics lookup | Recommended Topics (§10) |
| `Analytics.weakTopics` (subject-level) | Weak Subjects (§11) |
| `GET /current-affairs` (`period=daily`) | Current Affairs Summary (§12) — reuses the existing `services/currentAffairsService.ts`, not a new endpoint |
| Upcoming Live Exams lookup | Upcoming Exams (§13) |
| AI Recommendation synthesis | AI Mentor Card (§15) |
| `GET /notifications` | Notifications (§16) |
| Recent-activity feed | Recent Activity (§17) |
| `Achievements` × `Badges` | Achievements (§18) |

Multiple widgets calling the same query key is expected and encouraged (React Query's cache de-duplicates the underlying request automatically) — it keeps each widget component self-contained (owns its own loading/error state, exactly like every existing Landing Page section) without actually re-fetching the same data nineteen times.

---

## Recommendations

1. **Build the shared summary fetch's real endpoint (`GET /dashboard/summary`) to genuinely include `streak`/`xp`/`coins`/`rank`/`subscriptionTier`** when the backend is built (Phase 5) — this document assumes that extension rather than five separate round-trips for five numbers that are all cheap to compute together server-side.
2. **Never let Weak Subjects (§11) or Recommended Topics (§10) drift into showing the exact same subject/topic** without a visible distinction in *why* each is surfaced — one is diagnostic ("this is dragging you down"), the other is prescriptive ("study this next") — even when they happen to overlap, the copy must make clear which framing applies.
3. **Keep the Premium Banner (§19) as the page's literal last widget, permanently** — resist ever promoting it higher for "better conversion," which would directly contradict the calm-confidence brand principle this whole page is built around.
4. **Reuse `services/currentAffairsService.ts` for §12 rather than inventing a second current-affairs fetch** — the Landing Page's implementation already does exactly what this widget needs, just against the authenticated feed instead of the public preview.
5. **Treat this document as the spec of record for the Dashboard's content**, the same way `docs/Learn_Module.md`/`docs/Analytics.md` are for their modules — update it, not just `PROJECT_CONTEXT.md`, if a future session changes what a widget shows or how it's sourced.

---

*End of Document.*
