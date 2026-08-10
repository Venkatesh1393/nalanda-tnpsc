# Nalanda TNPSC — Learn Module

| | |
|---|---|
| **Document Owner** | UX Design / Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UserJourney.md` Screen 6, `docs/InformationArchitecture.md` §7.1/§7.8, `docs/Database.md` §4.2–§4.4, and `docs/API.md` §3–§6/§10 as the structural and data authorities this document builds the screen-by-screen experience on top of |

### Scope Note

`docs/UserJourney.md` Screen 6 gave a single-screen summary of "Learn." This document is the **complete, screen-by-screen design of the entire Learn module**, following the full content-to-mastery journey a user actually takes: browsing the syllabus hierarchy down to a specific subtopic, consuming it (video or notes), applying it (Practice), saving it (Bookmarks), and having it resurface later at the right time (Revision) — the four downstream stages the earlier docs referenced but never fully connected into one story.

---

## Flow Overview

```
Subjects → Topics → Subtopics → Videos / PDF → Practice → Bookmarks → Revision
   │           │          │            │            │          │          │
   │           │          │            │            │          │          └─ Spaced-repetition
   │           │          │            │            │          │             resurfacing of
   │           │          │            │            │          │             everything below
   │           │          │            │            │          └─ Saved notes/questions/
   │           │          │            │            │             videos for later
   │           │          │            │            └─ "Practice this topic" handoff
   │           │          │            └─ Content consumption (choose either or both)
   │           │          └─ The atomic unit of content — where notes/video actually live
   │           └─ Groupings within a subject (e.g., "Physics" within General Science)
   └─ Top-level syllabus categories for the active exam goal
```

---

## 1. Subjects

**Purpose:** The entry point into the entire syllabus for the user's currently active exam goal — the first "which part of the syllabus am I looking at" decision.

**Layout & UI:** A grid of subject cards (e.g., for Group 4: Tamil, English, General Science, General Studies, Aptitude), each showing a small pictogram, the subject name in the user's chosen language, a topic count ("12 topics"), and a slim per-subject progress bar reflecting how much of that subject's syllabus has been marked complete.

**Content:** Sourced from the `Subjects` collection (`docs/Database.md` §4.2), filtered to the exam category the persistent exam-goal switcher (`docs/InformationArchitecture.md` recommendation #4) currently has active — a user with multiple exam goals sees a different subject grid per goal, never a merged, ambiguous list.

**Interactions:** Tapping a subject card navigates into Topics (§2). A search bar above the grid allows jumping directly to a topic/subtopic by name without descending through the hierarchy manually, for a returning user who already knows exactly what they want to review.

**Animations:** Cards fade-and-rise into view on load (staggered, `motion-base`), matching the same reveal pattern used throughout the product for card grids.

**Loading:** Skeleton subject cards (matching the exact card shape) while the list loads — never a bare spinner, per `docs/UI_Design_System.md` §26.

**Empty/Error states:** Effectively never empty for a valid exam goal (subjects are core reference data), but if content fails to load, a retry action is shown rather than a blank grid.

**Bookmarking:** Not applicable at the Subject level — bookmarking begins at the Subtopic level (§3), where actual content lives.

---

## 2. Topics

**Purpose:** The second level of the hierarchy — meaningful groupings within a subject (e.g., "Physics," "Chemistry," and "Biology" within "General Science").

**Layout & UI:** A vertical list (not a grid — topic names and their subtopic counts read better in a list at this density), each row showing the topic name, a subtopic count, and a per-topic completion indicator (a small ring or checkmark once fully complete).

**Content:** Sourced from the `Topics` collection (`docs/Database.md` §4.2), scoped to the selected Subject via `subjectId`.

**Interactions:** Tapping a topic row navigates into Subtopics (§3). A breadcrumb ("Learn > General Science") sits above the list, allowing a one-tap return to Subjects.

**Animations:** Rows fade in with a subtler, faster stagger than the Subjects grid (since this is a denser list, not a small set of hero cards) — `motion-fast` rather than `motion-base`.

**Loading:** Skeleton list rows while topics load.

**Empty/Error states:** A subject with genuinely no topics yet (a content-team gap, not a user error) shows a calm "More content coming soon for this subject" message rather than an unexplained empty list.

**Bookmarking:** Not applicable at the Topic level, same rationale as Subjects.

---

## 3. Subtopics

**Purpose:** The atomic unit of the syllabus hierarchy — the actual, specific thing a user studies (e.g., "Newton's Laws of Motion" within "Physics"). This is where content consumption and bookmarking genuinely begin.

**Layout & UI:** A vertical list of subtopic rows, each showing the subtopic name, small icons indicating what content is available for it (a video icon, a notes/PDF icon, or both — per `docs/Database.md` §4.2's `Videos`/`Study Materials` collections both referencing the same `subtopicId`), a bookmark icon (outline when unbookmarked, filled when saved), and a completion checkmark once the user has engaged with it.

**Content:** Sourced from the `Subtopics` collection, scoped via `topicId`.

**Interactions:** Tapping a subtopic row opens its content — if both a video and notes exist, the subtopic expands to show both as separate entry points (Video, §4; PDF/Notes, §5) rather than forcing a single default choice on the user. Tapping the bookmark icon directly from this list saves the subtopic without needing to open it first — a fast-path for a user skimming ahead and marking things to return to later.

**Animations:** Bookmark icon fill/unfill uses a quick, satisfying `motion-instant` toggle (a small scale-pulse on save, consistent with the low-emphasis feedback treatment specified for bookmark actions in `docs/UI_Design_System.md` §36's restraint principle — this is a light, frequent action, not a milestone, so it never uses celebratory motion).

**Loading:** Skeleton list rows, identical pattern to Topics.

**Empty/Error states:** A subtopic with no content yet is shown but visually muted (grayed icons) rather than hidden — preserving the syllabus's completeness so a user can see the full scope of what's coming, even before every piece of content is published.

**Bookmarking:** Fully supported here — this is the first level where `POST /bookmarks` (`docs/API.md` §10, `contentType: "study_material"` or `"video"`) is actually invoked.

---

## 4. Videos

**Purpose:** Short-form video lessons for a subtopic — the preferred content format for the visual, example-driven learning style identified for personas like Priya (`docs/UserPersonas.md`).

**Layout & UI:** A standard video player (play/pause, scrub bar, playback-speed control, fullscreen toggle) with the subtopic title above it, a language toggle if a Tamil/English transcript or dubbed variant exists, and a **"Ask AI to explain this differently"** action beneath the player — a direct handoff into the platform's AI Explanation capability (`docs/PRD.md` §10, Feature 4) for a user who watched the video and still has a doubt.

**Content:** Sourced from the `Videos` collection (`docs/Database.md` §4.2), streamed via the Cloudinary-hosted asset referenced by `cloudinaryAssetId`.

**Interactions:** Standard playback controls; a "Mark as Watched" state is set automatically once a sufficient portion of the video has played (not requiring a separate manual tap for the common case, though a manual override remains available for a user who wants to mark it complete without watching in full — e.g., a returning user reviewing something they already know).

**Animations:** Standard player-chrome fade-in-on-load; no bespoke animation beyond the platform's standard loading/skeleton treatment for the player frame itself.

**Loading:** A buffering spinner within the player frame if the video hasn't finished downloading enough to play — deliberately data-usage-conscious (no autoplay-at-full-resolution-by-default on mobile data, per `docs/UI_Design_System.md`'s low-bandwidth principles), with a lower-resolution default on detected slow connections.

**Empty/Error states:** Playback failure (network drop, unsupported format) shows a clear retry action and, where the same subtopic also has notes available, a direct link to switch to the Notes/PDF view (§5) as an alternative rather than leaving the user stuck.

**Bookmarking:** A bookmark icon within the player's chrome bookmarks this specific video (distinct bookmark entry from the subtopic-level bookmark in §3, though both resolve to the same underlying subtopic when surfaced later in Bookmarks, §7).

---

## 5. PDF / Notes

**Purpose:** Text-based study material for a subtopic — the format preferred by users who want dense, scannable, re-readable content (e.g., Karthik reviewing during a commute, or Divya cross-referencing detailed notes while writing practice answers).

**Layout & UI:** A clean, generously-spaced reading view (content capped at a comfortable reading width per `docs/UI_Design_System.md` §30, even on wide desktop screens), rendered in the user's selected language with a per-note language toggle available if a bilingual version exists, a **"Download PDF"** action (shown with the tier-gated lock treatment, `docs/UI_Design_System.md` §36, if the specific note is Plus/Pro-gated per `docs/Database.md` §4.2's `isPremium` flag), and the same **"Ask AI to explain this differently"** action available on the Video screen.

**Content:** Sourced from the `Study Materials` collection.

**Interactions:** Standard scroll reading; reading-position/progress is tracked so a long note can be resumed exactly where the user left off on a return visit, per the edge case already identified in `docs/UserJourney.md` Screen 6.

**Animations:** Text renders in with a simple fade (`motion-fast`); no distracting entrance animation for what is fundamentally a reading-focused screen.

**Loading:** Skeleton text-line blocks (varying width, mimicking real paragraph rhythm, per `docs/UI_Design_System.md` §26) while the note loads.

**Empty/Error states:** If the Tamil version of a very recently published note isn't ready yet, the screen falls back to English with a small, honest inline note ("Tamil version coming soon") rather than showing broken or missing text — the exact behavior already specified in `docs/UserJourney.md` Screen 6.

**Bookmarking:** A bookmark icon in the note's header, identical mechanism to the Video screen.

---

## 6. Practice

**Purpose:** The handoff from passive content consumption to active application — closing the loop that makes "Learn" meaningfully different from just reading a textbook.

**Layout & UI:** Not re-designed in full here — Practice is already completely specified as its own module in `docs/UserJourney.md` Screen 7. What this document adds is the **specific handoff behavior when arriving from Learn**: a "Practice This Topic" button is present on every Subtopic (§3), Video (§4), and Notes (§5) screen, and tapping it starts a `practice/sessions` request (`docs/API.md` §6) **pre-filtered to exactly the subtopic/topic just studied**, rather than a generic, unfiltered practice session.

**Interactions:** On completing the resulting practice session, the user is returned not to the generic Practice module home, but back into the Learn hierarchy at the same subtopic, with its completion state now updated based on practice performance — reinforcing the sense that Learn and Practice are one continuous loop, not two disconnected modules the user has to manually stitch together themselves.

**Animations, Loading, Errors:** Inherited entirely from the Practice module's own specification (`docs/UserJourney.md` Screen 7) — no new behavior is introduced by the handoff itself beyond the pre-filtering described above.

---

## 7. Bookmarks

**Purpose:** A durable, cross-module save mechanism — everything a user bookmarks while moving through Subjects → Topics → Subtopics → Videos/PDF (and, separately, while practicing questions or reading Current Affairs) collects into one place they can return to.

**Layout & UI:** A dedicated Bookmarks screen (`docs/InformationArchitecture.md` §7.8) listing saved items as cards, each showing a content-type icon (note/video/question/current-affairs), a title/preview, and the date it was saved — with filter tabs at the top ("All," "Notes," "Videos," "Questions," "Current Affairs") so a large bookmark collection stays navigable.

**Content:** Sourced from the `Bookmarks` collection (`docs/Database.md` §4.4) via `GET /bookmarks` (`docs/API.md` §10) — a **pure index**, never a duplicated copy of the underlying content (per the recommendation in `docs/Database.md` §10): tapping any bookmark card deep-links back to the live, current version of that note, video, or question inside its originating module, so a bookmark never goes stale even if the underlying content is later updated.

**Interactions:** A personal note/annotation can be added to any bookmark (`PATCH /bookmarks/{bookmarkId}`) — useful for a user who wants to remember *why* they saved something ("re-read before the exam," "still confused about this part"). Swipe-to-remove (mobile) or a hover-revealed remove icon (desktop) deletes a bookmark.

**Animations:** Standard card list fade-in on load; removing a bookmark animates the card collapsing out of the list (`motion-fast`) rather than an abrupt disappearance.

**Loading:** Skeleton bookmark cards while the list loads; paginated loading (per `docs/API.md` §10) for users with a large collection.

**Empty/Error states:** A brand-new user with no bookmarks yet sees a designed empty state (`docs/UI_Design_System.md` §24) — a short encouraging line ("Nothing bookmarked yet") plus a direct "Browse Topics" action routing back into Subjects (§1), closing the loop for a user who landed here first out of curiosity.

---

## 8. Revision

**Purpose:** The module that actually makes bookmarking and past practice performance *useful* over time — a dedicated, AI-driven spaced-repetition view that resurfaces the right saved content at the right moment, rather than leaving a growing Bookmarks list to become a forgotten archive (`docs/PRD.md` §10, Feature 10 — the Smart Revision Scheduler).

**Layout & UI:** A single, prioritized daily queue (not a raw chronological bookmark list) — a card stack or list ordered by the spaced-repetition algorithm's own priority, mixing bookmarked notes, previously incorrectly-answered questions, and relevant current-affairs entries into one coherent "what to revisit today" session, with a visible count ("6 items for today's revision").

**Content:** Computed server-side by the Smart Revision Scheduler, drawing from `Bookmarks` (§7), `Question Attempts` where `isCorrect: false` (`docs/Database.md` §4.3), and `Current Affairs` relevance tags (`docs/Database.md` §4.5) — never a naive "show everything ever bookmarked," which would become overwhelming and directly undermine the point of spaced repetition.

**Interactions:** Each item in the queue can be marked "Got it" (removes it from the near-term queue, schedules a longer-interval future resurfacing) or "Still unsure" (keeps it in a shorter-interval rotation) — a simple two-state self-assessment per item, deliberately lighter-weight than a full re-quiz for every single revision item, keeping a daily revision session fast enough to actually complete.

**Animations:** Completing an item (either response) triggers a quick card-dismiss transition (slide-out, `motion-fast`) revealing the next item beneath it — a satisfying, momentum-building rhythm appropriate for a routine daily habit, though intentionally short of the stronger celebratory treatment reserved for genuine milestones (`docs/UI_Design_System.md` §19/§32) elsewhere in the product; finishing the entire day's queue, however, **does** warrant a brief `motion-celebratory` completion moment, since "cleared today's revision" is a genuine, countable daily achievement worth acknowledging.

**Loading:** A brief "Preparing today's revision..." labeled state (not a bare spinner) while the scheduler computes the day's queue — consistent with the platform's standard treatment for any AI/algorithm-driven, non-instant computation.

**Empty/Error states:** A user with nothing due for revision yet (too new to the platform, or genuinely caught up) sees a calm, positive empty state ("Nothing due for revision today — keep learning and we'll bring the right things back at the right time") rather than an empty, uninviting screen that reads as a dead end.

---

## How This All Connects

The eight stages above are not eight independent features — they are one continuous loop:

```
Browse (Subjects → Topics → Subtopics)
   → Consume (Videos / PDF)
       → Apply (Practice, filtered to what was just consumed)
           → Save (Bookmarks, for anything not yet fully mastered)
               → Resurface (Revision, at the right spaced interval)
                   → back into Practice/Consume as needed, until mastered
```

This closed loop — not any single screen in isolation — is what should be evaluated when assessing whether the Learn module is working: a healthy signal is content moving *through* Bookmarks and Revision toward eventual mastery (removal from the active revision queue), not an ever-growing, never-revisited Bookmarks list.

---

## Recommendations

1. **Never let Bookmarks become a second, stale copy of content.** Every bookmark card must deep-link to live content, per the design already established in `docs/Database.md` §10 — this document reinforces that principle specifically at the point where it matters most (a bookmarked note whose underlying content has since been revised by the content team).
2. **Keep the Revision queue's daily size bounded and honest.** A queue that regularly shows 40+ items will be abandoned; the scheduler should cap and prioritize rather than surface everything technically "due" — a smaller, genuinely completable daily queue sustains the habit better than full algorithmic completeness.
3. **Reserve the completion celebration in Revision (§8) for finishing the full daily queue, not for individual items** — applying celebratory motion per-item would cheapen it within minutes of daily use, exactly the failure mode `docs/UI_Design_System.md` §32 warns against.
4. **Build the "Practice This Topic" pre-filtered handoff (§6) before treating Learn and Practice as separately shippable features** — the connective tissue between them is a meaningful part of what differentiates Nalanda from a static content library like Winmeen (per `docs/CompetitorAnalysis.md`), not an optional polish pass to add later.

---

*End of Document.*
