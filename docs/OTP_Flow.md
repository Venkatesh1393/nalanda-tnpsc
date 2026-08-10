# Nalanda TNPSC — OTP Verification Flow

| | |
|---|---|
| **Document Owner** | UX Design / Interaction Design |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/Authentication.md` §2/§12 as the binding security/rate-limit authority, `docs/UserJourney.md` Screen 3 as the baseline screen spec, `docs/Registration_Flow.md` §6.3 as the cross-path usage note, and `docs/UI_Design_System.md` for all visual/motion tokens |

### Scope Note

This document is the **deep interaction-design specification** for the single most emotionally loaded screen in the entire product — the one moment where a user has left the app to check their email and is returning under mild time pressure. Every micro-interaction below exists to remove friction and anxiety from that specific moment. It expands, rather than repeats, the baseline behavior already established in `docs/UserJourney.md` Screen 3 and `docs/Authentication.md` §2.

**Where OTP verification is used:** initial Registration (`docs/Registration_Flow.md`, all three paths), and email-change re-verification (`docs/UserJourney.md` Screen 11 / `docs/Authentication.md` §10). Every behavior specified here applies identically in both contexts unless explicitly noted.

---

## 1. Screen Anatomy

```
                    Verify your email
        We sent a 6-digit code to k●●●●●i@gmail.com

              ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
              │ 4 │ │ 8 │ │ _ │ │   │ │   │ │   │     ← 6 segmented boxes
              └───┘ └───┘ └───┘ └───┘ └───┘ └───┘        (auto-focus, auto-advance)

                      [ Verify ]                         ← explicit button (§8)

                  Resend code in 0:47                     ← countdown / resend (§4, §5)

                       Change email
```

---

## 2. Auto Focus

- The **first box receives focus automatically** the instant the screen mounts — no tap required. On mobile, this also triggers the device's soft keyboard to open immediately, since the user's entire intent on arriving at this screen is "type the code I just received."
- **Auto-advance:** entering a digit in box *n* instantly moves focus to box *n+1*. The user never taps between boxes during normal entry.
- **Backspace behavior:** pressing backspace on an already-empty box moves focus to the *previous* box and clears its content — standard segmented-OTP convention, so a user correcting a mistake can backspace fluidly through the whole code without needing to tap.
- **Manual override respected:** a user tapping directly into box 4 (e.g., to fix a single mistyped digit) is honored — auto-advance never fights a deliberate manual focus change.
- **Focus ring:** uses the design system's standard focus treatment (`primary-600`, 2px, offset — `docs/UI_Design_System.md` §31) at every step, including for keyboard-only navigation, satisfying the accessibility requirement that focus state is never suppressed.
- **Post-error refocus:** after a wrong-OTP shake (§6) completes, focus automatically returns to box 1 — the user should never need an extra tap just to start retyping.

---

## 3. Paste OTP

- Pasting a copied 6-digit code (from an email app, SMS, or password manager) into **any** of the 6 boxes is detected as a paste event and **distributes the digits across all 6 boxes automatically** — the user is never required to paste into box 1 specifically.
- Pasted content is sanitized: non-numeric characters are stripped, and if the pasted string contains more or fewer than 6 digits after stripping, only the first 6 valid digits are used (or, if fewer than 6, the boxes fill as far as the content allows and focus lands on the next empty box for manual completion).
- A successful 6-digit paste **triggers the same auto-submit behavior as manual entry** (§8) — pasting the code is functionally identical to typing it, with zero additional steps.
- **OS-level autofill is supported, not just manual paste:** on mobile, the platform's native "use code from email/SMS" suggestion (appearing above the keyboard) is fully compatible with the segmented-box layout — selecting it fills all 6 boxes in one action, identical in effect to a manual paste.
- **Explicit distinction from clipboard-snooping:** this behavior only ever fires on a genuine, user-initiated paste action (or an OS-native autofill selection the user explicitly taps) — the screen never silently polls or reads the clipboard in the background. This is both a deliberate privacy principle and, increasingly, a browser/OS-enforced restriction that this design fully respects rather than works around.

---

## 4. Resend

- The **Resend** action is a text link (not a heavy button — this is a secondary action relative to the primary act of entering a code already received), disabled and replaced by the countdown (§5) until the cooldown elapses.
- **On tap (once enabled):** triggers a new OTP request to the same email, all 6 boxes clear, focus returns to box 1, and a brief inline confirmation appears ("New code sent") — fading out after ~3 seconds rather than requiring dismissal.
- **The countdown restarts** immediately upon a successful resend, and the previous code is invalidated server-side the moment a new one is issued (per `docs/Authentication.md` §2 — a user who resends should never be able to still use an old, now-void code).
- **Escalating cooldown / hourly cap:** consistent with `docs/Authentication.md`'s anti-abuse rules (max 5 requests per email per hour), if a user has resent close to this limit, the Resend link's post-limit state changes from "wait 60 seconds" to a distinctly longer, clearly worded message ("You've requested several codes recently — please wait a few minutes" or, once the hourly cap is truly hit, "Too many requests. Try again in [X] minutes.") — never a bare, unexplained disabled state.
- **On expired-OTP submissions specifically** (§7), Resend becomes available **immediately, bypassing the standard 60-second cooldown** — the user isn't abusing the resend mechanism here, they're recovering from a legitimate timeout, and penalizing them with an additional wait would feel punitive for something that wasn't their fault.

---

## 5. Countdown

Two distinct countdowns exist, serving different purposes, and are deliberately **not both shown with equal visual weight** to avoid clutter and needless anxiety:

### Resend Cooldown (primary, always visible)
- A small, `text-secondary`, tabular-numeral countdown ("Resend code in 0:47") sits exactly where the Resend link will appear once enabled — ticking down once per second.
- At `0:00`, the countdown text **smoothly cross-fades** (`motion-fast`) into the enabled, `primary-600`-colored, tappable "Resend code" link — a state change, not a re-layout, so nothing jumps.

### OTP Expiry (secondary, only surfaces near the end)
- The underlying 10-minute code validity (`docs/Authentication.md` §2) is **not shown as a prominent, anxiety-inducing countdown for most of its duration** — most users verify within the first minute or two, and a large ticking "9:58 remaining" would manufacture urgency that doesn't serve them.
- In the **final 60 seconds** of validity, a subtle, calm inline note appears beneath the boxes ("Your code expires soon — resend if you need more time") in `warning-600` — mirroring the same calm-to-warning escalation pattern already established for the Practice screen's test timer (`docs/UI_Design_System.md` §38), rather than inventing a new urgency pattern specific to this screen.

---

## 6. Wrong OTP

- **Trigger:** the entered (or pasted) 6-digit code does not match the server-side hash for this email.
- **Visual feedback:** the entire row of 6 boxes performs a short, sharp **horizontal shake** (a few oscillations of rapidly decreasing amplitude, ~300–350ms total) and each box's border briefly flashes to `error-600` before settling back to the neutral default border — a clear, unmistakable "that didn't work" signal that resolves quickly rather than lingering as a persistent red state.
- **Boxes clear automatically** the moment the shake completes, and **focus returns to box 1** (§2) — the user should be able to immediately start retyping with zero extra taps.
- **Message copy:** a single, calm inline line beneath the boxes — *"Incorrect code. Please try again."* — deliberately **generic and free of any remaining-attempts count**, consistent with the anti-enumeration/anti-brute-force principle already established in `docs/UserJourney.md` Screen 3 and `docs/Authentication.md` §12. The user is never shown "3 attempts left," both because it provides no genuine benefit to a legitimate user (who simply mistyped) and because it would help an attacker calibrate a guessing strategy.
- **Lockout state (after the 5th failed attempt, per `docs/Authentication.md` §2):** a visually distinct state — the 6 boxes render in a muted, disabled (grayed-out) treatment with a small padlock glyph replacing the cursor, and the message changes to *"Too many incorrect attempts. Request a new code to continue."* The only available action becomes **Request New Code** (a relabeled Resend for this specific state), which itself carries a brief, deliberate extra delay (e.g., 30 seconds) before becoming tappable — slowing down a rapid-fire brute-force-via-resend pattern without meaningfully inconveniencing a genuine user who mistyped five times.

---

## 7. Expired OTP

- **Trigger:** the user submits a code after its 10-minute validity window has elapsed (the corresponding Redis-backed hash, per `docs/Architecture.md` §8, has already been evicted server-side).
- **Deliberately distinguished from Wrong OTP** — this is not the user's fault, and the interaction design should never make it feel like one:
  - **No shake animation.** Shaking implies "you made an error"; expiry is simply the passage of time. Instead, the 6 boxes perform a **gentle fade-out and fade-back-in to their empty state** (`motion-fast`, no oscillation) — a calm reset rather than a corrective jolt.
  - **Message copy:** *"This code has expired. Request a new one."* — clearly different wording from the Wrong OTP message, so a user immediately understands the *category* of what happened.
  - **Resend/Request New Code is immediately available**, with no cooldown wait (§4) — reinforcing that this reset isn't a penalty.

---

## 8. Loading

- **Dual submission trigger:** verification fires **automatically the instant the 6th digit is entered or pasted** (the common, fastest path for most users), *and* an explicit **Verify** button remains visible and becomes enabled once all 6 boxes are filled — providing a clear, discoverable action for keyboard-only and assistive-technology users who shouldn't have to rely on an implicit auto-trigger they can't easily perceive (an accessibility-driven decision, per `docs/UI_Design_System.md` §31).
- **During verification:** all 6 boxes become **read-only** (cannot be edited mid-request), preventing a race condition where a user edits a digit while the original code is still being checked. The Verify button (if the manual path was used) shows the standard inline spinner replacing its label (`docs/UI_Design_System.md` §13); if verification was auto-triggered, a slim, indeterminate progress indicator appears beneath the boxes instead, since there's no button already in focus to host a spinner.
- **Expected duration:** sub-second under normal conditions. No "still working" reassurance copy is needed at this speed. A hard **8-second request timeout** exists as a backstop — if exceeded, the screen falls through to the network-error treatment (§10) rather than spinning indefinitely.

---

## 9. Success Animation

- **Trigger:** the submitted code matches.
- **Treatment:** the 6 boxes collectively transition into a single **success confirmation** — a checkmark glyph draws in in `success-600` (a brief path-draw/scale-in, `motion-base` duration) either replacing the boxes or overlaying them centrally, held for roughly 400–500ms before the screen advances to the next step (Choose Exam, or back to Profile/Settings for an email-change re-verification).
- **Deliberately restrained, not celebratory:** this moment does **not** use the stronger `motion-celebratory` spring/overshoot treatment reserved for genuine, earned product milestones (a new streak, a completed mock test — `docs/UI_Design_System.md` §19, §32). OTP verification, even though it feels satisfying to complete, is an administrative account-security step, not a learning achievement — using the same celebratory motion here would dilute what makes that treatment meaningful elsewhere in the product, and would be inconsistent with the same principle already applied to the rest of Registration (`docs/Registration_Flow.md` §9). The success animation here is confident and quick, not bouncy.

---

## 10. Error Animation

Three distinct visual treatments exist for three distinct failure categories — deliberately different from each other, so the user's eye and instinct correctly interpret *what kind* of problem occurred without needing to fully read the message text first:

| Failure Type | Animation | Are Boxes Cleared? | Why This Treatment |
|---|---|---|---|
| **Wrong OTP** (§6) | Sharp horizontal shake, border flash to `error-600` | Yes, immediately | Communicates "that input was incorrect" — a corrective signal |
| **Expired OTP** (§7) | Gentle fade-out/fade-in, no shake | Yes, gently | Communicates "time passed," explicitly not the user's fault |
| **Network/Server Error** (verification request couldn't complete at all) | Boxes remain completely unchanged; an error banner appears above/below with a **Retry** button | **No — the user's entered code is preserved** | The code was never actually proven wrong, only unreachable; forcing a full retype after a server hiccup is an avoidable, needless penalty |
| **Lockout** (5 failed attempts, §6) | Boxes render disabled/grayed with a padlock glyph, no shake (the shake already played on the 5th wrong attempt itself) | N/A — input is disabled | Communicates a state change (blocked) rather than a single failed attempt |

This differentiation — especially preserving user input on a network failure rather than clearing it like a wrong-code failure — is a small but meaningful craft detail that most competitor products in this category (per `docs/CompetitorAnalysis.md`'s general findings on competitor UI polish) do not bother to distinguish.

---

## 11. Security

All security-relevant behavior on this screen is a **UX-layer expression of rules whose actual enforcement lives entirely server-side** in `docs/Authentication.md` §2/§12 — this section restates them specifically in terms of what the screen must never do, plus a few screen-specific additions:

- **OTP values are never logged in plaintext anywhere** — including client-side error-tracking/analytics tooling. If a verification failure is captured for debugging telemetry, the actual entered digits are scrubbed before the event is recorded, exactly like the server-side hashing-at-rest rule already established in `docs/Authentication.md` §2.
- **No remaining-attempts count is ever surfaced in the UI** (§6) — this is a deliberate anti-enumeration choice, not an oversight, and must not be "helpfully" reintroduced by a future iteration without revisiting this rationale.
- **Client-side countdowns and disabled states are UX conveniences only, never the actual security enforcement.** The 60-second resend cooldown and 5-attempt lockout showcased on-screen are cosmetic reflections of server-side rate limits — a manipulated or bypassed client (e.g., a modified app build) gains nothing, because the backend independently enforces every one of these limits regardless of what the client displays or permits the user to attempt.
- **Paste/autofill support (§3) never extends to background clipboard access** — every code-filling action originates from an explicit user paste or an explicit tap on an OS-native suggestion, never a silently polled clipboard read, both for privacy and because most modern platforms block the latter outright.
- **Cross-device entry is intentionally allowed, not blocked** — because the OTP is an email-delivered code rather than a device-bound mechanism (e.g., a push-based approval), a user may legitimately request the code on a laptop and enter it after opening the email on their phone, or vice versa (per the cross-device edge case already noted in `docs/UserJourney.md` Screen 3). This screen's design must never assume or enforce same-device continuity.
- **Assistive technology gets the same information sighted users get, at the same moment.** Every error, success, and countdown-state change on this screen is announced to screen readers the instant it appears (not only rendered visually) — a user relying on a screen reader must never be left unaware that a shake animation just occurred with no accompanying announced text.

---

## Cross-Document Consistency Notes

- The **Wrong vs. Expired** animation distinction (§6, §7, §10) is a genuinely new craft decision introduced by this document — earlier docs (`docs/UserJourney.md`, `docs/Authentication.md`) established the *copy* difference between these two failure modes but not the *motion* difference; this document makes that distinction concrete and should be treated as the authoritative source for it going forward.
- The decision to **not use `motion-celebratory` for OTP success** (§9) deliberately mirrors the identical decision already made for Registration as a whole in `docs/Registration_Flow.md` §9 — this document extends that same reasoning explicitly to the OTP screen rather than leaving it ambiguous.
- All rate-limit numbers referenced here (10-minute TTL, 5-attempt cap, 60-second cooldown, 5/hour, 20/hour-per-IP) are owned by `docs/Authentication.md` §2 — if those values ever change, this document's countdown/cooldown descriptions inherit the change automatically by reference rather than needing independent updates.

---

*End of Document.*
