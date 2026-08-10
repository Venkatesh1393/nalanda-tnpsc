# Nalanda TNPSC — Onboarding Experience

| | |
|---|---|
| **Document Owner** | UX Design / Interaction Design |
| **Status** | Draft v1.0 (canonical) |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/Onboarding_Personalization_Flow.md` as the immediate prior draft this document refines, `docs/API.md` §12 as the backend this flow feeds, and `docs/UI_Design_System.md`/`docs/Landing_Page_Design.md` §6 for AI-moment visual continuity |

### Relationship to `docs/Onboarding_Personalization_Flow.md`

That document specified five steps (Language → Exam → Study Hours → Target Month → Weak Subjects) ending in a brief loading transition into the Dashboard. This document is the **refined, canonical version**: it reorders Target ahead of Study Hours per this request, and — most importantly — treats **"Generate AI Study Plan" as its own full screen** with real design attention, not a passing loading message. The step-level mechanics (progress indicator, back navigation, skip rules, state persistence) established in that earlier document still apply throughout and are not re-derived here; this document focuses on explaining each screen.

---

## Flow Overview

```
Choose Language (Tamil / English / Both)
        ↓
Choose Exam
        ↓
Choose Target
        ↓
Choose Study Hours
        ↓
Choose Weak Subjects
        ↓
Generate AI Study Plan
        ↓
Dashboard
```

---

## Screen 1 — Choose Language

**Purpose:** The very first decision a new user makes, because it determines what language every subsequent screen — including the rest of this onboarding sequence — is rendered in.

**Layout & UI:** Two large, equally-weighted primary cards — **தமிழ்** and **English** — centered on the screen, with a third, visually secondary option beneath them: **Both / Bilingual**. Bilingual is deliberately presented as a considered third choice rather than ranked equally with the two primary languages, since most users arrive with a clear preference and forcing an artificial three-way tie would slow down the fastest possible start to onboarding.

**Options:** Tamil, English, Both — single-select, tapping any option immediately proceeds (no separate "Continue" button on this screen, since the tap itself is the complete, unambiguous action).

**Animations:** The selected card scales up slightly and its border shifts to the brand primary color before the screen transitions forward — a quick, confirming flash rather than a lingering state, since the screen is about to change anyway.

**Loading:** None — this is a pure client-side preference with no backend dependency at this point.

**Validation & Errors:** None possible — every option is always valid, and there is no way to proceed without making a choice, so no error state exists.

---

## Screen 2 — Choose Exam

**Purpose:** Capture which TNPSC exam category (or categories) the user is preparing for — the input that shapes everything else the user will see, from syllabus to question bank to mock tests.

**Layout & UI:** A grid of tappable cards, one per exam category (Group 1, Group 2, Group 2A, Group 4, VAO, Police, Forest, TRB), each showing a simple, dignified pictogram and the exam's name. Multi-select is supported directly on the cards — no separate checkboxes.

**Options:** Any combination of the eight exam categories; at least one must be selected. Selecting several triggers a small, friendly note reassuring the user that Nalanda will help them focus, rather than penalizing the choice.

**Animations:** Selected cards fill with a soft brand-tinted background and colored border on tap — quick and responsive, since users often tap through several options while deciding.

**Loading:** None — the exam list is fixed reference data, available instantly.

**Validation & Errors:** "Continue" stays visibly present but disabled until at least one exam is selected, with a quiet helper line beneath it ("Select at least one exam to continue") rather than a jarring error message.

---

## Screen 3 — Choose Target

**Purpose:** Establish an approximate exam timeframe so the eventual AI study plan can be paced correctly — an aggressive daily plan for someone testing in six weeks looks very different from a relaxed one for someone testing in eight months.

**Layout & UI:** A row of selectable month chips covering roughly the next 12 months, plus a first-class **"I'm not sure yet"** option shown with the same visual prominence as the month chips — never hidden as a small afterthought link, since genuine uncertainty about the exact TNPSC notification timeline is the norm, not the exception, for most aspirants.

**Options:** A specific month, or "Not sure yet." Only future months are ever shown as selectable — past months are simply absent from the list rather than present and rejected.

**Animations:** Standard card-selection highlight on tap; choosing "Not sure yet" surfaces a brief, warm inline reassurance ("No problem — we'll set a flexible pace and adjust once your exam is officially announced") so the choice feels acknowledged rather than silently accepted.

**Loading:** None.

**Validation & Errors:** A selection (either a month or "Not sure yet") is required before continuing; there is no invalid state to reach given the design already excludes impossible choices from the list.

---

## Screen 4 — Choose Study Hours

**Purpose:** Capture how much daily time the user can realistically dedicate to preparation, directly setting the ambition level of the daily tasks the AI will generate.

**Layout & UI:** Four preset cards rather than a slider or a numeric entry field — **"Less than 1 hour," "1–2 hours," "2–4 hours," "4+ hours"** — chosen because most aspirants think in rough bands, not exact numbers, and presets are faster and easier to tap accurately than dragging a slider, especially on a smaller phone screen.

**Options:** Exactly one of the four bands; selecting one proceeds immediately.

**Animations:** Standard single-select card highlight; choosing a new option smoothly deselects the previous one rather than allowing two to appear selected at once.

**Loading:** None.

**Validation & Errors:** None reachable — a required single-select with immediate advance has no invalid or error state.

---

## Screen 5 — Choose Weak Subjects

**Purpose:** Give the AI an immediate, honest starting signal about where to focus early attention, without forcing a full timed diagnostic test before the user has even reached their Dashboard.

**Layout & UI:** A multi-select list of subjects relevant to whichever exam(s) were chosen in Screen 2 (e.g., Tamil, English, General Science, General Studies, Aptitude for Group 4), framed with the simple prompt **"Which of these do you find hardest?"**

**Options:** Any number of subjects, including none at all — this is the one screen in the entire onboarding sequence where zero selections is a completely valid, unpenalized outcome, since a user genuinely unsure of their weak areas shouldn't be blocked from continuing.

**Animations:** Standard multi-select toggle behavior, matching Screen 2's interaction pattern for consistency.

**Loading:** None — the subject list is derived instantly from the exam choice already made, with no additional backend call needed.

**Validation & Errors:** None — "Continue" is always enabled on this screen regardless of how many (or how few) subjects are selected.

---

## Screen 6 — Generate AI Study Plan

**Purpose:** This is the payoff moment of the entire onboarding sequence — the first time the user actually *sees* the AI capability the platform promised back in the Hero section (`docs/Landing_Page_Design.md` §6) at work, using their own just-entered information. Getting this screen right matters disproportionately: a bare spinner here would waste the single best opportunity in the whole product to make "AI-powered" feel real rather than like marketing language.

**Layout & UI:** The same glowing, non-anthropomorphic AI Assistant form introduced in the Hero section (`docs/Landing_Page_Design.md` §6) reappears here, centered on the screen — deliberate visual continuity, so the user recognizes "this is the same AI I saw on the way in, and now it's working for me specifically." Beneath it, a single line of **status copy that updates every 1.5–2 seconds**, cycling through a short, honest sequence reflecting what's actually happening: "Understanding your goal..." → "Mapping your syllabus..." → "Balancing your weak subjects..." → "Finalizing your first week..." — never generic, interchangeable filler text, and never claiming a step that isn't genuinely part of the generation process.

**Animations:** The AI Assistant form uses its established slow breathing-pulse animation (`docs/Landing_Page_Design.md` §6), now slightly more active/faster-cycling than its calm Hero-section idle state, to visually signal "actively working" rather than "waiting." Each status-copy update cross-fades to the next line (`motion-fast`) rather than abruptly swapping, keeping the sequence feeling like one continuous process rather than a series of disconnected messages.

**Loading:** This is fundamentally a loading screen, but deliberately never presented as a bare spinner — per the loading-state principle already established in `docs/UI_Design_System.md` §25 and `docs/UserJourney.md`, a longer or unpredictable-duration operation (this one genuinely involves a real AI generation call, per `docs/Architecture.md` §5 and `POST /study-plans`, `docs/API.md` §12) always gets a labeled, reassuring state instead. If generation takes longer than the status-copy sequence's natural length, the sequence gently loops on its final message ("Finalizing your first week...") rather than stalling on a frozen line or reverting to a generic "please wait."

**Validation & Errors:** No user input occurs on this screen, so no field-level validation applies. If the AI service is unavailable or the request fails (`AI_SERVICE_UNAVAILABLE`, per `docs/API.md` §12), the screen transitions to a calm fallback state: the AI Assistant form dims slightly, and a clear message appears — "We couldn't build your personalized plan just now — you can start with a general syllabus instead, and we'll personalize it as soon as we can" — paired with a **Continue with General Plan** button and a **Try Again** option. The user is never blocked from reaching their Dashboard by an AI outage; a sensible default (unpersonalized) syllabus view is always the fallback, consistent with the platform's broader principle of graceful degradation over hard failure.

---

## Handoff — Dashboard

Once the plan is generated (or the graceful fallback is accepted), the screen transitions directly into the Dashboard — already fully specified in `docs/UserJourney.md` Screen 5 and not repeated here. The transition itself uses a single confident fade (`motion-base`), closing the AI Assistant moment cleanly rather than lingering.

---

## Recommendations

1. **Never let Screen 6's status-copy sequence feel fake.** Each line should correspond to a real phase of the actual backend generation process (`docs/Architecture.md` §5's AI orchestration flow) — if the underlying process is ever simplified to a single API call with no distinguishable phases, the copy sequence should be simplified accordingly rather than kept as decorative theater over a process that no longer matches it.
2. **Keep the AI Assistant form visually identical (same glowing orb, same color treatment) between the Hero section and this screen.** The continuity is what makes this screen land — introducing a different-looking "loading AI" visual here would break the promise made at first contact.
3. **Treat the "Continue with General Plan" fallback as a fully legitimate path, not a degraded error state to be ashamed of.** Some users will always hit this during an AI outage; the copy and visual tone should stay calm and confident, never apologetic in a way that undermines trust in the platform's reliability.
4. **Resolve the ordering difference from `docs/Onboarding_Personalization_Flow.md`** (Target now precedes Study Hours) as a deliberate update going forward — this document's ordering is the one to build against.

---

*End of Document.*
