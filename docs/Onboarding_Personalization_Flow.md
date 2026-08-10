# Nalanda TNPSC — Onboarding Personalization Flow

| | |
|---|---|
| **Document Owner** | UX Design / Interaction Design |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UserJourney.md` Screen 4 (Choose Exam) as the screen this expands, `docs/API.md` §12 (Study Planner APIs) as the backend this flow feeds, and `docs/UI_Design_System.md` for all visual/motion tokens |

### Scope Note

`docs/UserJourney.md` Screen 4 originally bundled exam selection, target date, and study-hour availability into a single "Choose Exam" screen. This document **breaks that into a proper five-step wizard** — Language → Exam → Study Hours → Target Month → Weak Subjects — giving each input its own focused moment, and adds a genuinely new step (**Weak Subjects**) that wasn't previously specified. The output of all five steps is what `POST /study-plans` (`docs/API.md` §12) consumes to generate the user's first AI study plan. The **Dashboard** itself is not re-specified here — it is already fully designed in `docs/UserJourney.md` Screen 5; this document ends at the handoff.

---

## 1. Flow Overview

```
┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐   ┌───────────────┐   ┌───────────┐
│ Language  │ → │  Exam    │ → │ Study Hours │ → │ Target Month │ → │ Weak Subjects  │ → │ Dashboard │
│ (Step 1/5)│   │(Step 2/5)│   │ (Step 3/5)  │   │ (Step 4/5)   │   │ (Step 5/5)     │   │           │
└──────────┘   └──────────┘   └────────────┘   └──────────────┘   └───────────────┘   └───────────┘
```

**Why five steps instead of one form:** each input benefits from full-screen focus and immediate visual confirmation before moving on — a single dense form asking for language, exam, hours, date, and weak subjects all at once would read as a bureaucratic intake form, exactly the tone `docs/UI_Design_System.md`'s brand thesis explicitly rejects. A wizard also lets the AI Study Plan Generator receive fully-formed, validated inputs at the end rather than a form's worth of partially-completed fields.

**Where this sits in the broader journey:** immediately after OTP verification (`docs/OTP_Flow.md`) or Google sign-in (`docs/Registration_Flow.md`), before first reaching the Dashboard — this is the *only* wizard a new user encounters before entering the product proper.

---

## 2. Wizard-Wide Mechanics (Apply to All Five Steps)

- **Progress indicator:** a slim, segmented progress bar at the top of every step ("Step 2 of 5"), filling left-to-right — gives the user a concrete sense of remaining effort, directly addressing the price-sensitive, low-patience persona research (Priya) that penalizes any signup flow feeling open-ended.
- **Back navigation:** every step (except Step 1) shows a "Back" text link, returning to the previous step with all previously entered values still intact — no step ever discards prior input on back-navigation.
- **Forward navigation:** a single primary "Continue" button per step, disabled until that step's minimum valid input is provided (validation rules per step below) — auto-advancing on selection is used only where explicitly noted (Language, §3).
- **Skip-ability:** Steps 4 (Target Month) and 5 (Weak Subjects) support an explicit **"Skip for now"** path (never Steps 1–3, which are required for the platform to function meaningfully at all) — both are fully revisitable later from Settings/Dashboard, so skipping here is never a permanent forfeiture.
- **State persistence across steps:** all entered values are held in local wizard state and only submitted to the backend as one combined payload upon reaching the Dashboard handoff (§8) — a user who abandons mid-wizard and returns later resumes from their last completed step rather than restarting from Step 1.
- **Animation baseline:** every step-to-step transition uses a consistent horizontal slide (current step slides out left, next step slides in from right, `motion-base`, per `docs/UI_Design_System.md` §19) — Back navigation reverses the direction (slide out right, in from left), giving the whole wizard a spatial, "moving along a path" feel rather than a series of disconnected screens.

---

## 3. Step 1 — Language

**Purpose:** Establish the language every subsequent step (and the entire product) renders in — placed first because it must apply to this very wizard's own copy going forward, not just to the eventual Dashboard.

**Layout:** Two large, equally-weighted option cards — "தமிழ்" and "English" — plus a smaller third option, "Both / Bilingual," presented as a lower-emphasis third choice beneath the two primary cards (most users have a clear preference; bilingual is a deliberate secondary option, not force-ranked equally, per `docs/UI_Design_System.md`'s bilingual-dignity principle — this is about respecting a genuine preference, not defaulting anyone to a lesser experience).

**Validations:** Exactly one selection required; "Continue" is otherwise disabled — this is the one step in the wizard where the primary action is the selection itself, so most implementations auto-advance immediately on tap rather than requiring an additional "Continue" press, since there's nothing else to confirm on this step.

**Animations:** Selected card scales up very slightly (~1.02×) and its border shifts to `primary-600` (`motion-fast`) before the auto-advance transition fires.

**Loading:** None — a pure client-side selection with no backend round-trip at this step.

**Errors:** None possible.

---

## 4. Step 2 — Exam

**Purpose:** Capture the user's target exam category (or categories) — the single most consequential input in this wizard, since it determines the entire content scope (syllabus, question bank, mock tests) the user will see from this point forward.

**Layout:** A grid of exam-category cards (Group 1, Group 2, Group 2A, Group 4, VAO, Police, Forest, TRB), each with its dedicated pictogram (`docs/UI_Design_System.md` §23) and short name — multi-select toggle cards, not checkboxes, so the primary interaction is a direct tap on the card itself.

**Validations:** At least one exam required before "Continue" enables; no upper limit is enforced, but selecting more than three triggers a gentle, non-blocking inline note ("Preparing for many exams at once? We'll help you focus one at a time on your Dashboard") — informational, never a hard cap, since a genuinely multi-exam aspirant (e.g., Group 2 and Police simultaneously) is a real, valid case.

**Animations:** Selected cards get the standard selected-state treatment (`primary-100` background fill, `primary-600` border, per `docs/UI_Design_System.md` §14) with a quick `motion-instant` toggle feel on tap — deliberately snappy, since this screen often involves several quick taps in a row as a user explores options.

**Loading:** None — exam category list is static reference data, pre-loaded before the wizard begins rather than fetched per-step.

**Errors:** None beyond the soft "select at least one" validation state on the disabled Continue button (no separate error message needed — a disabled button with a subtle helper caption beneath it, "Select at least one exam to continue," is sufficient and non-alarming).

---

## 5. Step 3 — Study Hours

**Purpose:** Capture realistic daily study-time availability — the key input that determines how ambitious or gentle the AI-generated daily task list will be (`docs/PRD.md` §10, Feature 1).

**Layout:** Four large preset option cards rather than a numeric slider — **"Less than 1 hour," "1–2 hours," "2–4 hours," "4+ hours"** — chosen deliberately over a slider because presets are faster to select, more accessible on a small mobile touch target, and avoid the false precision of asking a busy, uncertain user to pinpoint an exact number (a working-professional persona like Karthik genuinely doesn't have a precise daily figure, only a rough band).

**Validations:** Exactly one preset required; auto-advances on selection (identical rationale to Step 1 — a single clean choice with nothing further to confirm on this screen).

**Animations:** Same selected-card treatment as Step 2, single-select instead of multi-select (selecting a new card visually deselects the previous one with a quick cross-fade, `motion-instant`).

**Loading:** None.

**Errors:** None — a required single-select with auto-advance has no invalid state to reach.

---

## 6. Step 4 — Target Month

**Purpose:** Capture an approximate exam timeframe so the AI Study Plan Generator can pace the daily task list appropriately (a plan built for "3 months away" looks very different from one built for "not sure yet").

**Layout:** A month/year picker (not a full calendar date-picker — TNPSC notifications specify exam windows, not exact days, months ahead of time, so asking for a precise date would manufacture false precision the user likely doesn't have) presenting the next 12 months as selectable chips, plus a clearly first-class **"I'm not sure yet"** option presented with equal visual weight to the month chips, not as a small, apologetic link beneath them — this directly reflects the genuine, common uncertainty already identified in `docs/UserJourney.md` Screen 4's edge cases.

**Validations:** Either a month selection or the "not sure yet" option is required to enable Continue; no past months are shown as selectable options at all (rather than being shown and then rejected on selection — removing the invalid choice from the UI entirely is a stronger validation pattern than allow-then-error).

**Animations:** Standard card-selection treatment; selecting "I'm not sure yet" triggers a brief, reassuring inline confirmation beneath the options ("No problem — we'll set a flexible pace and adjust as your exam date is announced") rather than silently accepting the choice with no acknowledgment.

**Loading:** None.

**Errors:** None reachable given the past-months-are-simply-not-shown design.

---

## 7. Step 5 — Weak Subjects

**Purpose:** Give the AI Study Plan Generator an immediate, low-friction starting signal about where to weight early study time, without forcing every new user through a full timed diagnostic test before they've even reached the Dashboard — a deliberate trade-off favoring onboarding speed over diagnostic precision at this exact moment.

**Layout:** A multi-select list of subjects relevant to the exam(s) chosen in Step 2 (e.g., for Group 4: Tamil, English, General Science, General Studies, Aptitude), each presented as a simple toggle chip with the prompt **"Which of these do you find hardest?"** — a self-reported signal, not a scored test.

**Validations:** This step allows **zero selections** to be valid (a user who genuinely doesn't yet know their weak areas shouldn't be blocked) — "Continue" is always enabled here, distinguishing it from Steps 2 and 3 where a minimum selection is enforced.

**Animations:** Standard multi-select toggle treatment (identical to Step 2); no additional flourish, since this step's job is quick, honest self-assessment, not persuasion.

**Loading:** None — the subject list for this step is derived instantly, client-side, from the exam selection already made in Step 2 (no additional backend round-trip needed to populate it).

**Errors:** None.

**Note on precision vs. speed:** this self-reported signal is intentionally treated as a *starting point*, not a final answer — once the user begins taking quizzes and mock tests, the platform's actual analytics engine (`docs/Database.md` §4.4, `docs/API.md` §7) supersedes this initial guess with real, evidence-based weak-area detection within days. A more rigorous, timed diagnostic quiz remains available as an **optional, later action from the Dashboard** for users who want a more precise starting analysis — it is deliberately not forced into this first-touch wizard, where speed matters more (directly informed by the PRD's own user-journey "Diagnostic" stage being framed as an optional early step, not a mandatory gate).

---

## 8. Handoff — Dashboard

Upon completing (or skipping through) all five steps, the wizard's collected state is submitted as a single combined payload — feeding both `PATCH /profile/exam-goals` (exam selection, target month) and `POST /study-plans` (`docs/API.md` §11–§12) in sequence. A brief, reassuring transition state (**"Building your personalized plan..."**, consistent with the loading-state pattern already established in `docs/UserJourney.md` Screen 4) bridges the wizard's final step and the Dashboard's first render — the Dashboard screen itself, its layout, empty states, and loading behavior are already fully specified in `docs/UserJourney.md` Screen 5 and are not repeated here.

---

## 9. Validation Summary

| Step | Minimum Required | Can Skip? | Auto-Advances? |
|---|---|---|---|
| 1. Language | Exactly one selection | No | Yes |
| 2. Exam | At least one exam | No | No (multi-select, explicit Continue) |
| 3. Study Hours | Exactly one preset | No | Yes |
| 4. Target Month | A month, or "Not sure yet" | Effectively (via "Not sure yet") | No |
| 5. Weak Subjects | None — zero selections valid | Yes (Continue always enabled) | No |

---

## 10. Animation Summary

| Moment | Treatment |
|---|---|
| Step-to-step forward transition | Horizontal slide, current exits left, next enters right (`motion-base`) |
| Back navigation | Same slide, reversed direction |
| Single-select auto-advance (Steps 1, 3) | Selected-state flash (`motion-fast`) immediately followed by the forward slide |
| Multi-select toggle (Steps 2, 5) | Quick `motion-instant` fill/border toggle per card tap |
| "Not sure yet" confirmation (Step 4) | Brief inline fade-in reassurance text, no page-level animation |
| Final handoff to Dashboard | The same "Building your personalized plan..." loading treatment already specified in `docs/UserJourney.md` Screen 4 — not a new animation invented here |

---

## 11. Loading States Summary

| Step | Loading Behavior |
|---|---|
| 1–5 (all step-local interactions) | None — every step's options are static or derived client-side; no per-step backend round-trip |
| Final submission (wizard → Dashboard) | Single combined loading state during the AI study-plan generation call — the only network-bound wait in the entire flow |

---

## 12. Error Handling Summary

| Scenario | Handling |
|---|---|
| Final submission network/AI-service failure | The wizard's collected state is preserved client-side; the user sees a clear retry prompt ("Couldn't build your plan — try again") rather than being sent back through all five steps |
| User abandons mid-wizard, returns later | Resumes from the last completed step, not Step 1 — no re-entry of already-provided information |
| Exam selection changed after Step 2, affecting Step 5's subject list | If a user uses Back to revise Step 2 after already completing Step 5, Step 5's selections are re-validated against the new exam's subject list and any now-irrelevant selections are cleared with a brief inline note, rather than silently carrying over mismatched subjects |

---

## 13. Recommendations

1. **Keep Steps 1 and 3 auto-advancing.** They are genuinely single, unambiguous choices — adding a redundant "Continue" tap after an obviously final selection would slow down the fastest-moving part of the wizard for no benefit.
2. **Never make Step 5 (Weak Subjects) mandatory**, even as the product matures — its entire value is as a fast, optional signal; requiring it would reintroduce the friction this document deliberately designed around, and the real analytics engine supersedes it within days regardless.
3. **Surface the optional, deeper diagnostic quiz (mentioned in §7) from the Dashboard's empty state for brand-new users**, not from within this wizard — keeping the two experiences (fast onboarding vs. thorough diagnostic) cleanly separated rather than blurring them into one longer wizard.
4. **Reuse this exact five-step wizard, unmodified, for any future "change my exam goal" flow reached from Settings** (`docs/InformationArchitecture.md` §7.5) — a returning user editing their exam goal should recognize the same interaction pattern rather than encountering a differently-designed edit form.

---

*End of Document.*
