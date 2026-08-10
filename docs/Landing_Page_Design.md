# Nalanda TNPSC — Landing Page Design

| | |
|---|---|
| **Document Owner** | UI/UX Design & Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/UI_Design_System.md` as the binding style authority for every token referenced below |
| **Design Mandate** | The Website's single most important page — must out-class Vetri App's marketing site (per `docs/CompetitorAnalysis.md`: "modern, dashboard-style presentation," but thin on social proof, current affairs, gamification, and transparent pricing) on craft, trust signals, and clarity within the first viewport |

### How This Page Beats Vetri App — Stated Up Front

| Gap in Vetri App (per `docs/CompetitorAnalysis.md`) | This Landing Page's Answer |
|---|---|
| No prominent current-affairs presence | A live "Daily Current Affairs" section with real, dated content, previewed pre-signup |
| Quote-based, opaque pricing | A fully transparent Premium/Pricing section with real numbers, no "Contact Us" gate |
| No gamification signal | Animated stat counters, a Top Rankers showcase, and streak/achievement language woven into copy |
| Thin, unverified social proof | Two distinct, deeper proof layers — Success Stories (narrative) and Testimonials (breadth) — plus Top Rankers |
| No visible AI personality | A dedicated, animated AI Assistant presence in the Hero and a full "AI Tutor" feature card — AI is *seen*, not just claimed in a tagline |

### Page Flow (Top to Bottom)

```
Navbar (sticky)
   ↓
Hero Section (animated background + floating AI icons + AI Assistant animation)
   ↓
Live Stats Counters Band (Questions · Current Affairs · Mock Tests · Students)
   ↓
Feature Cards (AI Tutor · Smart Practice · Weekly Live Exam · Analytics · Community · Study Planner)
   ↓
Daily Current Affairs Preview
   ↓
Top Rankers
   ↓
Success Stories
   ↓
Premium Section (Pricing)
   ↓
Testimonials
   ↓
FAQ
   ↓
Footer
```

---

## 1. Navbar

**Purpose:** Establish brand presence immediately, provide constant access to primary conversion actions (Login, Get Started) and key trust anchors (Pricing, Exams), without competing visually with the Hero beneath it.

**Layout:** Single horizontal row, three zones — left: logomark + wordmark (per `docs/UI_Design_System.md` §2); center: primary links (Exams, Pricing, Current Affairs, For Coaching Centers); right: language toggle (EN/தமிழ்), Login (ghost button), Get Started Free (primary button).

**UI:** Transparent background over the Hero's animated backdrop at the very top of the page, transitioning to a solid `surface-base` with a 1px `border-subtle` bottom edge once scrolled (see Sticky Navigation, §2). Height: 64px desktop, 56px mobile.

**Animations:** Nav links get a subtle underline-grow-in on hover (`motion-fast`, §19 of the design system). The Get Started button uses the standard primary-button hover lift — no additional flourish here, since the Navbar's job is speed and clarity, not spectacle (Linear-influenced restraint).

**Colors:** Transparent/`surface-base` per scroll state (above); text in `text-primary` against the Hero, shifting to standard `text-primary`/`primary-600` once solid; primary CTA uses `primary-600` fill (§6 of the design system) throughout.

**Icons:** Logomark only (no decorative icons in the link row — text labels alone, keeping the Navbar calm and legible, consistent with Apple/Linear navigation conventions).

**Responsive behaviour:** Desktop shows the full link row; tablet collapses secondary links ("For Coaching Centers," language toggle) into an overflow menu; mobile collapses to logomark + hamburger menu opening a full-screen nav sheet with all links stacked and the Get Started button pinned at the bottom of the sheet.

**Call to Action:** **Get Started Free** (primary, drives to Registration) and **Login** (secondary, for returning users) — both persistently visible at every scroll position.

---

## 2. Sticky Navigation

**Purpose:** Keep conversion actions and orientation available at all times during a long scroll, without permanently sacrificing screen real estate to a heavy fixed header.

**Layout:** Identical structure to the Navbar (§1); the only change on scroll is background/elevation, not content or link arrangement — no jarring re-layout.

**UI:** After ~80px of scroll, the Navbar transitions from transparent-over-Hero to a solid `surface-base` background with `shadow-xs` (§21 of the design system) to lift it visually off the content scrolling beneath it.

**Animations:** The transition (transparent → solid) is a `motion-base` (260ms) cross-fade plus shadow fade-in — smooth enough to be imperceptible as a "jump," never an abrupt hard-cut background swap.

**Colors:** Same tokens as §1, applied conditionally based on scroll position.

**Icons:** Unchanged from §1.

**Responsive behaviour:** Identical sticky behavior across breakpoints; on mobile, the sticky bar is intentionally kept slim (56px) to preserve vertical space on smaller screens.

**Call to Action:** Same as §1 — sticky navigation exists specifically so **Get Started Free** is never more than one scroll-position away from disappearing.

---

## 3. Hero Section

**Purpose:** Communicate the full value proposition — "AI-powered, Tamil-first TNPSC preparation" — within the first three seconds of a visit, and convert high-intent visitors immediately. This is the single highest-leverage section on the page.

**Layout:** Two-zone split on desktop — left 55%: eyebrow label ("AI-Powered TNPSC Preparation"), headline, supporting sub-headline, primary + secondary CTA buttons, and a small trust strip (student counter + average rating, see §7–§10); right 45%: the animated visual composition (animated background, floating AI icons, AI Assistant animation — §4–§6). Mobile stacks vertically, visual composition first (as a compact, contained animation) or beneath the headline, text-first.

**UI:** Generous vertical padding (matching Apple-style Hero breathing room), headline set in `display`/`heading-1` scale (§4 of the design system) with tabular-numeral treatment where any number appears inline. Sub-headline in `body-large`, `text-secondary`.

**Animations:** Headline and sub-headline fade-and-rise in on page load (`motion-base`, staggered ~80ms between headline/sub-headline/CTAs) — a single, restrained entrance, not a cascading multi-stage animation sequence that would feel gimmicky.

**Colors:** `surface-base` background with the animated composition (§4) providing the only strong color movement in the section; headline in `text-primary`, primary CTA in `primary-600`, secondary CTA as a ghost button.

**Icons:** The floating AI icon set (§5) and AI Assistant glyph (§6) are the section's only iconography — no additional decorative icons competing for attention.

**Responsive behaviour:** Desktop: full two-zone split. Tablet: visual composition scales down and sits above the text zone, which becomes full-width. Mobile: visual composition is simplified to a smaller, lower-motion variant (fewer floating icons, slower/subtler background animation) to protect performance on low-end Android devices (per the Priya persona's bandwidth/device constraints).

**Call to Action:** Primary — **Start Preparing Free** (drives to Registration); Secondary — **See How It Works** (anchor-scrolls to Feature Cards, §14) for visitors not yet ready to commit.

---

## 4. Animated Background

**Purpose:** Give the Hero a sense of depth, motion, and modern technical credibility (Stripe-influenced) without becoming a distraction from the headline copy.

**Layout:** Occupies the Hero's visual zone (§3's right 45% on desktop, a contained band on mobile) — never the full page background, so it never competes with content below the fold.

**UI:** A soft, slow-drifting gradient mesh in muted `primary-100`/`accent-teal` tones (low saturation, high lightness) behind the floating icons and AI Assistant animation — reads as atmosphere, not foreground content.

**Animations:** Continuous, very slow gradient drift (60–90 second loop, near-imperceptible frame-to-frame) using GPU-friendly transform/opacity animation only — deliberately calm motion (Apple-influenced), never a fast, attention-grabbing loop that would fatigue a visitor staying on the page to read.

**Colors:** Restricted to `primary-100`→`primary-50` and a touch of `accent-teal-500` at very low opacity (~15%) — never introduces new colors outside the established palette (§5 of the design system).

**Icons:** None directly — this is a pure background treatment beneath the floating icons (§5).

**Responsive behaviour:** Full richness on desktop/tablet; on mobile, the animation is simplified to a static gradient or a single, slower drift cycle to conserve battery/CPU on budget devices, and is fully suppressed under `prefers-reduced-motion` (§31 of the design system).

**Call to Action:** None directly (a pure atmosphere layer) — it exists to make the Hero's actual CTAs (§3) feel more premium by association, not to carry a CTA itself.

---

## 5. Floating AI Icons

**Purpose:** Visually represent the breadth of the platform's AI capabilities (explanations, study plans, current-affairs summaries, mains evaluation) as a living, glanceable composition rather than a static bullet list — the single clearest visual differentiator from Vetri App's static, text-only marketing presentation.

**Layout:** 4–6 small icon "chips" (each a simple glyph on a soft rounded-square card, `radius-lg`) positioned at varying depths and offsets around the AI Assistant animation (§6), suggesting orbit/parallax rather than a rigid grid.

**UI:** Each chip uses the AI Teal accent (§7 of the design system) exclusively — reinforcing the same "AI = teal" visual vocabulary rule established platform-wide — with a subtle `shadow-sm` to lift it off the animated background.

**Animations:** Each icon gently floats on an independent, slow, slightly offset vertical drift (a few seconds' period, small amplitude — a few pixels), so the composition feels alive without any single element demanding focus; a subtle parallax shift respond to mouse movement on desktop (disabled on touch devices, where it would serve no purpose).

**Colors:** AI Teal (`accent-teal-500`, §7 of the design system) glyphs on a `surface-raised-1`-toned chip background — the only saturated color moving within the Hero, deliberately drawing the eye to "this is where the AI lives."

**Icons:** A curated set representing AI Explanation, Study Plan, Current Affairs Summary, and Mains Evaluation — matching the outline icon system (§23 of the design system), never generic robot/sparkle clip-art icons that would read as generic-SaaS rather than Nalanda-specific.

**Responsive behaviour:** Full set (5–6 icons) on desktop; reduced to 3 on tablet; reduced to 2–3, smaller and lower-amplitude, on mobile to keep the compact Hero visual legible and performant.

**Call to Action:** None individually — purely atmospheric/illustrative, reinforcing the Hero's headline claim visually rather than carrying its own action.

---

## 6. AI Assistant Animation

**Purpose:** Give the platform's AI a tangible, trustworthy visual identity right at first contact — addressing the persona research finding that aspirants are skeptical of vague "AI-powered" claims (per `docs/UserPersonas.md`) by *showing*, not just telling.

**Layout:** The central visual anchor of the Hero's right-hand zone (§3) — a rounded, abstract, non-anthropomorphic form (deliberately **not** a cartoon robot or mascot, keeping registration dignified for an adult, high-stakes-exam audience, per the design system's Duolingo-restraint principle) that suggests presence and responsiveness.

**UI:** A soft-edged, glowing orb/lens form in a subtle AI Teal-to-`primary-400` gradient, sitting within a glass-treated container (§20 of the design system — one of the few sanctioned glassmorphism uses) that appears to "float" above the animated background.

**Animations:** A slow, continuous soft pulse (breathing effect, 3–4 second cycle) to suggest active listening/readiness; on scroll-into-view, a brief one-time "assemble" animation (form fades/scales in from slightly smaller and dimmer to full presence, `motion-base`) rather than looping this entrance animation repeatedly.

**Colors:** AI Teal (`accent-teal-500`) to `primary-400` gradient (§7, §6 of the design system) — the only gradient-treated element on the entire page outside of the animated background itself, marking it as uniquely significant.

**Icons:** None — the form itself is the "icon," intentionally abstract rather than glyph-based, to avoid looking like just another feature-icon among the floating set (§5).

**Responsive behaviour:** Full glass/gradient/pulse treatment on desktop and tablet; on mobile, simplified to a smaller, flatter version (gradient retained, glass blur reduced or removed to protect rendering performance on budget devices) while keeping the pulse animation, since it's cheap to render and central to the section's identity.

**Call to Action:** None directly, but it is intentionally positioned adjacent to and slightly overlapping the Hero's primary CTA button (§3) on desktop, visually implying "this is what's waiting for you when you start."

---

## 7–10. Live Stats Counters Band

**Purpose (shared across all four counters):** Establish scale and credibility immediately after the Hero — directly answering the trust gap left by Vetri App's thin, unverified public presence (per `docs/CompetitorAnalysis.md`) with concrete, specific numbers rather than vague marketing language.

**Shared Layout:** A single horizontal band (4-column grid desktop, 2×2 grid tablet, stacked single-column mobile) directly beneath the Hero, on a `surface-raised-1`/`primary-50` band background to visually separate it as a distinct "proof" zone.

**Shared UI:** Each counter is a simple, large tabular-numeral figure (`heading-1` scale, §4 of the design system) with a short label beneath in `body-small`/`text-secondary` — no card chrome, borders, or icons cluttering the numbers themselves; the numbers *are* the design.

**Shared Animations:** Each counter uses a **count-up animation** triggered once when the band scrolls into view (not on every render) — numbers animate from 0 to their final value over ~1.2 seconds with an ease-out curve, a single, restrained "proof reveal" moment rather than a distracting continuous ticker.

**Shared Colors:** Numerals in `primary-600`; labels in `text-secondary`; band background in `primary-50` (light mode) / equivalent dark-mode surface.

**Shared Responsive behaviour:** 4-column desktop grid collapses to 2×2 on tablet and a single vertically-stacked column on mobile, with reduced numeral size (`heading-2` scale) to fit comfortably.

**Shared Call to Action:** None individually on the counters themselves — the band as a whole reinforces the Hero's CTAs rather than introducing new ones.

### 7. 10,000+ Questions Counter
Label: "Questions in the Bank." Represents the scale of the Question Bank (`docs/Database.md` §4.3) — deliberately phrased to at least match Vetri App's own headline claim (10,000+ AI-extracted questions, per `docs/CompetitorAnalysis.md`) rather than ceding that specific number to them.

### 8. Current Affairs Counter
Label: "Days of Current Affairs Covered" (or an equivalent cumulative count). Directly targets Winmeen's core strength (per `docs/CompetitorAnalysis.md`) by proving current-affairs depth exists here too, reinforced later by the live preview in §13.

### 9. Mock Test Counter
Label: "Mock Tests Available." Reinforces the Practice/Live Exams module's depth (`docs/InformationArchitecture.md` §7.2, §7.10).

### 10. Students Counter
Label: "Aspirants Preparing With Nalanda." The most emotionally resonant counter — signals belonging and momentum ("aspirants like you are already here"), directly supporting the social-proof gap identified against Vetri App.

---

## 11. Feature Cards

**Purpose:** Translate the platform's full capability set (per `docs/PRD.md` §7, §10) into a scannable, benefit-led grid — the section that does the actual "convincing" work for a visitor still deciding whether Nalanda is worth their time.

**Layout:** A 3×2 grid on desktop (6 cards: AI Tutor, Smart Practice, Weekly Live Exam, Analytics, Community, Study Planner), 2-column on tablet, single-column stacked on mobile. Each card follows the standard Card component (`docs/UI_Design_System.md` §14): icon → title → one-sentence benefit copy → subtle "Learn more" text link (not a full button, to avoid CTA fatigue against the section's own closing action).

**UI:** Icon rendered in a colored rounded-square chip atop each card (AI Teal chip specifically for the AI Tutor card, per the design system's AI-color rule; `primary-400` chips for the rest), card body in standard `surface-raised-1` chrome.

**Animations:** Cards fade-and-rise into view on scroll (staggered ~60ms per card, `motion-base`), and lift slightly (`shadow-sm`→`shadow-md`) on hover — standard interactive-card behavior (§14 of the design system), nothing bespoke per card.

**Colors:** Card chrome per §14 of the design system; icon chips per the color rules above; body copy in `text-primary`/`text-secondary`.

**Icons:** One distinct glyph per card from the outline icon system (§23) — AI Tutor (chat/spark glyph, teal), Smart Practice (target/checkmark glyph), Weekly Live Exam (calendar/clock glyph), Analytics (chart glyph), Community (people/speech-bubble glyph), Study Planner (checklist/calendar glyph).

**Responsive behaviour:** 3×2 → 2×3 → 1×6 grid reflow across desktop/tablet/mobile; card internal padding reduces slightly on mobile to keep total scroll length reasonable.

**Call to Action:** A single section-level CTA beneath the grid — **Explore All Features** (secondary button, anchor-scrolls or routes to a fuller feature-detail page) — individual cards intentionally avoid their own competing buttons.

### 11a. AI Tutor
The platform's signature differentiator — copy emphasizes instant doubt resolution and personalized explanations in Tamil or English, directly visualized with the AI Teal treatment established in the Hero (§5–§6), giving this card a strong "I've seen this before" continuity through the page.

### 11b. Smart Practice
Emphasizes adaptive difficulty and topic-wise quizzes (`docs/PRD.md` §10, Feature 2) — copy angle: "practice that gets smarter as you do."

### 11c. Weekly Live Exam
Highlights the scheduled, cohort-wide mock-test format (`docs/InformationArchitecture.md` §7.10) — copy angle: "compete with thousands of aspirants, every week," directly claiming the whitespace no competitor currently owns well (per `docs/CompetitorAnalysis.md`).

### 11d. Analytics
Highlights percentile/rank and weak-area detection — copy angle: "know exactly where you stand," paired with a small illustrative mini version of the percentile ring component (§39 of the design system) rendered as a static preview graphic.

### 11e. Community
Highlights doubt-forum and peer discussion — copy angle: "you're not preparing alone."

### 11f. Study Planner
Highlights the AI-generated, adaptive daily plan — copy angle: "a plan built around your life, not a generic syllabus."

---

## 12. Daily Current Affairs Preview

**Purpose:** Prove, not just claim, current-affairs depth and freshness — the single most direct, evidence-based counter to Winmeen's core strength and Vetri App's current-affairs gap (both per `docs/CompetitorAnalysis.md`).

**Layout:** A horizontally-scrollable (mobile) / 3-column grid (desktop) row of "today's" current-affairs cards, each showing a date chip, headline, and a short excerpt — pulled live from the actual `Current Affairs` collection (`docs/Database.md` §4.5), never mocked/static placeholder content, per `CLAUDE.md`'s "never use dummy data" rule.

**UI:** Standard card chrome (§14 of the design system); a small "Today" or dated overline label (§4, `overline` scale) at the top of each card to visibly prove freshness/recency to a skeptical visitor.

**Animations:** Standard scroll-reveal fade/rise (`motion-base`); the horizontal scroll row on mobile includes subtle momentum/snap-to-card behavior.

**Colors:** Standard card chrome; the "Today" date chip uses `primary-100` background with `primary-600` text for a light, confident emphasis.

**Icons:** A small newspaper/document glyph as the section's header icon; no per-card icons needed (the date chip carries enough visual distinction).

**Responsive behaviour:** 3-column grid desktop → 2-column tablet → horizontally-scrollable single-row carousel on mobile (protecting vertical scroll length on small screens while still surfacing 4–5 items).

**Call to Action:** **See Full Current Affairs** (secondary button) — routes toward Registration when clicked by an unauthenticated visitor (current affairs previews are public per `docs/InformationArchitecture.md` §3, but full history/quizzes require an account).

---

## 13. Top Rankers

**Purpose:** Aspirational, achievement-oriented social proof — shows real (consenting) high performers on the platform's mock tests/leaderboards, directly operationalizing the "earned celebration" principle from `docs/UI_Design_System.md` at the marketing level.

**Layout:** A horizontal row of 5–6 "ranker cards" (avatar, first name + last initial, exam category badge, percentile/rank achieved), desktop grid, horizontally scrollable on mobile.

**UI:** Each card uses the tier/achievement badge treatment (§18, §39 of the design system) — a small gold-accented rank indicator (#1, #2, #3...) for the very top entries specifically, using the Sangam Gold accent reserved for achievement moments.

**Animations:** Cards fade/rise on scroll-into-view; the #1 ranker's card may carry a single, subtle celebratory shimmer (`motion-celebratory`, fired once on view, never looping) consistent with the design system's "celebration is earned and rare" principle.

**Colors:** Sangam Gold (`accent-gold-600`, §7 of the design system) for rank badges; standard card chrome otherwise — gold is used sparingly, only on the rank indicator itself, not as a card background.

**Icons:** A small trophy/medal glyph accompanying the top 3 positions specifically; exam-category pictograms (§23 of the design system) identify which exam each ranker is associated with.

**Responsive behaviour:** 5–6 card row desktop → horizontally scrollable single row on tablet/mobile, matching the Current Affairs carousel pattern (§12) for interaction consistency.

**Call to Action:** **View Full Leaderboard** (ghost/secondary button) — routes to Registration/Login, since the full leaderboard is an authenticated feature (`docs/InformationArchitecture.md` §7).

---

## 14. Success Stories

**Purpose:** Deep, narrative-driven proof — one or two fuller "before and after" stories (e.g., a first-generation aspirant who cleared Group 4, a repeat Group 1 candidate who finally cleared Mains) that let a skeptical visitor see themselves in a specific, credible outcome, rather than a generic quote.

**Layout:** A larger, editorial-style two-column layout per story — photo/illustration on one side, a short narrative (persona name, exam cleared, a specific detail about their journey, e.g., "cleared Group 4 after 3 months using the AI study plan") on the other. Typically 2 stories shown, with a link to view more.

**UI:** Distinct from the compact Testimonials cards (§16) — this section is intentionally more spacious and long-form, using `heading-2`/`body-large` type generously, closer to a magazine feature layout than a grid of cards.

**Animations:** A gentle horizontal reveal (image and text panels animate in from opposite sides slightly offset, `motion-base`) on scroll-into-view — the only place on the page using a directional (rather than purely vertical) entrance animation, marking this section as distinct in tone.

**Colors:** Neutral, editorial palette (`surface-base`, `text-primary`/`text-secondary`) — deliberately avoids heavy brand-color treatment here so the *person's* story is the visual focus, not Nalanda's branding.

**Icons:** A small exam-category pictogram (§23) tags which exam each story relates to; no other iconography, keeping focus on the photo/narrative.

**Responsive behaviour:** Desktop/tablet keep the two-column split; mobile stacks image above text, full-width.

**Call to Action:** **Read More Success Stories** (secondary button), routing to a dedicated stories/testimonials page — plus an implicit narrative CTA within the copy itself ("Start your own story" linking to Registration).

---

## 15. Premium Section (Pricing)

**Purpose:** Convert trust built by the sections above into a clear, honest purchase decision — deliberately the most transparent pricing presentation in the category, directly resolving the "contact us for a quote" friction found in Vetri App, Dexter Academy, and Shankar IAS Academy (per `docs/CompetitorAnalysis.md`).

**Layout:** A 4-column pricing comparison table (Free / Plus / Pro / Institutional) on desktop, collapsing to a swipeable single-column carousel of plan cards on mobile — structure matches the Premium Components pricing-table spec (§36 of the design system) exactly.

**UI:** Each column: tier name, price (monthly/annual toggle above the table), a short list of included features with checkmarks, and a CTA button. The Pro column carries a subtle `primary-100` background highlight (not a "Most Popular" badge unless genuinely data-backed, per the design system's honesty principle).

**Animations:** Standard scroll-reveal fade/rise; the monthly/annual toggle triggers a smooth cross-fade of the displayed prices (`motion-fast`), never a jarring instant swap or full-table re-render flicker.

**Colors:** Standard card/table chrome (§16, §36 of the design system); Pro column highlight in `primary-100`; Institutional column CTA styled distinctly (secondary/outline) since it routes to a sales-contact flow rather than instant self-serve checkout.

**Icons:** Checkmark glyphs for included features, dash/muted glyph for not-included — consistent, simple, no per-tier custom iconography.

**Responsive behaviour:** Desktop shows all 4 tiers simultaneously for direct comparison; tablet may show 2 at a time with horizontal scroll; mobile presents one plan card at a time in a swipeable carousel, with the user's likely-best-fit tier (based on any exam-goal signal already captured, if returning) shown first.

**Call to Action:** **Upgrade to Plus/Pro** (primary button, routes to Registration → Payments flow) per consumer tier; **Talk to Sales** (secondary button) for the Institutional tier, reflecting the longer B2B decision cycle documented for the Rajendran persona (`docs/UserPersonas.md`).

---

## 16. Testimonials

**Purpose:** Broad-based trust reinforcement through volume and diversity of voice — complementing the deep, narrative Success Stories (§14) with many shorter, varied quotes so a visitor from *any* persona (student, working professional, coaching-center student) can find someone who sounds like them.

**Layout:** A masonry or auto-scrolling multi-row carousel of compact quote cards (avatar/initials, name, exam category, a 1–2 sentence quote) — deliberately higher volume and lower individual weight than Success Stories.

**UI:** Compact card chrome (§14 of the design system), quote text in `body-medium`, attribution in `body-small`/`text-secondary`.

**Animations:** A slow, continuous auto-scroll (marquee-style, pausable on hover/focus) for the desktop carousel — distinct from the "reveal once" pattern used elsewhere, appropriate here because the content is meant to convey ongoing volume/breadth rather than a single reveal moment.

**Colors:** Standard neutral card chrome; a small exam-category color-coded tag (using the existing exam pictogram set, §23) per card for quick scanning.

**Icons:** Exam-category pictograms as small tags; a subtle quotation-mark glyph as a background watermark within each card (low-opacity, decorative only).

**Responsive behaviour:** Multi-row auto-scroll desktop → single-row auto-scroll tablet/mobile, with auto-scroll speed reduced on mobile to remain comfortably readable, and paused entirely under `prefers-reduced-motion` (§31 of the design system).

**Call to Action:** None section-specific — this section's job is ambient trust-building; it does not need to redirect attention away from itself with a competing button.

---

## 17. FAQ

**Purpose:** Resolve the specific objections a rational, price- and trust-conscious visitor (per every persona in `docs/UserPersonas.md`) would still have after the sections above — pricing specifics, Tamil-language depth, data privacy, and how AI features actually work.

**Layout:** A single-column accordion list (8–12 questions), grouped loosely by theme (Getting Started, Pricing & Plans, Content & Language, AI Features, Privacy & Data) via subtle section dividers rather than hard tab separation.

**UI:** Each accordion row: question in `heading-4`, a chevron/plus glyph indicating expand state, answer copy in `body-medium` revealed on expand.

**Animations:** Expand/collapse uses a smooth height-transition (`motion-fast`, 180ms) with the chevron rotating in sync — only one item can be expanded at a time by default, keeping the list scannable rather than becoming a long, fully-expanded wall of text.

**Colors:** Neutral chrome throughout (`surface-base`/`surface-raised-1`, `border-subtle` dividers) — no brand-color emphasis needed here; this section's job is clarity, not persuasion.

**Icons:** A simple chevron/plus-minus toggle glyph per row; no additional decorative iconography.

**Responsive behaviour:** Identical accordion behavior across all breakpoints — this pattern scales naturally to any screen width without structural change, only spacing/type-size adjustments on mobile.

**Call to Action:** A closing prompt beneath the list — **Still have questions? Contact Support** (ghost button/link) — for objections not covered by the listed FAQ items.

---

## 18. Footer

**Purpose:** Comprehensive sitemap and trust/legal anchor — the page's final opportunity to route a visitor to exactly what they were looking for if they've scrolled this far without converting, plus the mandatory legal/compliance surface (DPDP Act privacy policy, terms).

**Layout:** A multi-column layout — Column 1: logomark + short brand statement + social links; Columns 2–4: link groups (Exams, Company, Legal/Support) mirroring the site's actual navigation structure (`docs/InformationArchitecture.md` §3); bottom bar: copyright line + language toggle + a final small trust badge row (e.g., "Secured by Razorpay," data-privacy mention).

**UI:** Distinctly darker/deeper surface than the rest of the page (`primary-900`/ink-toned background in light mode, or the standard dark-mode `surface-base` if the page is being viewed in dark theme) — a common, effective convention for signaling "you've reached the end of the page."

**Animations:** None beyond standard link-hover states — the Footer is explicitly a low-motion, purely functional zone; introducing animation here would be inappropriate given its utilitarian purpose.

**Colors:** Inverted/darker palette relative to the rest of the page — white/`text-primary`-on-dark text and link colors, with the primary brand color reserved for the small "Get Started" repeat-CTA link only (see below), so it doesn't visually compete with the page's earlier, more prominent CTAs.

**Icons:** Social-media glyphs (outline style, §23 of the design system) for any linked social channels; a small padlock/shield glyph beside the data-privacy trust line.

**Responsive behaviour:** 4-column desktop layout collapses to 2-column tablet, then a single stacked column with collapsible link groups (accordion-style, matching the FAQ's interaction pattern for consistency) on mobile to avoid an extremely long footer on small screens.

**Call to Action:** A final, low-emphasis **Get Started Free** text link (not a heavy button, to respect the Footer's utilitarian tone) alongside the standard sitemap/legal links — the last, quietest nudge on the page for a visitor who has read everything and is finally ready.

---

## Cross-Document Consistency Notes

- Every color, motion, radius, and shadow value referenced above is drawn directly from `docs/UI_Design_System.md` — this document introduces **no new tokens**, only new *compositions* of existing ones, which is exactly how a design system is meant to be used.
- The AI Teal / Sangam Gold color discipline established in the design system (§7, §35, §36) is what makes the Hero's AI Assistant (§6), the Feature Cards' AI Tutor card (§11a), and the Top Rankers' gold badges (§13) all feel like one coherent visual language rather than isolated marketing flourishes.
- The page's public/pre-auth content boundaries (what's shown vs. gated) match `docs/InformationArchitecture.md` §3 exactly — Current Affairs previews and Pricing are public; full Leaderboard and full Current Affairs history require Registration.

---

*End of Document.*
