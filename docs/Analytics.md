# Nalanda TNPSC — Analytics Module

| | |
|---|---|
| **Document Owner** | UX Design / Data Visualization |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UserJourney.md` Screen 9, `docs/Database.md` §4.4/§8, `docs/API.md` §7, and `docs/UI_Design_System.md` §17/§39 as the structural and visual authorities this document builds every graph on top of |

### Scope Note

`docs/UserJourney.md` Screen 9 gave a single-screen summary of Analytics. This document is the **complete, graph-by-graph specification** of the entire module — what each visualization shows, exactly what data feeds it, how it's computed, and how a user is meant to read and act on it. Every graph described here is a materialized view read from the `Analytics` collection (`docs/Database.md` §4.4), refreshed by a background aggregation job — **never computed live from raw `Question Attempts` on page load**, per the performance design already established in `docs/Database.md` §8.

---

## Data Pipeline (What Feeds Every Graph Below)

```
Question Attempts (raw, per-answer)
        │
        ▼
Background Aggregation Job (scheduled, per docs/Architecture.md §9)
        │
        ▼
Analytics collection (materialized: sectionalScores, weakTopics,
                       percentile, rankEstimate, trend[])
        │
        ▼
GET /analytics/overview · /weak-areas · /trends · /rank
(docs/API.md §7)
        │
        ▼
The 14 graphs/views specified below
```

**Why this matters to how the graphs behave:** every graph on this screen carries a visible "last updated" timestamp (per `docs/Database.md` §4.4's `computedAt` field) rather than implying real-time freshness — a deliberate, honest choice consistent with the platform's transparency principle, since a user's very latest practice session may take a few minutes to fully reflect here.

---

## 1. Overall Analytics

**What it is:** the top-level, first-glance view — a single **percentile/score ring** (the signature Analytics visual, `docs/UI_Design_System.md` §39) with the user's overall percentile in large tabular numerals at its center, surrounded by three supporting stat tiles: total questions attempted, overall accuracy, and current streak.

**Graph type:** circular progress ring — `primary-600` arc over a `neutral-100` track, arc length proportional to percentile.

**Data source:** `Analytics.overallPercentile`, aggregated across all practice modes for the user's active exam goal.

**Interaction:** tapping the ring or any stat tile drills into the relevant deeper view (Subject Analytics for the ring, Study Time for the streak tile, etc.) — this screen is a dashboard-of-dashboards, not a dead end.

**Empty state:** a user with no attempts yet sees the ring rendered at 0% with encouraging copy ("Complete your first quiz to see your analytics") rather than a blank space — consistent with `docs/UI_Design_System.md` §24.

---

## 2. Subject Analytics

**What it is:** the first drill-down level — a **horizontal bar chart**, one bar per subject (e.g., Tamil, General Science, Aptitude for Group 4), sorted weakest-to-strongest by default so the most actionable information is immediately at the top, not buried.

**Graph type:** horizontal bars (chosen over vertical, per `docs/UI_Design_System.md` §17, because subject names are often long and read better left-aligned), using the curated chart palette rather than semantic success/error colors.

**Data source:** `Analytics.sectionalScores`, keyed by `subjectId`.

**Interaction:** tapping a subject's bar drills into Topic Analytics (§3) for that specific subject; a toggle above the chart switches its metric between accuracy and percentile-within-subject.

**Empty state:** subjects with fewer than a minimum attempt threshold (e.g., under 5 questions attempted) are shown grayed-out with an "Not enough data yet" label rather than a misleadingly precise bar — avoiding false precision from a tiny sample.

---

## 3. Topic Analytics

**What it is:** the second drill-down level, reached from a specific Subject — the same horizontal-bar pattern as §2, now scoped to the topics within that one subject (e.g., within "General Science": Physics, Chemistry, Biology).

**Graph type:** identical horizontal-bar treatment to §2, for visual continuity as the user drills deeper — the chart *type* never changes as you go deeper, only its *scope*, so the interaction model stays instantly familiar.

**Data source:** the same `sectionalScores` structure, filtered/re-aggregated one level down by `topicId`.

**Interaction:** tapping a topic's bar drills into Subtopic Analytics (§4); a breadcrumb ("Analytics > General Science") sits above the chart, mirroring the exact breadcrumb pattern used in `docs/Learn_Module.md`'s content hierarchy, so a user recognizes "I'm navigating a hierarchy" from having already seen the same pattern while studying.

---

## 4. Subtopic Analytics

**What it is:** the finest-grained drill-down level — individual subtopic performance within a topic, presented as a simple ranked list rather than a bar chart at this density (e.g., "Newton's Laws of Motion: 62% accuracy, 14 attempts") since a bar chart with many thin, similarly-sized bars becomes harder to read than a clean list at this level of granularity.

**Data source:** computed on-demand at this depth directly from `Question Attempts` filtered by `subtopicId` (the only one of these four drill-down levels not pre-materialized in the `Analytics` collection, since the combinatorial depth of pre-aggregating every subtopic for every user would be disproportionate to how often this exact view is visited — a deliberate, documented exception to the "always materialized" rule stated above).

**Interaction:** each subtopic row carries a direct **"Study this subtopic"** action, deep-linking straight into the Learn module (`docs/Learn_Module.md` §3) at that exact subtopic — this is the single most direct insight-to-action link in the entire Analytics module.

---

## 5. Accuracy

**What it is:** a dedicated view isolating the **accuracy** metric specifically (as distinct from percentile, which is relative to other users — accuracy is a user's own, absolute correct/incorrect rate).

**Graph type:** a **donut chart** (correct vs. incorrect vs. skipped, three segments) for a single time window, paired with a **smooth trend line** (gradient-fill beneath, per `docs/UI_Design_System.md` §17) showing accuracy over the last 30/90 days, letting a user see both a snapshot and a trajectory in one view.

**Data source:** `Analytics.sectionalScores` aggregated to a single overall figure, and `Analytics.trend[]` for the line.

**Interaction:** a date-range filter (7/30/90 days, or a custom range for Pro-tier users per `docs/API.md` §7's tier gating) sits above both charts and updates them together.

**Reading guidance shown on-screen:** a short, plain-language caption beneath the trend line (e.g., "Your accuracy has improved 6 points this month") — the chart is never left to speak entirely for itself without a plain-language takeaway, since not every user is equally comfortable interpreting a raw line chart unaided.

---

## 6. Speed

**What it is:** a view addressing **time-per-question**, a metric distinct from accuracy that specifically surfaces pacing problems — a user can be accurate but too slow (a real-exam time-management risk) or fast but careless (a rushing risk), and only a dedicated speed view can distinguish these.

**Graph type:** a **horizontal bar chart comparing the user's average time-per-question against a benchmark "typical" time** for that subject (derived from the wider Nalanda cohort's median), with two bars per subject — the user's own average, and the benchmark — shown side by side rather than overlapping, so the comparison is unambiguous.

**Data source:** `timeTakenSeconds` averaged from `Question Attempts` (`docs/Database.md` §4.3), benchmark computed as a scheduled batch job over the broader cohort.

**Interaction:** subjects where the user is notably slower than benchmark are subtly flagged (a small clock glyph, not a red warning color, since being slow isn't inherently bad — it may reflect careful accuracy) with a short interpretive note distinguishing "slow and accurate" from "slow and still inaccurate," since these call for very different advice.

**Why this graph matters specifically for the Karthik persona:** a time-constrained working professional benefits disproportionately from knowing *where* their limited study time is being spent inefficiently, not just *whether* they're getting answers right.

---

## 7. Heatmaps

**What it is:** a **topic-by-difficulty accuracy grid** — rows are topics (within the currently selected subject), columns are Easy/Medium/Hard, and each cell is color-shaded by accuracy in that specific topic-difficulty combination — revealing patterns a simple per-topic bar chart can't (e.g., a topic where the user is fine at Easy/Medium but collapses specifically at Hard, versus one that's uniformly weak across all difficulties, which call for different interventions).

**Graph type:** a grid heatmap using a single-hue sequential scale (light-to-dark `primary` tint, per `docs/UI_Design_System.md` §17's curated-palette principle — never a traffic-light red-to-green scale here, since that would visually clash with the platform's dedicated `error-600`/`success-600` semantic colors used elsewhere for genuinely binary correct/incorrect states).

**Data source:** `Question Attempts` cross-tabulated by `topicId` × `difficulty`, aggregated into the `Analytics` document at generation time.

**Interaction:** tapping any cell surfaces the specific questions behind it as a quick, filtered practice-session starting point ("Practice these 8 Hard questions in Ancient History") — turning a diagnostic view directly into an action, similar in spirit to Subtopic Analytics' direct study link (§4).

---

## 8. Weak Areas

**What it is:** a ranked list (not a chart) of the topics dragging performance down the most — deliberately a list rather than a graph at this point in the module, since the user's actual need here is a clear, ordered action list, not another visualization to interpret.

**Content per row:** topic name, accuracy score, and a direct **"Study this topic"** button — closing the insight-to-action loop identical in spirit to §4 and §7.

**Data source:** `Analytics.weakTopics`, already ranked server-side (`docs/Database.md` §4.4).

**Sorting principle:** ranked by a combination of low accuracy *and* how frequently that topic actually appears in real TNPSC papers (weighted by exam-relevance, not just raw practice-session frequency) — so the list surfaces what's actually costing the user marks on the real exam, not just what they've happened to practice the least.

---

## 9. Strong Areas

**What it is:** the deliberate positive counterpart to Weak Areas — a ranked list of the user's best-performing topics, shown with equal visual prominence, not as a small afterthought beneath the weak-areas list.

**Why this exists as its own dedicated view, not just "the bottom of the weak-areas list flipped":** confidence-building is a real, stated need across the persona research (`docs/UserPersonas.md`) — a module that only ever shows a user what's wrong with their preparation risks feeling discouraging over a long, multi-month preparation cycle. Explicitly surfacing strengths gives honest, earned encouragement without inflating anything.

**Content per row:** topic name, accuracy score, and (where relevant) a small note when a topic has crossed from "weak" to "strong" over time — a genuine, felt sense of progress rather than a static snapshot.

---

## 10. Expected Score

**What it is:** a predictive estimate of the score range the user would likely achieve if they took the actual TNPSC exam today, based on their practice performance trends.

**Graph type:** a **range-band gauge** — a horizontal bar showing a shaded band (low-to-high expected range) rather than a single false-precision number, with the user's most recent Mock Test scores plotted as individual markers within or near the band for context.

**Data source:** derived from recent Mock Test and 100 Questions (`docs/Smart_Practice.md` §1) performance, weighted more heavily toward full-length, exam-condition sessions than short topic quizzes, since those are the strongest real predictors of actual exam performance.

**Honesty framing shown on-screen:** an explicit caption — "Estimated range based on your last 5 full-length practice sessions" — so the number is never presented as a guarantee, and a small disclaimer appears for users with too few full-length sessions to generate a meaningfully confident estimate (falling back to "Take a few more full mock tests to unlock your expected score range" rather than showing an unreliable figure).

---

## 11. Rank Prediction

**What it is:** distinct from Expected Score (§10) — this shows where the user likely stands **relative to other aspirants**, not an absolute score estimate.

**Graph type:** a **bell-curve/distribution visualization** with the user's position marked on the curve ("You are here"), alongside the plain percentile/rank-estimate figure in large tabular numerals — visually communicating not just the number but *where on the competitive spectrum* that number sits, which a bare percentage alone doesn't convey as intuitively.

**Data source:** `Analytics.percentile`/`rankEstimate`, computed against the platform's user base for the same exam category (`docs/Database.md` §4.4), via `GET /analytics/rank` (`docs/API.md` §7).

**Small-cohort honesty:** for a lower-volume exam category (e.g., Forest), the same disclaimer principle already established in `docs/Database.md` §9/§10 applies — a visible note ("Based on a smaller group of aspirants") rather than presenting a rank estimate with false confidence.

---

## 12. Study Time

**What it is:** a straightforward accounting of time actually invested — **not** a metric about performance, but about effort, giving the "am I putting in enough time" question its own honest answer separate from "am I doing well."

**Graph type:** a **vertical bar chart**, one bar per day over the last 1–4 weeks (toggleable), height representing total minutes studied that day (summed across Learn content consumption and Practice sessions) — the one graph in this module using vertical rather than horizontal bars, since time-series-by-day is the one case where a vertical, left-to-right chronological reading is more natural than a ranked horizontal list.

**Data source:** aggregated `timeTakenSeconds` from `Question Attempts`, plus tracked video/notes reading duration from the Learn module.

**Interaction:** tapping a specific day's bar shows a quick breakdown of what was studied that day (which subjects/topics) — a useful memory aid for a user trying to reconstruct "what did I actually cover this week."

---

## 13. Consistency

**What it is:** a **calendar-style contribution heatmap** (a GitHub-contributions-graph-style grid, one cell per day, shaded by whether/how much the user studied) — distinct from the Study Time bar chart (§12) in that its point is *presence and regularity* over a long stretch (months), not the exact minute-count of any single day.

**Graph type:** calendar grid heatmap, single-hue sequential shading (empty day = no fill, light-to-dark = increasing activity that day) — visually consistent with the topic-difficulty Heatmap's color logic (§7) so a user learns one shading convention that means "more" throughout the whole module, applied to two different underlying variables (accuracy in §7, activity in §13).

**Data source:** derived from `Profiles.streak` (`docs/Database.md` §4.1) and daily-aggregated activity presence from `Question Attempts`/Learn engagement.

**Why this belongs in Analytics, not just the Dashboard's streak badge:** the Dashboard's streak indicator (`docs/UI_Design_System.md` §37) shows the *current* streak count in the moment; this calendar view shows the **full historical pattern** — useful for a user reflecting on their preparation journey over months, especially valuable for the Divya persona tracking a multi-attempt Group 1 cycle.

---

## 14. AI Recommendation

**What it is:** the synthesis view that closes out the Analytics module — a short, plain-language card (not another chart) that reads the graphs above and produces a specific, actionable recommendation, e.g., *"Focus on Ancient History this week — your accuracy there is 20 points below your average, and it appears frequently in Group 1 Prelims papers."*

**Why this exists:** several of the graphs above (Weak Areas, the Heatmap, Speed) each surface a valid but partial signal; most users benefit from one synthesized, prioritized takeaway rather than being left to manually weigh five different charts against each other themselves — directly implementing the AI-personalization promise established across `docs/PRD.md` §10 and the AI Orchestration Service design in `docs/Architecture.md` §5.

**Generation:** produced by the AI Orchestration Service reading the same underlying `Analytics` document (not a separate data source) — the recommendation is explicitly traceable back to the specific graph(s) that justify it, and the card links directly to the supporting view (e.g., tapping the Ancient History recommendation above jumps straight to that topic's row in Subtopic Analytics, §4) so the recommendation never feels like an unexplained, opaque assertion.

**Refresh cadence:** regenerated on the same schedule as the underlying `Analytics` aggregation job, with its own `computedAt`/`promptVersion` stamp (`docs/Database.md` §4.8, `AI History`) for the same auditability reasons already established for every other AI feature in the platform.

**Empty/low-confidence state:** for a brand-new user without enough data yet, this card shows a calm placeholder ("Complete a few more practice sessions and we'll start giving you personalized recommendations here") rather than a generic or fabricated tip — never says something specific-sounding without genuine data behind it.

---

## How These Graphs Work Together

```
Overall Analytics (§1)
   → drills into → Subject (§2) → Topic (§3) → Subtopic (§4)
                                                    │
Accuracy (§5), Speed (§6), Heatmaps (§7) — three different lenses
   on the SAME underlying attempt data, each revealing a different pattern
                                                    │
Weak Areas (§8) / Strong Areas (§9) — the ranked, actionable summary
   of what those lenses collectively revealed
                                                    │
Expected Score (§10) / Rank Prediction (§11) — "so what does this mean
   for my actual exam outcome"
                                                    │
Study Time (§12) / Consistency (§13) — the effort side of the story,
   not just the performance side
                                                    │
AI Recommendation (§14) — synthesizes all of the above into one
   prioritized next action
```

---

## Recommendations

1. **Never let any graph on this screen show a number computed from too small a sample without an explicit disclaimer** — this principle recurs across Subject Analytics (§2), Expected Score (§10), and Rank Prediction (§11) specifically, and should be treated as a single, consistent platform-wide rule rather than three independent decisions.
2. **Keep Strong Areas (§9) a permanent, equally-weighted sibling to Weak Areas (§8), not a feature that gets deprioritized later** — the confidence-building rationale behind it is a persona-research finding, not a nice-to-have.
3. **Route every "insight" graph (Subtopic Analytics, Heatmaps, Weak Areas) to a direct action**, never leave a diagnostic view as a dead end — the "Study this topic" / "Practice these questions" links are what separate genuine decision support from vanity charts.
4. **Treat AI Recommendation (§14) as reading the same materialized `Analytics` data as every other graph on this screen, never a separately-sourced or separately-reasoned output** — this is what keeps the recommendation traceable and trustworthy rather than feeling like an opaque, disconnected AI opinion layered on top.

---

*End of Document.*
