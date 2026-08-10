# Nalanda TNPSC — UI Design System

| | |
|---|---|
| **Document Owner** | Design Systems |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`: `PRD.md`, `CompetitorAnalysis.md`, `UserPersonas.md`, `UserJourney.md`, `InformationArchitecture.md`, `Architecture.md`, `FolderStructure.md`, `Database.md`, `API.md`, `Authentication.md` |
| **Design Mandate** | A design language that reads as materially more premium and considered than Vetri App and every other reviewed competitor — never gaudy, never generic ed-tech, never childish. |

### Design Thesis

`docs/CompetitorAnalysis.md` found that Vetri App presents a "clean, modern, dashboard-style" marketing surface but has no independently verified depth of craft, no gamification, and no distinctive visual identity beyond generic SaaS polish. Every other competitor is visually dated (Winmeen), utilitarian (Shankar IAS, Dexter Academy), or a cluttered multi-exam storefront (Adda247, Testbook). This is genuine whitespace: **no competitor in this category has invested in design as a trust signal.**

Nalanda's design language borrows a specific, deliberate slice from each reference system, not their surface aesthetics wholesale:

| Reference | What Nalanda Takes From It |
|---|---|
| **Apple** | Restraint, generous whitespace, typographic hierarchy as the primary design tool, materials (blur/depth) used sparingly and meaningfully |
| **Stripe** | Precision in data-dense UI (numbers, tables, financial state), confident use of gradient as an accent rather than a background, technical credibility |
| **Linear** | Speed-first interaction feel, keyboard/command affordances, exceptional dark mode, minimal chrome around content |
| **Notion** | Calm, warm neutrals for long-form content (Learn module), flexible block-like content layout, approachable without being playful |
| **Duolingo** | Earned celebration — streaks, progress, and milestones are *felt*, not just displayed — reinterpreted with dignity for an adult, high-stakes exam audience (no mascots, no cartoon gamification) |
| **Testbook** | Domain-tested exam-taking conventions (timer, question palette, sectional navigation) — kept, but re-rendered with dramatically higher visual craft |

**Brand personality:** Trustworthy · Clear · Quietly Encouraging · Precise · Bilingual by design, not by afterthought — Tamil script is typeset with the same care as Latin script everywhere in the product, never smaller, never an unstyled fallback.

---

## 1. Brand Identity

Nalanda's identity draws on the ancient Nalanda university — a place of rigorous, serious scholarship — reinterpreted for a modern aspirant preparing under real pressure (career, family expectation, limited time). The brand must never feel like a toy, a discount coaching pamphlet, or a bureaucratic government portal. It should feel like **a serious, well-funded institution that happens to be digital** — closer in register to a premium university or a Stripe-grade fintech than to a typical Indian ed-tech app.

**Core attributes:**
- **Calm confidence** over urgency-driven dark patterns (no countdown-timer FOMO banners, no fake scarcity).
- **Earned momentum** — progress indicators and celebrations always tie to something the user actually did, never manufactured engagement bait.
- **Bilingual dignity** — Tamil is a first-class design citizen: same type quality, same information density, same visual weight as English, everywhere.

---

## 2. Logo Usage

**Concept direction:** A logomark combining an abstract, minimal form evoking an oil lamp or stupa silhouette (Nalanda's historical seat-of-learning association) with a subtle upward chevron/ascent line integrated into the negative space — reads simultaneously as "knowledge" and "progress/advancement," without becoming a literal, cluttered pictogram.

**Lockup variants:**
- **Full lockup:** logomark + wordmark "Nalanda TNPSC" (bilingual wordmark variant sets Tamil and English side by side at equal visual weight, never Tamil as a smaller subtitle).
- **Logomark only:** used at small sizes (favicon, app icon, avatar placeholders) — must remain legible down to 16×16px.
- **Wordmark only:** used in dense UI contexts (e.g., admin panel header) where the mark would compete with adjacent controls.

**Clear space:** minimum clear space around the logomark equal to the height of the mark itself, on all sides, in any lockup.

**Color variants:** full-color (primary use, light backgrounds), reversed/white (dark backgrounds, photography), single-color ink (print, watermarks, official documents/certificates).

**Don't-do rules:** never stretch or skew the mark; never recolor the logomark to an off-brand hue; never place the full-color mark on a busy photographic background without a scrim; never reduce the bilingual wordmark's Tamil half in size relative to the English half.

---

## 3. Typography

| Role | Typeface | Rationale |
|---|---|---|
| **UI & Body (Latin script)** | Inter (variable weight) | Apple-SF-Pro-adjacent humanist geometry, exceptional screen legibility at small sizes, free and battle-tested for product UI |
| **UI & Body (Tamil script)** | Anek Tamil (variable weight) | Purpose-built as a variable-weight companion to modern Latin sans faces — matches Inter's weight steps and x-height rhythm so mixed Tamil/English sentences don't visually clash |
| **Marketing/Display (Website hero only)** | A slightly warmer geometric sans at heavier weights (e.g., Inter Display / Cal Sans-style treatment) | Reserved for the public Website's hero moments only — the authenticated product never uses a second display face, keeping the in-app experience calm and consistent |
| **Numeric/Data (scores, percentiles, timers)** | Inter with tabular figures (`font-variant-numeric: tabular-nums`) | Prevents digit-width jitter in timers, leaderboards, and score counters — a Stripe-grade precision detail |

**Pairing rule:** exactly one sans family per script, ever, inside the authenticated product. Weight (not typeface variety) carries hierarchy.

---

## 4. Font Sizes (Type Scale)

| Token | Size / Line Height | Weight | Usage |
|---|---|---|---|
| `display` | 40px / 48px | 700 | Website hero headlines only |
| `heading-1` | 32px / 40px | 700 | Page-level titles (Dashboard, Analytics) |
| `heading-2` | 24px / 32px | 600 | Section titles (Learn subject page) |
| `heading-3` | 20px / 28px | 600 | Card titles, modal titles |
| `heading-4` | 17px / 24px | 600 | Sub-section labels |
| `body-large` | 16px / 24px | 400 | Primary reading text (notes, question text) |
| `body-medium` | 14px / 20px | 400 | Default UI text, table cells |
| `body-small` | 13px / 18px | 400 | Secondary/supporting text, timestamps |
| `caption` | 12px / 16px | 500 | Labels, badges, metadata |
| `overline` | 11px / 14px | 600, uppercase, +0.04em tracking | Eyebrow labels above headings |

All sizes are defined in `rem` in implementation (base 16px), scaling correctly with user/OS accessibility font-size preferences — never fixed `px` at the root.

---

## 5. Color Palette

Philosophy: **neutral-first, one confident primary, purposeful accents.** Unlike the multi-color, banner-heavy visual noise typical of Adda247/Testbook (per `docs/CompetitorAnalysis.md`), Nalanda's UI is predominantly neutral, with color reserved to mean something specific (brand action, AI, success, premium).

### 6. Primary Colors

| Token | Hex | Usage |
|---|---|---|
| `primary-900` (Ink) | `#211C4E` | Highest-contrast text on light surfaces, dark-mode elevated surfaces |
| `primary-700` (Deep) | `#3B3486` | Hover/pressed states for primary actions |
| `primary-600` (Default — "Nalanda Indigo") | `#4A3FBF` | Primary buttons, active nav states, links |
| `primary-400` (Soft) | `#8B82E0` | Icon accents, secondary emphasis |
| `primary-100` (Tint) | `#EDEBFB` | Selected-state backgrounds, subtle highlights |
| `primary-50` (Wash) | `#F7F6FD` | Section backgrounds requiring the faintest brand tint |

**Rationale:** a deep, slightly muted indigo-violet — closer to ink/manuscript pigment than to generic "startup indigo" — reads as scholarly and premium rather than trendy, and is distinct enough from Testbook's brighter corporate blue and Duolingo's green to avoid category confusion.

### 7. Secondary Colors

| Token | Hex | Usage |
|---|---|---|
| `accent-gold-600` ("Sangam Gold") | `#B5872A` | Achievement moments, premium/Pro-tier accents, badges — used *sparingly*, never as a background field |
| `accent-teal-500` ("AI Teal") | `#1FB6A8` | Reserved exclusively for AI-originated content and controls (Section 35) — a consistent visual signal that "this came from Nalanda's AI," never used elsewhere |
| `neutral-900`–`neutral-0` | `#14141A` → `#FFFFFF` (10-step gray scale) | Backgrounds, borders, body text — the majority of every screen's surface area |

Secondary colors are **never used for two different meanings** — gold always means achievement/premium, teal always means AI, with no exceptions, so users build a reliable visual vocabulary over time.

### 8. Success

| Token | Hex | Usage |
|---|---|---|
| `success-600` | `#1F9D55` | Correct-answer indicators, success toasts, "completed" states |
| `success-100` | `#E3F6EA` | Success banner/card backgrounds |

### 9. Warning

| Token | Hex | Usage |
|---|---|---|
| `warning-600` | `#B7791E` | Time-running-out indicators, non-blocking caution states (e.g., "your card expires soon") |
| `warning-100` | `#FBF0DD` | Warning banner backgrounds |

### 10. Error

| Token | Hex | Usage |
|---|---|---|
| `error-600` | `#C4392B` | Incorrect-answer indicators, form validation errors, destructive-action confirmation |
| `error-100` | `#FBE7E4` | Error banner backgrounds |

All semantic and brand colors are verified to meet **WCAG AA contrast (4.5:1 for body text, 3:1 for large text/icons)** against their paired background at every documented usage.

---

## 11. Dark Theme

Dark mode is a **first-class theme**, not an inverted afterthought — consistent with Linear's reputation for the best dark mode in SaaS.

| Token | Value | Notes |
|---|---|---|
| `surface-base` | `#121218` | App background |
| `surface-raised-1` | `#1A1A22` | Cards, panels |
| `surface-raised-2` | `#22222C` | Modals, popovers (higher elevation) |
| `border-subtle` | `#2E2E38` | Default dividers/borders |
| `text-primary` | `#F2F1F7` | Primary text |
| `text-secondary` | `#A8A6B8` | Secondary/muted text |
| `primary-600 (dark-mode adjusted)` | `#7A70E8` | Brand primary is **lightened and slightly desaturated** relative to light mode, per standard dark-mode color-adaptation practice, so it doesn't vibrate against the dark surface |

**Rule:** dark mode never simply inverts light-mode colors — every token is independently tuned for correct perceived contrast and reduced eye strain in low-light study sessions (a real use case for personas studying late at night, e.g., Karthik).

---

## 12. Light Theme

| Token | Value | Notes |
|---|---|---|
| `surface-base` | `#FFFFFF` | App background |
| `surface-raised-1` | `#FAFAFC` | Cards, panels |
| `surface-raised-2` | `#FFFFFF` (with shadow, see §21) | Modals, popovers |
| `border-subtle` | `#E4E3EC` | Default dividers/borders |
| `text-primary` | `#1A1A22` | Primary text |
| `text-secondary` | `#5C5A6E` | Secondary/muted text |

**Default theme:** Light, with an automatic OS-preference detection (`prefers-color-scheme`) and an explicit in-app override in Settings — both themes are maintained to full parity, never a "second-class" mode.

---

## 13. Buttons

| Variant | Usage | Visual Treatment |
|---|---|---|
| **Primary** | The single most important action per screen (e.g., "Start Test," "Continue") | Solid `primary-600` fill, white text, subtle shadow on hover |
| **Secondary** | Alternative but valid actions (e.g., "Save for Later") | 1px `border-subtle` outline, transparent fill, `text-primary` text |
| **Tertiary/Ghost** | Low-emphasis actions (e.g., "Skip," "Cancel") | No border, no fill, text-only with a subtle hover background wash |
| **Destructive** | Irreversible/dangerous actions (e.g., "Delete Account") | Solid `error-600` fill, requires a confirmation dialog (§34) before firing |
| **AI** | Any AI-triggering action (e.g., "Ask AI," "Explain This") | Uses the AI Teal gradient treatment (§35) exclusively — visually distinct from all other button variants |

**States:** default, hover (subtle lift + slightly darker fill), active/pressed (slightly darker + no lift), disabled (40% opacity, no pointer events), loading (label replaced by an inline spinner, button remains its committed width to prevent layout shift).

**Sizing scale:** `sm` (32px height), `md` (40px height, default), `lg` (48px height, used for primary mobile CTAs to meet touch-target guidance in §31).

---

## 14. Cards

The base content container across Dashboard, Learn, Analytics, and Admin.

- **Anatomy:** optional eyebrow/overline label → title → body content → optional footer action row.
- **Elevation:** cards sit at `surface-raised-1` with a 1px `border-subtle` in light mode; in dark mode, elevation is communicated primarily through subtle background-lightness steps rather than heavy shadows (shadows read poorly on dark surfaces).
- **Interactive cards** (clickable, e.g., a Topic card) get a hover state: border shifts to `primary-400` at low opacity, never a jarring color-fill hover.
- **Radius:** `radius-lg` (see §22).

---

## 15. Inputs

- **Text fields:** 1px `border-subtle` default, `primary-600` border + subtle `primary-100` focus ring on focus (never a harsh browser-default blue outline), `error-600` border + inline error text below on validation failure.
- **OTP input:** a distinct 6-box segmented input (per `docs/UserJourney.md` Screen 3), auto-advances focus per digit, supports OS/keyboard OTP autofill.
- **Selects/Dropdowns:** match text-field chrome; option lists use `surface-raised-2` with subtle shadow.
- **Toggles/Checkboxes:** `primary-600` when active; used for notification preferences, Remember Me.
- **Labels:** always visible above the field (never placeholder-as-label, an accessibility anti-pattern) — placeholder text is reserved for example format hints only.

---

## 16. Tables

Primarily an **Admin Panel** pattern (user lists, subscriptions, audit logs — per `docs/InformationArchitecture.md` §5).

- **Header row:** `body-small` weight 600, `text-secondary`, sits on a faint `surface-raised-1` background, sticky on scroll for long tables.
- **Row hover:** subtle `primary-50`/dark-equivalent background wash — signals row-level interactivity without a heavy border.
- **Zebra striping:** intentionally **not used** — Stripe/Linear-grade tables rely on generous row height and hover states instead of stripes, which read as dated.
- **Dense mode:** a compact row-height toggle for Admin users managing large question banks, per Stripe's dense-table convention.
- **Empty/loading states:** see §24–26.

---

## 17. Charts

Rendered via Chart.js (per confirmed stack), skinned to this system rather than left at default styling.

- **Palette:** sequential/categorical chart colors are a **distinct, curated 6-color set** (not reusing `primary`/`error`/`success` directly, to avoid semantic confusion between "this data series is red" and "this represents an error") — muted, desaturated tones that hold up in both themes.
- **Gridlines:** minimal, single-pixel, `border-subtle` — Stripe-style restraint, not default Chart.js heavy gridlines.
- **Tooltips:** custom-styled to match card chrome (§14), never the default browser-native tooltip box.
- **Score/percentile ring (donut):** the signature Analytics visual — a circular progress ring with the percentile number set in large tabular-numeral type at its center (§4).
- **Trend line:** smooth (not jagged) line interpolation for score-over-time charts, with a subtle gradient fill beneath the line fading to transparent.

---

## 18. Badges

| Type | Style | Example |
|---|---|---|
| **Status badge** | Small pill, semantic-color background tint + matching text color | "Active," "Expired," "Pending" |
| **Tier badge** | Gold-accented pill with a small crown/star glyph | "Pro," "Institutional" |
| **Difficulty badge** | Neutral pill, text-only distinction | "Easy," "Medium," "Hard" |
| **Achievement badge** | Circular icon badge (see §39) | Streak milestones, "First Mock Completed" |

All badges share one radius token (`radius-full`, i.e., fully rounded) and one height (20px) for visual consistency across contexts.

---

## 19. Animations

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `motion-instant` | 100ms | `ease-out` | Button press feedback, toggle switches |
| `motion-fast` | 180ms | `ease-in-out` | Hover states, tooltips, dropdown open/close |
| `motion-base` | 260ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Page/panel transitions, modal enter |
| `motion-celebratory` | 500–700ms | Spring-based (slight overshoot) | Streak milestones, badge unlocks, correct-mock-test-completion moments — the *only* place overshoot easing is permitted |

**Principle:** the vast majority of the product moves fast and subtly (Linear-influenced); a small, deliberate set of "earned" moments (Duolingo-influenced) are allowed a warmer, springier motion signature — never the reverse (routine actions must never feel slow or bouncy).

---

## 20. Glassmorphism

Used **sparingly and only for temporary, layered surfaces** — never as a base UI material, avoiding the overused, dated glass-everywhere aesthetic:

- **Where used:** the notification-bell dropdown, the AI chat panel's floating header (§35), and the mobile app's tab bar background when content scrolls beneath it.
- **Treatment:** background blur (`backdrop-filter: blur(20px)`) over a semi-transparent (~80% opacity) `surface-raised-2`, with a 1px hairline border at ~10% white/black opacity to define the edge against busy content behind it.
- **Never used on:** primary content cards, buttons, or any surface holding critical text — glass surfaces always sit *above* content, never *as* content, to protect legibility (an Apple-influenced restraint principle).

---

## 21. Shadows

| Token | Value (light mode) | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(20,20,30,0.06)` | Subtle card definition |
| `shadow-sm` | `0 2px 6px rgba(20,20,30,0.08)` | Hovering cards, dropdown menus |
| `shadow-md` | `0 8px 24px rgba(20,20,30,0.12)` | Modals, popovers |
| `shadow-lg` | `0 16px 48px rgba(20,20,30,0.16)` | Full-screen overlays (rare) |

Dark mode replaces shadows with **subtle border/elevation-lightness changes** (per §11) rather than darker shadows, which are largely invisible against dark backgrounds.

---

## 22. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, small buttons, badges (non-pill) |
| `radius-md` | 10px | Default buttons, form controls |
| `radius-lg` | 16px | Cards, panels |
| `radius-xl` | 24px | Modals, large feature panels |
| `radius-full` | 9999px | Pills, badges, avatar images, the FAB-style "Ask AI" button |

A consistently rounded, Apple/Linear-influenced softness throughout — sharp 0px corners are not used anywhere in the system, avoiding the harsher, more clinical feel of typical government/exam-portal UI.

---

## 23. Icons

- **Icon set:** a single, consistent outline-style icon library (stroke-based, 1.5–2px stroke weight, 24×24px grid) used everywhere — no mixing of filled and outline styles within the same screen.
- **Filled variants** are reserved exclusively for **active/selected navigation states** (e.g., the active bottom-tab icon on mobile switches from outline to filled) — a single, predictable rule rather than ad hoc filled icons scattered through the UI.
- **AI-related icons** use the AI Teal accent color (§7) exclusively, reinforcing the same visual-vocabulary rule as buttons and badges.
- **Custom icons required:** a small set of Nalanda-specific glyphs not found in generic icon libraries — a streak-flame variant with restrained (non-cartoonish) styling, an exam-category iconography set (Group 1–4, VAO, Police, Forest, TRB — each a simple, dignified pictogram, not a clipart-style illustration).

---

## 24. Empty States

Every list/data view has a designed empty state — never a bare "No data" text string. Anatomy: a simple line-art illustration (matching the icon system's stroke weight, not a separate illustration style), a short encouraging headline, and — where applicable — a direct action button (e.g., Bookmarks empty state: "Nothing bookmarked yet" + "Browse Topics" button). Directly operationalizes the empty-state requirements already specified per-screen in `docs/UserJourney.md` (e.g., Dashboard's brand-new-user state, Analytics' first-test state).

---

## 25. Loading States

- **Rule:** every asynchronous operation shows *something* within 100ms — never a blank screen while waiting.
- **Short, predictable-duration operations** (button submissions, form saves): inline spinner within the triggering control.
- **Longer or unpredictable-duration operations** (AI generation, payment confirmation): a labeled state (e.g., "Building your personalized plan...") rather than a bare spinner, per the reassurance principle already established in `docs/UserJourney.md`.
- **Full-page/section loads with predictable layout:** skeleton screens (§26), not spinners.

---

## 26. Skeleton Loaders

- **Visual treatment:** flat `neutral-100`/dark-equivalent blocks matching the exact shape and layout of the content about to load (card outlines, text-line bars of varying width to mimic real text rhythm, circular blocks for avatars/rings), with a slow, subtle shimmer sweep (`motion-base` duration, looping).
- **Never** a generic centered spinner where the eventual layout is already known — skeletons reduce perceived load time and prevent layout shift, and are the default treatment for Dashboard stat cards, Learn topic lists, Analytics charts, and Admin tables, per the loading-state requirements specified per-screen in `docs/UserJourney.md`.

---

## 27. Responsive Design

| Breakpoint | Range | Primary Layout Shift |
|---|---|---|
| `mobile` | < 640px | Single column, bottom tab navigation (per `docs/InformationArchitecture.md` §6) |
| `tablet` | 640px – 1024px | Two-column where content allows (e.g., Learn's topic list + reading pane), collapsible sidebar |
| `desktop` | > 1024px | Persistent sidebar + top bar (per §4 of `docs/InformationArchitecture.md`), multi-column dashboards |

All spacing, type, and component tokens are shared across breakpoints — only **layout composition** changes, never the visual language itself.

---

## 28. Mobile Design

- Bottom tab bar (5 items max, per `docs/InformationArchitecture.md` §6) using the glassmorphism treatment (§20) when content scrolls beneath it.
- Minimum touch target: 44×44px (Apple HIG standard) for every interactive element, including table row actions and icon-only buttons.
- Full-screen, chrome-minimized test-taking mode (tab bar hidden during a timed Practice/Live Exam session) to maximize focus and screen real estate.
- Bottom-sheet modals (not centered dialogs) for contextual actions, matching native mobile conventions over desktop-style centered modals.

---

## 29. Tablet Design

- Treated as a distinct layout tier, not merely a scaled-up phone or scaled-down desktop — the Learn module specifically benefits from a two-pane master-detail layout (topic list + reading pane side-by-side) only achievable at tablet width and above.
- Sidebar navigation collapses to an icon-only rail by default (expandable on tap), preserving screen space for content while keeping primary navigation persistent (unlike mobile's tab bar).

---

## 30. Desktop Design

- Full persistent sidebar + top bar (§4, `docs/InformationArchitecture.md`), generous content max-width (contentious full-bleed layouts are avoided for reading-heavy screens — Learn notes are capped at ~720px reading width for legibility, Apple/Notion-influenced).
- Keyboard navigation and shortcuts are a first-class citizen on desktop specifically (e.g., arrow keys to navigate the Practice question palette, `Cmd/Ctrl+K` for global search) — a deliberate Linear-influenced choice for the desktop-using power segment (Divya, full-time aspirants doing serious desktop-based answer writing).

---

## 31. Accessibility

- **Contrast:** WCAG AA minimum (4.5:1 text, 3:1 large text/icons) verified for every color pairing in §5–§10, in both themes.
- **Touch targets:** minimum 44×44px on mobile (§28), 32×32px minimum on desktop with adequate spacing between adjacent interactive elements.
- **Focus states:** every interactive element has a visible, non-default focus ring (`primary-600` at 2px, offset) — critical for keyboard navigation and never suppressed via `outline: none` without a replacement.
- **Motion sensitivity:** all non-essential animation respects `prefers-reduced-motion` — celebratory/spring motion (§19) is replaced with a simple fade for users with this preference set.
- **Bilingual screen-reader support:** all bilingual content is marked with correct `lang` attributes per script so assistive technology pronounces Tamil and English text correctly rather than reading Tamil script with English phonetic rules.
- **Font scaling:** all type uses relative units (§4), respecting OS/browser-level font-size accessibility settings without breaking layout.

---

## 32. Motion Guidelines

Distinct from the raw animation *tokens* in §19 — this is the *judgment layer* for when motion should be used at all:

1. **Motion communicates a state change, never decorates.** If removing an animation doesn't lose any information about what just happened, it shouldn't exist.
2. **Speed is a feature.** Default interaction motion (§19 `motion-fast`/`motion-base`) is tuned to feel immediate, Linear-influenced — Nalanda should never feel "laggy" due to over-long transitions.
3. **Celebration is earned and rare.** The springy `motion-celebratory` treatment is reserved for genuine milestones (streaks, badges, a completed mock test) — using it for routine actions would cheapen it, exactly the failure mode that makes some competitor gamification (per persona research) feel gimmicky rather than motivating.
4. **Reduced motion is a first-class mode, not a fallback bug fix** (§31) — designed and tested alongside the full-motion experience, not patched in afterward.

---

## 33. Toast Notifications

- **Anatomy:** icon (semantic color, §8–10) + short message + optional single action link, auto-dismissing after 4 seconds (success/info) or persistent until dismissed (errors requiring acknowledgment).
- **Placement:** top-center on mobile (thumb-friendly dismissal by swipe), bottom-right on desktop (out of the way of primary content, Stripe/Linear convention).
- **Stacking:** multiple toasts stack vertically with a slight offset, never overlapping.
- Directly implements the "brief, positive, non-intrusive" success-feedback standard already set in `docs/UserJourney.md`'s cross-cutting standards table.

---

## 34. Dialog Boxes

- **Confirmation dialogs** (destructive actions — account deletion, subscription downgrade): centered on desktop, bottom-sheet on mobile (§28), always name the specific consequence in plain language (e.g., "Downgrading removes AI Mains evaluation and deep analytics" — never a generic "Are you sure?").
- **Modal chrome:** `surface-raised-2`, `shadow-md`/`radius-xl`, a single clear primary action + a ghost-style cancel — never more than two buttons in a confirmation dialog.
- **Escape-hatch:** every dialog is dismissible via a visible close control, the Escape key (desktop), and a backdrop tap — except irreversible destructive confirmations, which require an explicit button press to prevent accidental dismissal from being mistaken for confirmation.

---

## 35. AI Components

A dedicated, consistent visual language so users always know when they're interacting with AI — using the AI Teal accent (§7) as the singular, unmistakable signal:

- **AI entry points** (e.g., "Explain This," "Ask AI"): AI Teal gradient button/icon treatment (§13), never the standard primary-indigo button style.
- **"AI is thinking" indicator:** three softly pulsing dots in AI Teal, replaced by streamed, incrementally-appearing text as the response arrives (per `docs/Architecture.md` §5's synchronous-path design) — never a static "please wait" screen.
- **Confidence signaling:** low-confidence AI responses carry a small, honest inline note ("Not fully sure — here's my best answer") in `text-secondary`, plus a visible "Ask the community instead" link — never presented with the same visual confidence as a high-confidence answer.
- **Mains-evaluation rubric card:** a structured card (not a wall of text) breaking feedback into labeled sections (Structure, Relevance, Coverage, Language) each with a small score indicator and specific written feedback — designed for the Divya persona's need for actionable, credible feedback, not just a number.
- **Feedback controls:** thumbs up/down icons in every AI response, styled as a quiet, low-emphasis control (ghost-button style) so it doesn't compete visually with the AI content itself.

---

## 36. Premium Components

Directly implements the "honest upsell" principle established in `docs/UserJourney.md`'s cross-cutting standards and the transparent-pricing recommendation from `docs/CompetitorAnalysis.md`:

- **Paywall/lock treatment:** gated content (e.g., a locked PDF) is shown with a soft blur over a real preview of the actual content (never a fake placeholder), a small lock icon, and a specific, honest label ("Unlock with Plus") — never a generic "Premium" banner with no context of what's behind it.
- **Upsell card:** appears at natural pause points (end of a free-tier quiz limit, end of a Learn topic), styled with the Sangam Gold accent (§7) at low saturation — confident, not alarming or red-flagged like an error.
- **Pricing comparison table:** side-by-side tier columns (Free/Plus/Pro/Institutional), Stripe-influenced clarity — checkmarks/dashes for feature presence, the recommended tier subtly highlighted with a `primary-100` background column, never a fake "Most Popular" badge unless genuinely backed by real usage data.
- **Tier badge:** consistent gold pill (§18) shown next to a user's name/avatar wherever identity appears (Community posts, Leaderboard) — a quiet status signal, never ostentatious.

---

## 37. Dashboard Components

- **Streak indicator:** a restrained flame/ring glyph with the current streak number in tabular numerals — Duolingo-inspired concept, Apple-restrained execution (no cartoon mascot, no oversized flame animation on every visit — the celebratory motion (§19) fires only on a *new* milestone, not on every app open).
- **Syllabus completion bar:** a slim horizontal progress bar with percentage in tabular numerals, using `primary-600` fill.
- **Exam-goal switcher chip:** a persistent, tappable chip (per `docs/InformationArchitecture.md`'s recommendation #4) showing the currently active exam goal, opening a quick-switch menu for multi-exam users.
- **Next-recommended-action card:** the single most prominent card on the Dashboard, using a subtle `primary-50` background wash to differentiate it from neutral surrounding cards without shouting.

---

## 38. Practice Components

- **Question card:** generous line-height (§4 `body-large`) for question text, options rendered as full-width selectable rows (not small radio buttons) for easy tapping on mobile, selected state uses `primary-100` background + `primary-600` border.
- **Timer:** tabular-numeral countdown, shifting from `text-primary` to `warning-600` in the final 10% of allotted time, and to `error-600` in the final minute — a calm, gradual escalation rather than a jarring flash.
- **Question palette navigator:** a compact grid of question-number chips color-coded by state (unanswered: neutral outline; answered: `primary-600` fill; marked for review: `warning-600` outline) — directly implements the palette described in `docs/UserJourney.md` Screen 7.
- **Integrity-signal indicator (mock tests):** a small, non-alarming inline note ("2 tab switches recorded") in `text-secondary` — deliberately unstyled as a warning/error color, consistent with the PRD's explicitly non-punitive framing of this feature.

---

## 39. Analytics Components

- **Percentile/score ring:** the signature circular progress component (§17) — large tabular-numeral percentage centered within a ring, `primary-600` progress arc over a `neutral-100` track.
- **Sectional bar chart:** horizontal bars (easier to label long subject names than vertical bars), using the curated chart palette (§17), sorted weakest-to-strongest by default to immediately surface what needs attention.
- **Trend line chart:** smooth gradient-fill line chart (§17) for score-over-time, with a subtle annotation dot and label on the most recent data point.
- **Weak-area list:** a ranked list card (not a chart) pairing each weak topic with a direct "Study this topic" action button, closing the loop between insight and action within the same component.
- **Achievement badge grid:** a grid of circular badge icons (§18), earned badges in full color, unearned badges rendered at low-opacity grayscale with a subtle lock glyph — visible aspiration without looking broken or empty.

---

## 40. Admin Components

- **Data table** (§16) as the primary workhorse component — user lists, question banks, subscriptions, audit logs all share one table component with configurable columns.
- **Bulk-action toolbar:** appears contextually above a table only when one or more rows are selected (checkbox column), housing actions like "Bulk Delete," "Export," "Bulk Tag" — never permanently visible, keeping the default table view uncluttered.
- **Content editor chrome:** a clean, distraction-minimized rich-text/rich-content editing surface for Notes and Question authoring (Notion-influenced block-style editing), with a clearly separated bilingual (Tamil/English) tab or side-by-side toggle so content editors always know which language they're editing.
- **Cohort analytics panel** (Institutional/B2B, per the Rajendran persona): a dashboard-within-a-dashboard using the same ring/bar/trend components as student-facing Analytics (§39), reinforcing one visual language across both audiences rather than inventing separate admin-only chart styles.
- **Audit log table:** a specialized read-only table variant with a monospace-numeral timestamp column and a filterable "actor" column, prioritizing scanability for accountability review over visual richness.

---

## Cross-Document Consistency Notes

- Every component and state described here (empty states, loading states, error tone) is the direct visual implementation of behavior already specified screen-by-screen in `docs/UserJourney.md` — this document answers "how it looks," that document answers "what it does."
- The AI Teal / Sangam Gold color rules (§7, §35, §36) give the AI features (`docs/PRD.md` §10) and premium tiers (`docs/PRD.md` §9) a consistent, learnable visual vocabulary across every surface in `docs/InformationArchitecture.md`.
- Component structure (Buttons, Cards, Tables, Badges) is designed to map cleanly onto the `shared/components/ui/` design-system layer defined in `docs/FolderStructure.md` §4, so this document can serve directly as the specification engineering builds against.

---

*End of Document.*
