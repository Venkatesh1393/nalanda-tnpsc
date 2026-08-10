# Nalanda TNPSC — Smart Practice (AI Practice Engine)

| | |
|---|---|
| **Document Owner** | UX Design / AI & Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UserJourney.md` Screen 7, `docs/InformationArchitecture.md` §7.2, `docs/Database.md` §4.3/§4.7, `docs/API.md` §6, `docs/Architecture.md` §5, and `docs/UI_Design_System.md` §32/§38 as the structural and philosophical authorities this document builds on |

### Scope Note

`docs/UserJourney.md` Screen 7 specified the baseline Practice screen. This document is the **complete design of the AI Practice Engine** as a coherent system — every mechanic (difficulty, hints, explanations, gamification) is explained not as an isolated feature but as part of one adaptive loop that gets smarter about a specific user the more they use it.

### A Note on Gamification Philosophy (Read Before the Rest)

`docs/UI_Design_System.md` explicitly rejects Duolingo-style mascots and cheapened, everywhere-celebration for Nalanda's adult, high-stakes-exam audience. XP, Coins, and Achievements (§13–§15) are designed within that constraint: every point of XP, every coin, and every badge maps to a **real, specific, honestly-earned study action** — never a manufactured engagement hook. Where a mechanic risks feeling gimmicky, this document says so explicitly and adjusts rather than importing it uncritically.

---

## Practice Engine Overview

```
                     ┌─────────────────────────────┐
                     │   Adaptive Learning Engine    │  (§12 — the brain)
                     │  (reads Question Attempts,    │
                     │   Analytics, weak areas)       │
                     └──────────────┬────────────────┘
                                    │ selects & sequences
                                    ▼
     ┌───────────────────────────────────────────────────────────┐
     │                     Practice Session                        │
     │  100 Questions (§1) · Timer (§2) · Difficulty (§3) ·        │
     │  Hints (§4) · Bookmarks (§9) · Premium Lock (§13)            │
     └──────────────┬────────────────────────────────────┬────────┘
                    │ during                              │ after
                    ▼                                      ▼
        AI Explanation (§5), Memory Tricks (§6)      Review (§8)
                                                            │
                                                            ▼
                                              Revision (§10, hands off to
                                              docs/Learn_Module.md §8)
                                                            │
                                                            ▼
                                    XP (§13) · Coins (§14) · Achievements (§15)
```

---

## 1. 100 Questions (The Signature Challenge)

**What it is:** alongside the existing Topic Quiz, Sectional, Mock, and PYQ modes (`docs/API.md` §6), **"100 Questions"** is a distinct, branded practice mode — a fixed-length, full-syllabus mixed set sized to mirror the scale of an actual TNPSC paper, positioned as the platform's flagship, most substantial single practice session.

**Interaction:** Selecting "100 Questions" from the Practice mode picker starts a single continuous session (no sub-navigation between sections) drawing questions across all subjects for the active exam goal, weighted by the Adaptive Learning Engine (§12) toward the user's actual weak areas rather than a naive even split — so two different users starting "100 Questions" on the same day receive meaningfully different question sets tailored to each of them.

**Pacing:** Unlike a full Mock Test (which enforces the exact official time limit), 100 Questions uses a **generous, self-paced soft timer** (§2) — its purpose is depth of coverage and stamina-building, not exam-condition simulation, so it shouldn't carry the same time pressure as a Mock Test.

**Completion & interruption:** Fully resumable if interrupted (identical auto-save guarantee as all Practice sessions, per `docs/UserJourney.md` Screen 7) — given its length, a user is more likely to split it across two sittings than a short topic quiz, and the design must never punish that.

**Why this matters:** it gives Nalanda a single, memorable, shareable unit of achievement ("I finished a 100 Questions set today") distinct from the more clinical "mock test" framing — a deliberately named moment, not just a longer quiz.

---

## 2. Timer

**Two distinct timer behaviors, by mode:**
| Mode | Timer Behavior |
|---|---|
| Topic Quiz, 100 Questions | **Soft timer** — visible, running, but never force-submits; exists to build pacing awareness without exam-level pressure |
| Sectional, Mock, PYQ, Live Exam | **Hard timer** — enforces the exact official time allotment, auto-submits at zero, matching real exam conditions |

**Visual behavior:** tabular-numeral countdown (`docs/UI_Design_System.md` §4/§38), shifting from calm `text-primary` to `warning-600` in the final 10% of time, then `error-600` in the final minute — a gradual, non-jarring escalation, identical pattern regardless of mode, so the user learns one consistent visual language for "time is running out" across the whole product.

**Interaction on hard-timer expiry:** the session auto-submits with a clear, non-alarming message ("Time's up — your test has been submitted") rather than an abrupt forced exit — consistent with `docs/UserJourney.md` Screen 7.

**Interaction on soft-timer sessions:** the timer keeps running past any "expected" duration without any negative framing at all — there is no such thing as "running out of time" on a soft-timer session, only a running total shown for the user's own pacing awareness.

---

## 3. Difficulty

**Visible difficulty tagging:** every question carries a difficulty badge (`docs/UI_Design_System.md` §18 — Easy / Medium / Hard, neutral pill styling, never a semantic color) shown discreetly, not prominently, during practice — difficulty is informational, not a scoreboard element to chase.

**How difficulty is chosen:** in Topic Quiz and 100 Questions modes, difficulty is **not user-selected** — it is continuously determined by the Adaptive Learning Engine (§12) based on live in-session performance. In Sectional/Mock/PYQ modes, difficulty is fixed by the underlying test definition (`docs/Database.md` §4.3, `Mock Tests`), since these modes exist specifically to simulate a real, unadaptive exam paper.

**Interaction:** a user answering several consecutive Medium questions correctly will notice the *next* question is Hard — a felt, not announced, transition (no "leveling up!" popup — the difficulty badge itself is the only signal, keeping this mechanic understated per the gamification philosophy above).

---

## 4. Hints

**What it is:** a lighter-weight assistance mechanic than full AI Explanation (§5) — a **hint nudges the user toward the answer without revealing it**, distinct from an explanation, which is only shown after an answer is submitted.

**Interaction:** a small "Get a Hint" ghost-button beneath the question (available before answering, not after) — tapping it reveals one short line that narrows the answer space (e.g., eliminating one clearly wrong option, or pointing at the relevant concept by name) without stating the answer itself.

**Cost/limits:** hints are a **free-tier-limited, Plus/Pro-unlimited** feature (tied into Premium Lock, §13) — a small number of free hints per day keeps the mechanic accessible to every user while still being a genuine, honest premium differentiator, not a bait-and-switch.

**Scoring interaction:** using a hint on a question that is subsequently answered correctly is tracked distinctly from an unaided correct answer in the underlying `Question Attempts` record (`docs/Database.md` §4.3) — this doesn't penalize the user's score, but it does feed the Adaptive Learning Engine's confidence model more precisely (a hint-assisted correct answer signals partial, not full, mastery of that topic).

**Animation:** the hint text fades in beneath the question (`motion-fast`) without any layout-jarring reflow of the answer options above it.

---

## 5. AI Explanation

**When it appears:** available on every question *after* an answer is submitted (never before, which would undermine the practice itself) — via the "Why is this the answer?" link already specified in `docs/UserJourney.md` Screen 7, and fully designed as its own screen/interaction in `docs/UserJourney.md` Screen 8, which this document does not re-derive.

**Practice-specific behavior:** the explanation is contextualized with the user's *own* selected answer, not just the correct one — e.g., "You selected B. The correct answer is C because..." — always acknowledging what the user actually chose before explaining the right answer, so the explanation reads as responsive rather than generic.

**Follow-up:** the same "Ask a follow-up" chat affordance from `docs/UserJourney.md` Screen 8 is available here, letting a user who's still confused go deeper without leaving the Practice flow.

---

## 6. Memory Tricks

**What it is:** short, curated (or AI-generated and content-team-reviewed) mnemonics attached to specific questions or topics prone to confusion or rote memorization (e.g., ordering of historical events, classification lists in General Science) — a genuinely new content type this document introduces, sitting alongside Explanation as a second, distinct kind of post-answer help.

**Interaction:** shown as a small, optionally-expandable card beneath the AI Explanation (§5), labeled clearly ("Memory Trick") so it's never confused with the factual explanation itself — a user who doesn't want it can leave it collapsed with zero friction.

**Content sourcing:** curated by content editors for high-value topics initially, with the AI Orchestration Service (`docs/Architecture.md` §5) able to *suggest* candidate mnemonics for editor review — never surfaced to students unreviewed, since a bad or confusing mnemonic is worse than none at all.

**Bookmarking:** a Memory Trick can be bookmarked independently of the question it's attached to (its own `contentType` in the `Bookmarks` collection, `docs/Database.md` §4.4), since a great mnemonic is often reusable across multiple related questions.

---

## 7. Previous Year Questions (PYQ)

**Presentation:** framed distinctly from AI-generated or curated practice questions — each PYQ carries a visible year/exam-edition tag (e.g., "TNPSC Group 4 — 2023") so the user always knows they're solving a real, historical exam question, which carries different psychological weight ("this is a question that was actually asked") than a generated practice question.

**Filtering:** selectable by year and, within a year, by topic — letting a user either work through a full historical paper in one sitting or drill just the PYQ subset relevant to a topic they're currently studying (a direct handoff target from Learn, per `docs/Learn_Module.md` §6).

**Scoring/Adaptive integration:** PYQ attempts feed the Adaptive Learning Engine (§12) exactly like any other practice attempt — a user's real exam-question performance is a strong, high-value signal for weak-area detection, arguably stronger than generated-question performance.

---

## 8. Review

**Purpose:** a dedicated, deliberate walkthrough mode distinct from the immediate post-submission score summary (`docs/UserJourney.md` Screen 7's `/result` view) — Review is where a user methodically goes back through every question in a completed session, one at a time, rather than just seeing an aggregate score.

**Layout:** question-by-question navigation (using the same question-palette pattern from live practice, `docs/UserJourney.md` Screen 7, now color-coded by outcome — correct, incorrect, skipped — rather than by answered/unanswered/marked), each question shown with the user's selected answer, the correct answer, and direct access to AI Explanation (§5) and Memory Tricks (§6) for that specific question.

**Interaction:** a "Bookmark for Revision" action is prominently available on every incorrect question during Review — this is the primary, most natural moment a user decides what's worth saving, more so than bookmarking mid-session under time pressure.

**Animation:** navigating between questions in Review uses a quick horizontal slide (`motion-fast`), consistent with the wizard-style navigation pattern established elsewhere (`docs/Onboarding.md`), giving Review a calm, deliberate pace appropriate to careful reflection rather than timed pressure.

---

## 9. Bookmarks

**Practice-specific entry points:** a bookmark icon is available (a) inline during live practice, next to any question, for a user who wants to flag something without breaking their pace, and (b) prominently during Review (§8) on every incorrect question — two different moments serving two different intents (flag-in-passing vs. deliberate save-for-later).

**Mechanism:** identical underlying system to `docs/Learn_Module.md` §7 — a bookmarked question is a pure reference (`contentType: "question"`) into the live `Questions` collection, never a frozen copy, so if a question is later corrected by a content editor, the bookmark always reflects the current, accurate version.

---

## 10. Revision

**Direct pipeline into `docs/Learn_Module.md` §8:** every incorrectly-answered question across every Practice mode (Topic Quiz, 100 Questions, Sectional, Mock, PYQ) automatically becomes a candidate for the Smart Revision Scheduler — a user does **not** need to manually bookmark every wrong answer for it to resurface later; incorrect `Question Attempts` (`docs/Database.md` §4.3) are a first-class input to the scheduler independent of explicit bookmarking (§9), which remains available for anything the user wants to flag *beyond* what the algorithm already tracks.

**Why this distinction matters:** it means Revision stays useful even for a user who never bothers to bookmark anything — the system already knows what they got wrong and brings it back at the right spaced interval, with explicit bookmarking as an enhancement, not a requirement.

---

## 11. Adaptive Learning

**The core mechanism:** every Topic Quiz and 100 Questions session is sequenced, question-by-question, by an engine that continuously reads the user's accuracy, response time, and (from §4) hint usage *within the current session*, combined with their longer-term weak-area profile from `Analytics` (`docs/Database.md` §4.4), to select the next question's topic and difficulty in real time — per the design already specified at the system level in `docs/Architecture.md` §5 and `docs/PRD.md` §10, Feature 2.

**What the user actually experiences:** not a visible "AI is choosing your next question" indicator (that would feel clinical and break immersion mid-practice) — the adaptivity is felt only through the natural difficulty progression (§3) and, over multiple sessions, through visibly improving Weak Area rankings in Analytics (`docs/UserJourney.md` Screen 9). The mechanism is real and continuous; its presentation to the user is quiet and outcome-based, not a running commentary on itself.

**Boundary condition:** Sectional, Mock, PYQ, and Live Exam modes are **not** adaptive — their whole value is faithfully reproducing a fixed, real exam structure, so applying adaptive sequencing there would undermine the mode's actual purpose. Adaptivity is scoped specifically to Topic Quiz and 100 Questions, the two modes whose explicit purpose is personalized skill-building rather than exam simulation.

---

## 12. Premium Lock

**What's free vs. gated, specifically within Practice:**
| Element | Free | Plus | Pro |
|---|---|---|---|
| Topic Quizzes | Limited daily count | Unlimited | Unlimited |
| 100 Questions | 1 per week | Unlimited | Unlimited |
| Sectional/Mock Tests | Limited daily count | Unlimited | Unlimited |
| Hints (§4) | Small daily cap | Unlimited | Unlimited |
| AI Explanation (§5) | Small daily cap | Higher cap | Unlimited |
| Memory Tricks (§6) | Full access | Full access | Full access (never gated — a low-cost, high-goodwill feature) |
| PYQ (§7) | Recent years only | Full historical archive | Full historical archive |

**Interaction on hitting a limit:** the exact honest-upsell treatment already specified in `docs/UI_Design_System.md` §36 and `docs/UserJourney.md` Screen 7 — a clear, specific message at the moment a limit is reached (e.g., "You've used today's free Topic Quizzes — upgrade to Plus for unlimited practice"), never a silent block or a bait-and-switch that let the user start something they can't finish.

**Why Memory Tricks stays fully free:** a deliberate exception — mnemonics are low marginal cost to serve and high goodwill; gating them would feel petty relative to their scale of value, whereas gating unlimited full-length practice volume (a genuine cost/value driver) is a defensible, honest premium boundary.

---

## 13. XP

**What it represents:** a cumulative, transparent measure of *effort actually invested* — a fixed, published amount of XP is earned per completed question (a small base amount) with modest, clearly-explained bonuses for correct answers and for completing full sessions (Topic Quiz, 100 Questions, Mock) rather than abandoning them partway. XP is **never** awarded for actions with no real study value (e.g., simply opening the app), avoiding the manufactured-engagement pattern the platform explicitly avoids elsewhere.

**Where it's shown:** a quiet, tabular-numeral running total visible on the Dashboard and Profile (`docs/InformationArchitecture.md` §7.5) — never as a dominant, attention-grabbing HUD element during practice itself, where focus on the actual questions should remain paramount.

**Purpose:** XP is primarily a **personal, longitudinal effort record** ("I've earned 4,200 XP this month") rather than a primarily-competitive mechanic — it feeds lightly into Leaderboard tie-breaking (`docs/API.md` §9) but is not itself the leaderboard's primary ranking signal (percentile/score remains primary, keeping the Leaderboard's meaning tied to actual exam-relevant performance, not raw activity volume).

---

## 14. Coins

**What it represents:** a lightweight, **functional** currency (deliberately not a cosmetic-only "gem shop" mechanic) earned from the same honestly-earned actions as XP, at a slower accrual rate, redeemable for small, genuinely useful things: unlocking one extra AI Explanation or Hint beyond the free-tier daily cap, or unlocking one bonus PYQ paper outside a free user's normal year-range access.

**Why coins exist alongside XP, not instead of it:** XP is a *record* (it only ever goes up, a permanent effort ledger); Coins are a *spendable resource* (a balance that goes up and down) — keeping these conceptually distinct avoids the common gamification confusion where a single "points" number tries to serve as both a status score and a currency at once.

**Interaction:** a small coin-balance indicator in the same quiet Dashboard/Profile location as XP; spending coins (e.g., "Unlock one more Hint today — 20 coins") shows a simple, explicit confirmation of the exchange before committing, never an ambiguous or accidental spend.

**Guardrail against feeling exploitative:** coins are never sellable for real money in either direction (not purchasable with cash, not redeemable for cash or discounts) — keeping the entire mechanic inside a closed, effort-for-utility loop, avoiding any resemblance to a monetized loot/gacha pattern that would clash badly with the platform's serious, trustworthy positioning (`docs/UI_Design_System.md` brand thesis).

---

## 15. Achievements

**Mechanism:** implemented via the existing `Badges` (catalog) and `Achievements` (earned instances) collections (`docs/Database.md` §4.7) — this document doesn't introduce new data structures, only new badge *definitions* meaningful to the Practice Engine specifically: "First 100 Questions Completed," "7-Day Practice Streak," "First Mock Test Finished," "PYQ Completionist (a full year solved)," "Comeback" (returning to practice after a long gap, framed warmly rather than shaming the gap).

**Presentation:** the Achievement badge grid already specified in `docs/UI_Design_System.md` §39 — earned badges in full color, unearned badges in low-opacity grayscale with a small lock glyph, visible as aspiration without looking broken.

**Unlock moment:** this is one of the few moments in the entire Practice Engine that **does** warrant the stronger `motion-celebratory` treatment (`docs/UI_Design_System.md` §19/§32) — a genuine, infrequent milestone, distinct from the routine, restrained motion used for hints, bookmarking, and XP accrual throughout this document. The celebration is a brief, dignified badge-reveal animation (not confetti or a full-screen takeover), consistent with the platform's overall restraint even at its most celebratory moments.

---

## How XP, Coins, and Achievements Work Together

| Mechanic | Question It Answers | Direction | Celebratory Motion? |
|---|---|---|---|
| **XP** | "How much effort have I put in, over time?" | Only increases | No — quiet, tabular update |
| **Coins** | "What can I spend on right now?" | Increases and decreases | No — quiet, tabular update |
| **Achievements** | "What specific milestones have I earned?" | Discrete, one-time unlocks | **Yes** — the one place celebration is warranted |

Keeping these three mechanics conceptually distinct, rather than merging them into one generic "points" system, is what allows Achievements to remain special — if XP or Coins also triggered celebratory animation on every accrual, the genuinely rare Achievement-unlock moment would lose its distinctiveness entirely.

---

## Recommendations

1. **Audit every XP/Coin-earning rule against the "real study value" test before shipping it.** If a proposed rule would reward an action with no genuine learning value (e.g., XP for merely opening a screen), it should be rejected — this is the single most important guardrail keeping this system from drifting into the manufactured-engagement pattern the platform explicitly positions against.
2. **Keep Memory Tricks (§6) unreviewed-AI-content-free.** Any AI-suggested mnemonic must pass content-editor review before reaching a student — an incorrect or confusing memory trick actively damages trust in a way a delayed feature never would.
3. **Never make Adaptive Learning (§11) visible as a running commentary during practice.** Its value is felt through outcomes (better Weak Area rankings over time), not narrated in real time — surfacing "the AI thinks you're ready for a harder question" mid-session would break focus and feel gimmicky rather than intelligent.
4. **Preserve the Sectional/Mock/PYQ non-adaptive boundary strictly.** These modes' entire credibility rests on faithfully reproducing real exam conditions — any future feature request to "make mocks adaptive too" should be resisted as a category error, not a natural extension.

---

*End of Document.*
