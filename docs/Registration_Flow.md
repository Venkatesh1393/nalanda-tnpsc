# Nalanda TNPSC — Registration Flow Design

| | |
|---|---|
| **Document Owner** | UX Design / Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/Authentication.md` (identity/session mechanics), `docs/UserJourney.md` Screens 2–3 (baseline Registration/OTP), `docs/UserPersonas.md` (Priya, Selvam, Rajendran), and `docs/UI_Design_System.md` (visual tokens) as binding references this document extends rather than duplicates |

### Scope Note

`docs/UserJourney.md` already specifies a single, generic Registration → OTP → Choose Exam path. This document **expands that into three distinct registration paths** — the individual-aspirant path it already implied, plus two paths the platform genuinely needs but hadn't yet been designed: **Coaching Center (Student)** and **Institution (Owner/Admin)**, mapped directly to the Selvam and Rajendran personas in `docs/UserPersonas.md`. Where a screen or mechanism (Google Login, Email OTP, Terms/Privacy) is shared across paths, it is designed once in Section 6 and referenced from each path's flow, rather than re-specified three times.

---

## 1. Registration Architecture Overview

```
                         ┌────────────────────────┐
                         │   Choose Your Path       │
                         │   (Screen 0)              │
                         └───────────┬───────────────┘
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌─────────────────┐    ┌───────────────────────┐  ┌─────────────────────┐
   │   PATH A          │    │   PATH B                │  │   PATH C              │
   │   Individual      │    │   Coaching Center       │  │   Institution         │
   │   Aspirant         │    │   Student                │  │   (Owner/Admin)        │
   └─────────┬─────────┘    └───────────┬─────────────┘  └───────────┬───────────┘
             │                          │                            │
             ▼                          ▼                            ▼
   Sign-Up Method (§6.1/6.2)   Sign-Up Method (§6.1/6.2)     Institution Details (§5.1)
             │                          │                            │
             ▼                          ▼                            ▼
   OTP if Email (§6.3)          OTP if Email (§6.3)          Owner Identity Verification
             │                          │                     (reuses §6.1/6.2/6.3)
             ▼                          ▼                            │
   Terms & Privacy (§6.6/6.7)   Terms & Privacy (§6.6/6.7)            ▼
             │                          │                     Plan Selection (§5.3)
             ▼                          ▼                            │
   [Referral Code — optional,    Institute Code Entry (§4.2,          ▼
    embedded field, §6.5]        new, path-specific)          Terms & Privacy +
             │                          │                     Verification Review (§5.4)
             ▼                          ▼                            │
   → docs/UserJourney.md          → docs/UserJourney.md               ▼
     Screen 4 (Choose Exam)         Screen 4 (Choose Exam)     Staff Invitation +
                                                                Password Setup (§5.5)
                                                                       │
                                                                       ▼
                                                                Admin Panel Welcome (§5.6)
```

**Why three paths, not one generic form:** an individual aspirant, a student already enrolled at a physical coaching center, and a coaching-center *owner* setting up an institutional account have fundamentally different information needs, trust requirements, and outcomes (personal dashboard vs. personal dashboard *linked* to a cohort vs. an entire Admin Panel). Forcing all three through one form would mean either overwhelming individual aspirants with irrelevant fields, or under-serving institutions with too little structure — a mistake several competitors make by treating B2B as an afterthought (per `docs/CompetitorAnalysis.md`'s finding that no competitor executes institutional onboarding well).

---

## 2. Screen 0 — Choose Your Path

**Purpose:** Route the visitor to the correct registration experience in one tap, before asking for any personal information — the single highest-leverage screen for preventing the wrong-path frustration a generic form would cause.

**Layout:** Three large, tappable option cards (not a dropdown — visibility matters more than compactness here): "I'm preparing for a TNPSC exam" (Individual), "I study at a coaching center" (Coaching Center Student), "I run a coaching center or institute" (Institution). Each card carries a one-line clarifying sub-text so a visitor isn't guessing which applies to them.

**Validations:** None (a pure selection screen, no form fields yet).

**Animations:** Cards fade-and-rise in on load (`motion-base`, staggered ~60ms per card, per `docs/UI_Design_System.md` §19); selecting a card triggers a brief highlight-then-forward transition rather than an instant hard cut, so the path change feels intentional.

**Loading:** None — this is a static, pre-fetched screen with no backend dependency.

**Errors:** None possible at this step.

---

## 3. Path A — Individual Registration

This path serves the Priya, Karthik, and Divya personas. Its screens are: **Sign-Up Method** (§6.1/§6.2) → **OTP** if Email chosen (§6.3) → **Terms & Privacy** (§6.6/§6.7), with an optional **Referral Code** field embedded in the Sign-Up Method screen (§6.5) → handoff to `docs/UserJourney.md` Screen 4 (Choose Exam).

**What's distinctive about this path:** it is the shortest of the three by design — every additional field costs conversion for the highest-volume, most price-sensitive segment (per `docs/UserPersonas.md`, Priya's persona explicitly distrusts friction-heavy signup). No institute code, no business details, no plan selection is ever shown here.

---

## 4. Path B — Coaching Center Student Registration

This path serves the Selvam persona — a student already enrolled at a physical or hybrid coaching institute who wants their Nalanda account linked to that institute's cohort (for the institute's own analytics visibility and any institute-subsidized premium access, per `docs/UserPersonas.md`'s Rajendran-side institutional features).

**Shared screens:** Sign-Up Method (§6.1/§6.2) → OTP if Email (§6.3) → Terms & Privacy (§6.6/§6.7) — identical to Path A.

### 4.2 Institute Code Entry (Path-Specific)

**Purpose:** Link the newly-created individual account to a specific `Institution` record (`docs/Database.md` §4.1, Institutions cluster), so the student's activity becomes visible in their coaching center's cohort analytics (`docs/InformationArchitecture.md` §5, Institutional/B2B Management) without requiring the student to have gone through the Institution's own onboarding.

**Placement in flow:** deliberately placed **after** identity verification (Google/OTP), not before — validating and linking a code to an anonymous, unauthenticated visitor would be architecturally messier and more abuse-prone than linking it to an already-created, verified account.

**Layout:** A single text field ("Enter your institute code"), a "Skip for now" link (linking later remains possible from Settings → Profile, per `docs/InformationArchitecture.md` §7.5, so this step is never a hard blocker), and — once a valid code is entered — a **confirmation card** showing the resolved institute's name and branch (e.g., "Joining: Dexter Academy — Madurai Branch") before the student commits, so they're never linked to the wrong institute silently.

**Validations:** Code format checked client-side (alphanumeric, fixed length); server-side lookup confirms the code maps to an active `Institution` record and hasn't exceeded any seat-limit configured by that institute's subscription (`docs/Database.md` §4.6).

**Animations:** The confirmation card slides/fades in (`motion-fast`) only after a successful server-side lookup — never appears optimistically before validation, to avoid ever showing a confirmation for an invalid code.

**Loading:** An inline spinner within the text field's trailing edge while the code is being validated (debounced, not validated on every keystroke) — short enough that a full-screen loading state would be unnecessary and would feel sluggish.

**Errors:** `INVALID_CODE` ("We couldn't find that code — check with your coaching center"), `CODE_SEAT_LIMIT_REACHED` ("This institute has reached its student limit — contact them to add more seats," a message aimed at prompting the *student* to relay this back to their institute, since the institute is Nalanda's actual billing relationship here), `CODE_EXPIRED`.

---

## 5. Path C — Institution Registration (Owner/Admin)

This path serves the Rajendran persona — a coaching-center owner or administrator setting up their institute's presence on Nalanda for the first time. It is intentionally the longest and most structured of the three paths, matching the slower, more deliberate B2B decision cycle already documented for this persona.

### 5.1 Institution Details

**Purpose:** Capture the business context needed to configure an institutional account correctly from the start (per `docs/Database.md`'s planned `Institutions` collection).

**Layout:** A form capturing: institute name, number of branches, primary city/region, owner's full name, business email, business phone. Positioned with reassuring supporting copy up front (e.g., "This takes about 3 minutes — you can invite your team afterward") given this persona's stated preference for evidence that an investment of time will pay off, per `docs/UserPersonas.md`.

**Validations:** Institute name required (2–100 characters); business email required and validated as a real, deliverable-format address; phone number validated against a standard Indian mobile/landline format; branch count must be a positive integer.

**Animations:** Standard form-field focus/validation animations (per `docs/UI_Design_System.md` §15) — no special flourish; this screen's job is efficient data capture, not delight.

**Loading:** Standard button-spinner on submit while the draft `Institution` record is created server-side.

**Errors:** `VALIDATION_ERROR` per field (inline, not a single generic banner — this persona is filling in unfamiliar business-onboarding fields for the first time and benefits from field-specific correction); `INSTITUTE_NAME_ALREADY_EXISTS` (a soft warning, not a hard block, since two different institutes can share a common name across cities — surfaced as "A similarly named institute already exists in [other city] — is this you?" to catch accidental duplicate signups without blocking legitimate ones).

### 5.2 Owner Identity Verification

Reuses the same **Sign-Up Method** (§6.1/§6.2) and **OTP** (§6.3) mechanisms as Paths A and B — the institution *owner* is still a normal Nalanda user identity underneath, just one that will carry an `institutionId` reference and elevated permissions scoped to their own institute's Admin Panel (`docs/Authentication.md` §6–§7). No separate identity mechanism is invented for institution owners.

### 5.3 Plan Selection

**Purpose:** Present transparent, self-serve institutional pricing — a deliberate differentiator against Vetri App, Dexter Academy, and Shankar IAS Academy's opaque "contact us for a quote" institutional pricing (per `docs/CompetitorAnalysis.md`'s recommendation #5).

**Layout:** A per-seat or per-branch pricing table (mirroring the Premium Section pricing-table pattern from `docs/Landing_Page_Design.md` §15), with a seat-count input that live-updates the displayed total price, and a clearly separated "Talk to Sales" path for institutes large enough to want a custom negotiated arrangement.

**Validations:** Seat count must be a positive integer within a sane platform-defined range (e.g., 1–5,000 self-serve; above that routes to "Talk to Sales" instead of self-serve checkout).

**Animations:** The live price recalculation on seat-count change uses a smooth numeral cross-fade (`motion-fast`, tabular numerals per `docs/UI_Design_System.md` §4) rather than an abrupt number swap.

**Loading:** None beyond the price recalculation, which is computed client-side from a published rate table, not a server round-trip, keeping this interaction instant.

**Errors:** `SEAT_COUNT_OUT_OF_RANGE`, deferring to the "Talk to Sales" path rather than a hard error message.

### 5.4 Terms & Privacy + Verification Review

Reuses the Terms/Privacy consent mechanism (§6.6/§6.7), but with an **institution-specific agreement variant** covering data-processing terms for the students the institute will onboard (a data-processor relationship distinct from the individual consumer terms, addressing DPDP Act obligations for institutional data handling).

**Additional step unique to this path:** because an institutional account carries materially more trust and liability (billing at scale, visibility into many students' data), newly created Institution accounts enter a **brief automated + light manual review queue** before full activation (business email domain plausibility check automatically, with a human review fallback only if that check is inconclusive) — the owner can still explore a limited preview of the Admin Panel immediately, but full billing/seat activation is gated on this review completing, typically within one business day. This is disclosed clearly on-screen ("Your account is being verified — you'll receive an email within 1 business day") rather than silently delaying activation.

### 5.5 Staff Invitation & Password Setup

**Purpose:** Let the institution owner invite branch administrators, teachers, or other staff who need Admin Panel access — this is the **one deliberate, scoped exception** to Nalanda's otherwise fully passwordless identity system (§6.4 explains why).

**Layout:** An "Invite Team Members" screen — email address + role (`content_editor`/`moderator`/branch-scoped `admin`) per invitee, with a "Send Invites" action; invitees receive an email with a secure, single-use invite link.

**Validations:** Each invitee email must be uniquely valid and not already associated with another Nalanda account under a different institution (to avoid identity conflicts); at least one role must be selected per invite.

**Animations:** Each successfully-sent invite row animates to a "Sent ✓" state (`motion-fast`) inline within the list, so the owner gets clear per-invite confirmation rather than one generic "invites sent" banner covering an unknown outcome per row.

**Loading:** A per-row sending-state spinner while each invite email dispatches; the "Send Invites" button itself shows a brief aggregate spinner if sending several invites at once.

**Errors:** `EMAIL_ALREADY_LINKED_ELSEWHERE`, `INVALID_ROLE_SELECTION`, `INVITE_SEND_FAILED` (with a per-row retry action, since a transient email-delivery failure on one invite shouldn't force re-entering the whole batch).

**The Password Mechanism (invitee side):** When an invited staff member opens their invite link, they land on a **Set Your Password** screen — this is the *only* place in the entire product where a password is created or used. See §6.4 for the full mechanism, validation, and security rationale.

### 5.6 Admin Panel Welcome

A brief, guided first-run screen inside the Admin Panel itself (per `docs/InformationArchitecture.md` §5) — not re-specified here in detail, since the Admin Panel's own navigation and content structure are already fully designed in that document. This screen's sole job is orienting a first-time owner to where Content Management, User Management, and Cohort Analytics live.

---

## 6. Cross-Cutting Mechanisms (Explained Once, Used Across All Paths)

### 6.1 Google Login

**Purpose:** The fastest, lowest-friction identity path, trusted for its built-in email verification (`docs/Authentication.md` §3).

**Screen:** A single button ("Continue with Google") on the Sign-Up Method screen — no additional Nalanda-rendered form fields, since Google's own OAuth consent screen collects everything needed.

**Validations:** None client-side beyond the button click itself; all validation (token signature, expiry, email ownership) happens server-side against the returned Firebase ID token.

**Animations:** Button shows a brief loading spinner overlay while the OAuth popup is open; on return, a success state (`motion-fast` checkmark micro-animation) plays for roughly 400ms before advancing to the next screen — long enough to register as a positive confirmation, short enough not to feel like a delay.

**Loading:** The OAuth popup itself is the primary "loading" surface; the parent page shows a dimmed/disabled state while the popup is open so the user isn't confused about which window to interact with.

**Errors:** Popup blocked (instructional message with a "try again" / fallback redirect-based flow), user cancels the popup (returns silently to the Sign-Up Method screen, not treated as an error), network failure during token exchange (clear retry prompt) — all detailed originally in `docs/Authentication.md` §3 and `docs/UserJourney.md` Screen 2.

### 6.2 Email Login (Registration Entry)

**Purpose:** The alternative identity path for users without or preferring not to use a Google account.

**Screen:** Name + email fields on the Sign-Up Method screen (shown when "Continue with Email" is selected, replacing the single-button Google view with a small form, via a smooth height-expand animation rather than a full page navigation).

**Validations:** `name` 2–60 characters; `email` valid format, checked against existing-account records server-side on submit (not on every keystroke, to avoid enumeration-probing feel and unnecessary network chatter).

**Animations:** Form fields fade/expand in (`motion-fast`) when this method is selected; the submit button shows the standard loading-spinner state (`docs/UI_Design_System.md` §13) while the registration request is in flight.

**Loading:** Submit button disables and shows an inline spinner; typical response time is sub-second (account-shell creation + OTP dispatch), so no separate full-page loading state is needed.

**Errors:** `EMAIL_ALREADY_REGISTERED` (with a direct "Log in instead?" link, never a silent duplicate-account creation), `VALIDATION_ERROR` per field — detailed originally in `docs/API.md` §1 (`POST /auth/register`).

### 6.3 OTP

**Purpose:** Verifies email ownership for the Email Login path — and, as established in `docs/Authentication.md` §11, *is* the email-verification event itself, not a separate step.

**Screen:** The dedicated 6-digit segmented-input OTP screen already fully specified in `docs/UserJourney.md` Screen 3 and `docs/Authentication.md` §2 — this document does not re-derive it, but notes one registration-flow-specific nuance: **the OTP screen's copy adapts per path** (e.g., Path C's OTP screen references "verifying your account" rather than generic "verifying your email," since the institution owner has already provided substantial business context by this point and the copy should feel continuous with that, not like a context reset).

**Validations, Animations, Loading, Errors:** Unchanged from `docs/Authentication.md` §2 and `docs/UserJourney.md` Screen 3 — 10-minute TTL, 5-attempt cap, 60-second resend cooldown, autofill support, all apply identically regardless of which of the three paths the user arrived from.

### 6.4 Password (Scoped Exception — Institutional Staff Invites Only)

**Why this exists at all:** `docs/Authentication.md` establishes Nalanda as a fully passwordless system for every individual and institution-owner identity. The **one deliberate exception** is staff accounts created via an institution owner's invite (§5.5) — a different trust model applies here: the owner, not the invitee, is the accountable party initiating the relationship, and many invited staff (teachers, branch admins) may not have or want to use a personal Google account for a work-assigned tool. Email+password, gated behind a secure single-use invite link, is the standard, well-understood pattern for this specific scenario across B2B SaaS generally.

**Screen — "Set Your Password" (invitee-side, reached only via a valid invite link):**
- **Layout:** Invitee's email (pre-filled, read-only, confirming which invite this is), a new-password field, a confirm-password field, and a "Set Password & Continue" button.
- **Validations:** Minimum 10 characters, must include at least one letter and one number (a straightforward, user-friendly policy rather than an overly restrictive special-character mandate that tends to push users toward predictable substitutions); confirm-password must match exactly; the invite link itself is single-use and time-limited (e.g., 7 days), checked before the form is even shown.
- **Animations:** A password-strength indicator (weak/fair/strong, simple color-coded bar) updates live as the invitee types (`motion-instant`), giving immediate, low-friction feedback without a blocking validation message on every keystroke.
- **Loading:** Standard submit-button spinner while the password is hashed and stored server-side (never in plaintext, never logged).
- **Errors:** `INVITE_LINK_EXPIRED` (with a "Request a new invite" path that notifies the institution owner), `INVITE_LINK_ALREADY_USED`, `PASSWORDS_DO_NOT_MATCH`, `PASSWORD_TOO_WEAK`.
- **What happens after:** the invitee is now a normal authenticated Nalanda user (with a role scoped by whatever the owner selected in §5.5), and — notably — **this password becomes their permanent login credential going forward**; they do not separately also get a Google/OTP option unless they choose to link one later from Settings, keeping the mental model simple ("I log in with the password my institute set up for me").

### 6.5 Referral Code

**Purpose:** Supports the peer-driven and institute-driven growth patterns identified in `docs/UserPersonas.md` (Selvam's batchmate-driven adoption; the institute-referral program recommended for Rajendran).

**Screen:** Not a dedicated screen — a collapsed, optional "Have a referral code?" text link on the Sign-Up Method screen (Paths A and B) that expands into a single text field when tapped, per progressive-disclosure best practice (most users have no code and shouldn't see an empty field demanding attention).

**Validations:** Format-checked client-side (alphanumeric, fixed length); server-side lookup confirms the code is active and, if it carries a usage cap, hasn't been exhausted — validated asynchronously on blur, not blocking form submission if left empty.

**Animations:** The field expands via a smooth height-transition (`motion-fast`) when the link is tapped; a small inline checkmark appears once a valid code is confirmed.

**Loading:** Inline, debounced validation spinner within the field — never a full-page loading state for what is an optional, low-stakes field.

**Errors:** `REFERRAL_CODE_INVALID` (a soft, non-blocking inline message — an invalid code never prevents account creation, it simply isn't applied), `REFERRAL_CODE_EXPIRED`.

### 6.6 Terms

**Purpose:** Legally required consent to the platform's Terms of Service before an account is created.

**Screen:** A required checkbox ("I agree to the Terms of Service") paired with an inline link opening the full document in a modal/new tab (never pre-checked, per standard consent-integrity practice) — positioned immediately above the final "Create Account" action across all three paths, with the **Institution path additionally showing a second checkbox** for the institutional data-processing addendum (§5.4).

**Validations:** Checkbox must be checked before the "Create Account" button becomes enabled (button is visibly present but disabled/low-opacity beforehand, not hidden, so the requirement is discoverable rather than confusing).

**Animations:** Checkbox uses the standard toggle animation (`docs/UI_Design_System.md` §15); the "Create Account" button's enabled-state transition is a simple opacity/color cross-fade (`motion-fast`) as soon as the checkbox is checked.

**Loading:** N/A — this is a static consent gate, not an async operation itself.

**Errors:** A single, gentle inline prompt if the user attempts to submit without checking the box ("Please accept the Terms to continue") — never a jarring full-screen error for a simple unchecked box.

### 6.7 Privacy

**Purpose:** DPDP Act-aligned, explicit consent to data collection and processing (per `docs/PRD.md` §8, `docs/Architecture.md` §10).

**Screen:** Bundled with the Terms checkbox as a combined consent statement ("I agree to the Terms of Service and Privacy Policy") for Paths A and B, where a single combined consent is standard and sufficient; **kept as a separate, distinct checkbox for Path C** given the institutional data-processing addendum genuinely covers different obligations (processing on behalf of the institute's students) that shouldn't be silently bundled into the same checkbox as the owner's own personal consent.

**Validations, Animations, Loading, Errors:** Identical mechanism to §6.6 — the two are presented as parallel, equally-weighted consent gates, never with Privacy treated as secondary or pre-checked by default.

---

## 7. Validation Summary (All Fields, All Paths)

| Field | Path(s) | Rule |
|---|---|---|
| `name` | A, B, C (owner) | 2–60 characters |
| `email` | A, B, C, staff invites | Valid format; uniqueness checked server-side |
| `otp` | A, B, C | Exactly 6 numeric digits, 10-minute TTL, 5-attempt cap |
| `institute name` | C | 2–100 characters |
| `institute code` | B | Alphanumeric, fixed length, active-record + seat-limit check |
| `branch count` | C | Positive integer |
| `seat count` | C | Positive integer within self-serve range, else routed to Sales |
| `referral code` | A, B | Alphanumeric, fixed length, active + not-exhausted check (soft-fail) |
| `password` | Staff invites only | Min. 10 characters, ≥1 letter + ≥1 number, confirm-match required |
| Terms/Privacy checkbox(es) | A, B, C | Must be checked before account creation proceeds |

---

## 8. Error Handling Summary

| Category | Principle Applied Everywhere |
|---|---|
| **Duplicate accounts** | Never silently create a second account for an already-registered email — always offer a direct path to the existing account instead (login, or account-linking per `docs/Authentication.md` §3) |
| **Invalid codes** (institute, referral, invite link) | Never a hard, unexplained failure — always a specific, actionable message naming what's wrong and what to do next |
| **Field-level validation** | Inline, per-field messages, never a single generic "form has errors" banner, so the user isn't left guessing which field to fix |
| **Network/server failures** | Retry-friendly by design — no step in any of the three paths destroys previously entered data on a failed submission |
| **Institutional review delay** (§5.4) | Disclosed transparently on-screen with an expected timeframe, never a silent hold that looks like a bug |

---

## 9. Animation Summary

| Moment | Treatment |
|---|---|
| Path/screen transitions | `motion-base` fade-and-rise, consistent across all three paths |
| Method selection (Google vs. Email) | Smooth height-expand for the revealed form, not a full navigation |
| Field-level success (valid code, valid OTP) | Small inline checkmark, `motion-fast` |
| Button loading | Inline spinner replacing label, button retains committed width (no layout shift) |
| Password-strength feedback | Live, `motion-instant` color-coded bar, never a blocking modal |
| Celebratory motion | Deliberately **not used anywhere in registration** — per `docs/UI_Design_System.md` §19/§32's principle that celebration is reserved for genuine, earned product milestones (first streak, first mock test), not administrative steps like account creation |

---

## 10. Loading States Summary

| Operation | Treatment |
|---|---|
| Google OAuth popup | Dimmed parent page + popup itself as the loading surface |
| Email registration submit | Inline button spinner, sub-second expected response |
| OTP verify | Inline button spinner |
| Institute code / referral code validation | Debounced, inline field-level spinner — never blocks the rest of the form |
| Institution account creation | Standard button spinner |
| Institutional review queue (§5.4) | Not a spinner at all — a persistent, clearly-worded status state, since this operates on a business-day timescale, not a request/response timescale |
| Staff invite sending | Per-row spinner, independent per invitee |

---

## 11. Recommendations

1. **Keep the "Choose Your Path" screen as a permanent first step**, even as the product grows — resist ever collapsing it back into a single generic form for simplicity's sake, since the three audiences' needs (and this document's whole rationale) diverge too much to share one flow well.
2. **Treat the Institution review queue (§5.4) as a trust-building disclosure, not a hidden delay** — an institution owner who understands *why* their account isn't instantly fully active will tolerate a one-day wait far better than one left to wonder if something went wrong.
3. **Never expand the Password mechanism (§6.4) beyond its current scoped use.** It exists solely because institutional staff-invite provisioning is a genuinely different trust model — reintroducing password as a general option for individual consumer accounts would undo the security benefits `docs/Authentication.md` establishes for the platform's primary user base.
4. **Build the referral-code mechanism (§6.5) with the institute-referral program from `docs/UserPersonas.md` recommendation #3 in mind from day one** — the same underlying code/redemption infrastructure should serve both a peer-to-peer aspirant referral and an institute-to-institute referral, rather than building two separate systems later.

---

*End of Document.*
