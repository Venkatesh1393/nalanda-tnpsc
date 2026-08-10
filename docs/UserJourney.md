# Nalanda TNPSC — User Journey & Screen-Level Flow Design

| | |
|---|---|
| **Document Owner** | UX / Product Design |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md` |
| **Scope** | Screen-by-screen flow design for the primary end-to-end user path |

### Primary Flow Covered

```
Landing Page
   ↓
Registration
   ↓
OTP
   ↓
Choose Exam
   ↓
Dashboard
   ↓
Learn
   ↓
Practice
   ↓
AI Explanation
   ↓
Analytics
   ↓
Subscription
   ↓
Profile
   ↓
Logout
```

### Design Principles Applied Throughout (from the PRD & Persona research)

- **Bilingual by default** — every screen must render coherently in Tamil, English, or mixed mode, not just translated labels (PRD §8, Localization).
- **Low-bandwidth resilience** — every loading/error state assumes a user on 3G/budget Android (Persona "Priya"), per PRD §8.
- **No lost progress** — test-taking and form states must survive network drops and app backgrounding (PRD §8, Reliability of Test Engine).
- **Transparent, non-punitive feedback** — errors are informative, never blaming; upsells are honest, never dark-pattern-driven (informed by the Byju's Exam Prep trust-erosion cautionary example in `CompetitorAnalysis.md`).

---

## 1. Landing Page

### Purpose
The public, unauthenticated entry point. Establishes trust, communicates the value proposition ("AI-powered, Tamil-first TNPSC preparation"), and converts visitors into registered users. Also the primary SEO/marketing surface (PRD §5, Awareness stage).

### User Actions
- Browse hero section, feature highlights, exam category overview, pricing preview, and testimonials.
- Toggle site language (Tamil / English).
- Click through to Registration or Login.
- Explore a specific exam category (e.g., "Group 4 syllabus").

### Buttons
- **Get Started Free** (primary CTA → Registration)
- **Login** (secondary → Login modal/screen for existing users)
- **Explore Exams** (→ anchor scroll or exam-category landing sections)
- **View Pricing** (→ Subscription plans preview, no auth required)
- Language toggle (EN / தமிழ்)

### Navigation
- → **Registration** (Get Started Free)
- → **Login** (existing users; on success, skips Registration/OTP entirely and lands on **Dashboard**)
- → Anchor sections (Features, Exam Categories, Pricing, Testimonials) within the same page

### Errors
- Hero/testimonial media fails to load → graceful fallback to text-only content, no broken layout.
- Language toggle fails to apply → falls back to browser-detected default language with a silent retry.
- Analytics/marketing scripts blocked by an ad blocker → must not block core page functionality.

### Success Messages
- Not applicable for a static marketing page, except a lightweight confirmation if an email-capture/newsletter widget is used ("Thanks — we'll notify you before the next TNPSC notification.").

### Edge Cases
- Already-authenticated user visiting the root URL → auto-redirect to **Dashboard** rather than re-showing marketing content.
- User arrives via a deep link/ad campaign tied to a specific exam (e.g., "Group 2 syllabus") → land directly on that exam's section, not the generic hero.
- Very slow connection → critical above-the-fold content (headline + CTA) must render before secondary assets (images, testimonials).

### Loading States
- Skeleton/placeholder for hero illustration and testimonial cards.
- Lazy-loaded below-the-fold sections (feature grid, pricing table).
- Progressive web-font loading for Tamil script (avoid flash of unstyled/tofu text).

---

## 2. Registration

### Purpose
Create a new user account via Google OAuth or Email, capturing the minimum information needed to proceed (PRD §7.1).

### User Actions
- Choose a signup method: **Continue with Google** or **Continue with Email**.
- If email: enter name and email address.
- Accept Terms & Conditions / Privacy Policy (required for DPDP Act compliance, PRD §8).

### Buttons
- **Continue with Google** (OAuth popup)
- **Continue with Email**
- **Sign Up** (submit email form)
- **Already have an account? Log in** (link → Login)
- Language toggle (persists from Landing Page)

### Navigation
- Google OAuth success → **Choose Exam** (Google already verifies email ownership, so the OTP step is skipped for this path).
- Email signup submitted → **OTP** screen.
- "Already have an account?" → Login (existing session → **Dashboard**).

### Errors
- Invalid email format → inline validation before submission.
- Email already registered → "This email is already registered. Log in instead?" with a direct link to Login (never silently create a duplicate account).
- Terms & Conditions not accepted → block submission with a clear inline prompt.
- Google OAuth popup blocked by browser → instructional message to allow popups, with a fallback redirect-based OAuth flow.
- Network failure during account creation → retry option, no partial/corrupted account state left behind.

### Success Messages
- Email path: "Account created — let's verify your email."
- Google path: "Signed in successfully with Google."

### Edge Cases
- User closes the Google OAuth popup mid-flow → return cleanly to the Registration screen with no error noise (this is a cancellation, not a failure).
- Same person attempts Google signup after previously registering via Email with the same address (or vice versa) → detect and offer account linking rather than creating a second account.
- Disposable/temporary email domains used for signup → optional soft warning (not a hard block, to avoid excluding legitimate first-time users unfamiliar with typical email norms).
- Extremely slow network causing the OAuth token exchange to time out → clear timeout messaging with a retry button, not an indefinite spinner.

### Loading States
- Spinner overlay during Google OAuth popup load.
- Submit button shows an inline spinner and disables itself during email-account creation to prevent double submission.
- Real-time (debounced) email-availability check shown as a subtle inline indicator, not a full-page loader.

---

## 3. OTP

### Purpose
Verify ownership of the email address provided during Registration (PRD §7.1, Email OTP authentication) before granting account access.

### User Actions
- Enter the 6-digit OTP received by email.
- Request a resend if not received.
- Go back to correct the email address if mistyped.

### Buttons
- **Verify** (auto-triggers when all 6 digits are entered, or via explicit tap)
- **Resend OTP** (disabled with a visible countdown timer until eligible again)
- **Change Email** (→ back to Registration, pre-filled)

### Navigation
- Successful verification → **Choose Exam**.
- "Change Email" → back to **Registration** with prior input preserved.

### Errors
- Incorrect OTP entered → inline error, "Incorrect code. Please try again," field cleared for re-entry (does not reveal remaining attempts count, to avoid aiding brute-force guessing).
- Expired OTP (e.g., beyond a 10-minute validity window) → "This code has expired. Request a new one," with the Resend button immediately available.
- Too many failed attempts → temporary cooldown/lockout on verification attempts for that session, with a clear explanation and estimated wait time.
- Resend requested before cooldown expires → button remains disabled with the remaining countdown shown, no separate error needed.
- Network failure sending or verifying the OTP → distinct message from "incorrect code" so the user doesn't misdiagnose a connectivity issue as a wrong code.

### Success Messages
- "Email verified successfully!" with immediate transition to Choose Exam.

### Edge Cases
- OTP email delayed or filed into spam → resend flow must be low-friction and clearly signposted ("Didn't get it? Check spam or resend.").
- User switches devices mid-verification (e.g., started signup on desktop, opens email on phone) → verification must not be device-bound; entering the correct code on any device completes it.
- OS-level OTP autofill (from email/SMS) on mobile → the input should support autofill without requiring manual retyping.
- User abandons mid-verification and returns days later → OTP naturally expired, resend flow handles this without special-casing.

### Loading States
- Spinner on the Verify button while the code is checked.
- Countdown timer visibly ticking down on the disabled Resend button.
- Skeleton/placeholder while the screen initially loads the masked destination email address.

---

## 4. Choose Exam

### Purpose
Capture the user's target exam category (or categories), target exam date, and daily study-hour availability — the core inputs that seed AI personalization (PRD §7.1, §7.5, §10 Feature 1).

### User Actions
- Multi-select target exam(s): Group 1, Group 2, Group 2A, Group 4, VAO, Police, Forest, TRB.
- Select a target exam date (or indicate uncertainty).
- Select approximate daily study hours available.
- Confirm/adjust language preference (Tamil / English / bilingual).

### Buttons
- Exam category selector cards/chips (toggle selected state, multi-select)
- Date picker control
- Study-hours selector (e.g., preset ranges: <1 hr, 1–2 hrs, 2–4 hrs, 4+ hrs)
- **Continue** (primary, proceeds once minimum required fields are set)
- **Not sure of my exam date yet** (secondary option that defaults to a generic preparation timeline rather than blocking progress)

### Navigation
- → **Dashboard** on successful completion.

### Errors
- No exam selected → inline validation, "Please select at least one exam to continue" (Continue remains disabled until resolved).
- Exam date set in the past → inline correction prompt.
- Network failure saving preferences → retry option; user's selections are preserved locally so nothing is lost on retry.

### Success Messages
- "Great — we've set up your personalized plan for [Exam Name]." shown briefly during transition to Dashboard.

### Edge Cases
- User selects multiple, substantially different exams (e.g., Group 1 and Police) → system accepts this but should later present distinct study plans/dashboards per exam rather than merging them into one generic plan.
- Returning user revisiting this screen to change their exam goal (via Profile) → screen must pre-populate existing selections rather than resetting to blank.
- User genuinely doesn't know the official exam date (common — TNPSC notifications are periodically announced) → "Not sure yet" must be a first-class option, not an afterthought, since forcing a guess undermines trust.
- User selects an exam with a Mains/Interview stage (Group 1, TRB) → this selection should later route them toward Mains-specific content (per the Divya persona in `docs/UserPersonas.md`).

### Loading States
- Skeleton exam-category cards while the exam catalog loads from the backend.
- Spinner on Continue while preferences are saved and the initial AI study plan is generated (this generation may take a few seconds — show a brief, reassuring message like "Building your personalized plan..." rather than a bare spinner).

---

## 5. Dashboard

### Purpose
The central post-onboarding hub. Surfaces the personalized study plan, progress indicators, and quick access to all core modules (PRD §7.5, §6 User Journey stage 4).

### User Actions
- View today's recommended tasks and syllabus completion percentage.
- View current study streak.
- Navigate to Learn, Practice, Analytics, Subscription, or Profile.
- View and act on notifications (e.g., upcoming mock test, official TNPSC notification alert).

### Buttons
- **Continue Studying** (deep-links to the next recommended Learn topic)
- **Take a Mock Test** (→ Practice, pre-filtered to mock-test mode)
- **View Full Plan** (expanded study-plan view)
- Notification bell icon
- Module navigation cards/tabs: Learn, Practice, Analytics, Subscription, Profile

### Navigation
- → **Learn**, **Practice**, **Analytics**, **Subscription**, **Profile** via primary navigation.
- → Deep link directly into a specific due task or upcoming mock test from a dashboard card or notification.

### Errors
- Personalized plan fails to load → fallback to a generic syllabus overview rather than a blank/broken dashboard.
- No internet connectivity → show the last cached dashboard state with a clear "You're offline — showing your last saved progress" banner rather than failing silently.

### Success Messages
- Milestone toasts, e.g., "7-day streak — keep going!" or "You've completed 25% of the Group 4 syllabus."

### Edge Cases
- Brand-new user with no activity yet → empty state that clearly guides toward the first action (e.g., "Start your first quiz" or "Take a quick diagnostic test"), not a sparse, directionless screen.
- Lapsed user returning after a long gap → gently re-engaging message and an adjusted/re-baselined plan rather than showing a stale, now-irrelevant schedule.
- User with multiple exam goals selected → a goal switcher (tabs or dropdown) so each exam's plan and progress are shown distinctly, not blended.
- Free-tier user near a usage limit (e.g., daily quiz cap) → a visible, non-intrusive indicator rather than a surprise block later.

### Loading States
- Skeleton cards for stat widgets (streak, completion %, next task).
- Shimmer effect on progress rings/bars while data loads.
- Asynchronous load of the AI-recommended "next best action" card, which may resolve slightly after the rest of the dashboard shell renders.

---

## 6. Learn

### Purpose
Structured content consumption: syllabus explorer, notes, and video lessons organized by subject → unit → topic (PRD §7.2).

### User Actions
- Browse the subject/unit/topic hierarchy.
- Read notes (Tamil/English), watch short video lessons.
- Bookmark content for later revision.
- Download a PDF (where entitled).
- Mark a topic as complete.
- Search for a specific topic.

### Buttons
- Subject/topic accordion or list-expand controls
- **Mark as Complete**
- **Bookmark**
- **Download PDF** (shows a lock icon with an upsell prompt for free-tier users on gated content)
- Video play/pause/speed controls
- Per-note language toggle
- **Practice this topic** (contextual CTA)
- **Ask AI to explain this differently** (→ AI Explanation)

### Navigation
- → **Practice**, pre-filtered to the current topic (contextual CTA).
- → **AI Explanation**, for a doubt on the current topic/note.
- Breadcrumb navigation back up the subject → unit → topic hierarchy.

### Errors
- Content fails to load → retry action, not a dead end.
- Video fails to play/buffer indefinitely → fallback message with a retry and, where available, a text-notes alternative for the same topic.
- Free-tier user attempts to download a gated PDF → clear upsell modal explaining what unlocking requires, not a bare "access denied."
- Search returns no results → helpful empty state suggesting related topics or a spelling correction, rather than a blank result.

### Success Messages
- "Topic marked as complete."
- "Bookmarked for revision."

### Edge Cases
- A topic's Tamil translation isn't yet available (e.g., very recently added content) → fall back to English with a small, honest note ("Tamil version coming soon") rather than showing broken/missing text.
- Free-tier user hits a content paywall mid-topic (e.g., partway through a unit) → the transition to the upsell should feel like a natural pause point, not an abrupt cutoff mid-sentence.
- Offline mode → only previously cached/downloaded notes are shown, clearly distinguished from content requiring connectivity.
- Very long notes → maintain scroll-position/reading-progress tracking so a user can resume exactly where they left off.

### Loading States
- Skeleton text blocks while notes load.
- Video buffering spinner with a data-usage-conscious placeholder (avoid autoplaying high-resolution video by default on mobile data).
- Lazy-loaded pagination for long topic lists within a subject.

---

## 7. Practice

### Purpose
The core testing engine: topic-wise quizzes, sectional tests, full-length mock tests, and previous-year question (PYQ) practice (PRD §7.3).

### User Actions
- Choose a practice mode: topic quiz, sectional test, full mock test, or PYQ set.
- Start a timed test.
- Answer questions, mark questions for review, navigate between questions.
- Submit the test.

### Buttons
- **Start Test**
- **Next** / **Previous**
- **Mark for Review**
- **Submit Test**
- Question palette/navigator (jump to any question, see answered/unanswered/marked status)
- Visible countdown timer

### Navigation
- On submission → automatically routes to **Analytics** (results/breakdown for this attempt).
- From any question → **AI Explanation** via a "Why is this the correct answer?" link.

### Errors
- Network drop mid-test → in-progress answers are auto-saved locally and periodically synced; on reconnection, the test resumes exactly where it left off (PRD §8, Reliability of Test Engine — this is a non-negotiable requirement).
- Submission request fails → retry using the locally saved state; the user is never told to "start over."
- Timer expires → auto-submits gracefully with a clear "Time's up — your test has been submitted" message, not a jarring forced exit.
- Selected filter combination yields too few questions (e.g., a very narrow topic + difficulty filter) → inform the user before starting, offering to broaden the filter, rather than starting a test with insufficient content.

### Success Messages
- "Test submitted successfully — calculating your results..."

### Edge Cases
- User closes the app/tab mid-test → on return, resume from the last auto-saved state within the test's original time budget (time elapsed while away should count against the timer, matching real exam conditions, and be clearly communicated).
- Free-tier user exceeds a daily quiz/mock-test limit → a clear, honest upsell prompt at the point of the limit, not a silent failure.
- Lightweight integrity signals during a high-stakes mock test (e.g., tab-switch detection) → shown to the user as self-awareness feedback only ("You switched tabs 3 times during this test"), explicitly not used punitively, per PRD §10 Feature 9.
- Same account active on two devices simultaneously during a timed test → the system should prevent a duplicate concurrent attempt or clearly reconcile which session is authoritative, to avoid score/state conflicts.

### Loading States
- Skeleton question card while the test/question set loads.
- Spinner with a reassuring message while the score is being calculated post-submission.
- Progressive loading for question images (maps, diagrams) common in TNPSC papers, so text and options are usable before heavier images finish loading.

---

## 8. AI Explanation

### Purpose
On-demand AI-generated explanations for a specific question or topic, and general doubt resolution via a conversational assistant (PRD §10, Features 4 and 5).

### User Actions
- Tap "Explain this" on a question or note.
- Ask a follow-up doubt in a chat-style interface.
- Switch the explanation's language (Tamil/English).
- Rate the explanation as helpful or not.
- Escalate to a human moderator/community if the AI's confidence is low or the user remains unsatisfied.

### Buttons
- **Explain Again, Differently**
- **Ask a Follow-up**
- Thumbs up / thumbs down feedback
- **Escalate to Community/Moderator**
- Language toggle for the explanation

### Navigation
- → Back to the originating question (Practice) or note (Learn).
- → **Community/doubt forum**, if the user escalates beyond the AI.

### Errors
- AI service timeout or unavailability → a clear fallback message ("Our AI assistant is briefly unavailable — try again in a moment, or ask the community") rather than an unexplained blank response.
- Low-confidence or off-topic AI response → the system should proactively acknowledge uncertainty rather than presenting a wrong answer with false confidence, and offer escalation.
- Free-tier user hits a daily AI-explanation usage cap → transparent messaging with an upsell path, consistent with how other usage limits are handled elsewhere in the app.

### Success Messages
- "Hope that helped! Let us know if you need more detail." shown after a positive feedback rating.

### Edge Cases
- Ambiguous or poorly worded user question → the assistant should ask a brief clarifying question rather than guessing and giving an irrelevant answer.
- Question falls outside the TNPSC syllabus scope → politely decline and redirect, rather than fabricating an answer.
- Repeated negative feedback on the same explanation from multiple users → auto-flag the underlying content for human content-team review, since this signals a genuine content gap.
- Voice-based Tamil query (PRD §10 Feature 8) fails speech-to-text conversion → graceful fallback to typed input, not a dead end.

### Loading States
- "AI is thinking..." typing-style indicator.
- Streamed/incremental text rendering of the AI's response rather than a single long wait.
- Skeleton placeholder while prior chat history loads.

---

## 9. Analytics

### Purpose
Post-test and cumulative performance insight: scores, percentile/rank, sectional strengths and weaknesses, and trends over time (PRD §7.3, §10 Feature 7).

### User Actions
- View a specific test's detailed result breakdown.
- View sectional performance analysis.
- View historical performance trends across multiple attempts.
- View percentile/rank relative to other Nalanda users.
- Filter analytics by date range, exam, or subject.

### Buttons
- **View Detailed Solution**
- **Retake Test**
- **View Weak Areas**
- Date-range / exam / subject filters
- **Export/Share Report** (premium feature)

### Navigation
- → **Learn**, via a contextual "Study this weak topic" CTA.
- → **Practice**, via a "Practice more on this topic" CTA.
- → **Subscription**, when a free-tier user encounters a locked deeper-analytics view.

### Errors
- Analytics computation delayed or fails → a clear "Your results are still being processed" state with automatic refresh, rather than an error that implies data loss.
- Percentile cannot be computed reliably due to an insufficient comparison cohort (e.g., a newly launched, low-volume exam category) → show a clear disclaimer instead of a misleading number.
- Chart rendering issues on low-end devices → fall back to a simplified, lightweight chart or a tabular summary rather than freezing the screen.

### Success Messages
- Milestone-style messages where relevant, e.g., "New personal best score on this topic!"

### Edge Cases
- User's very first test → no historical trend exists yet; show an encouraging empty state rather than an empty chart.
- Free-tier user viewing advanced analytics → a blurred/partial preview with a clear, honest upsell rather than a total block that hides the value proposition.
- Very small comparison cohort for a niche exam category (e.g., Forest) → percentile shown with an explicit "based on a smaller sample" disclaimer.
- User retakes the same test → clearly label which attempt's results are currently displayed to avoid confusion between attempts.

### Loading States
- Skeleton chart placeholders and shimmering stat tiles while data loads.
- Progressive chart-drawing animation on load (consistent with a Chart.js-based rendering approach).

---

## 10. Subscription

### Purpose
View, compare, upgrade, and manage subscription plans and payments (PRD §7.9, §9).

### User Actions
- Compare Free / Plus / Pro / Institutional tiers.
- Select a plan and complete payment via Razorpay.
- View current plan status and renewal date.
- Cancel or renew a subscription.
- View/download past invoices.

### Buttons
- **Upgrade to Plus / Pro**
- **Pay Now**
- **Cancel Subscription**
- **Download Invoice**
- Monthly/annual billing toggle
- Promo code entry field (if applicable)

### Navigation
- → Razorpay checkout (modal or redirect) → back to **Subscription** on completion.
- → **Dashboard**, following a successful upgrade, with a brief confirmation before returning.

### Errors
- Payment failure (card declined, insufficient funds, gateway error) → a clear, specific message distinguishing bank-side failures from app-side issues, with a retry path.
- Razorpay gateway timeout → the user's plan status must not change until payment is definitively confirmed; show a "still processing" state rather than a false success or false failure.
- Webhook confirmation delay (payment succeeds at the gateway but plan activation lags) → a transparent "Payment received — activating your plan" state rather than leaving the user unsure whether it worked.
- Invalid or expired promo code → inline validation message, not a silent rejection.
- Duplicate payment attempt (e.g., user double-clicks Pay Now) → must be prevented at the button/request level, not resolved after the fact via a refund process.

### Success Messages
- "Payment successful — welcome to Nalanda Pro!" with a visible receipt/confirmation reference.

### Edge Cases
- User cancels mid-payment (closes the Razorpay modal) → returns cleanly to Subscription with no plan change and no error noise, since this is a user-initiated cancellation, not a failure.
- Subscription renewal attempted against an expired/invalid saved card → proactive notice before the renewal date, not a surprise lapse in access.
- Downgrade request → an explicit confirmation dialog listing exactly which features will be lost, consistent with the transparent-billing principle (informed by the Byju's Exam Prep and Testbook billing-trust complaints noted in `CompetitorAnalysis.md`).
- Institutional buyer (per the Rajendran persona) reaching this screen → should see per-student/per-branch institutional pricing rather than the individual consumer tiers.

### Loading States
- Spinner during Razorpay redirect/processing.
- "Confirming your payment..." polling state that resolves automatically once the webhook confirms status.
- Skeleton placeholders for plan-comparison cards while current entitlements load.

---

## 11. Profile

### Purpose
Manage personal account details, preferences, and account-level settings.

### User Actions
- Edit name and profile photo.
- Change exam goal(s).
- Change language preference.
- Manage notification settings.
- View earned achievement badges/streaks history.
- Contact support.
- Request account data export or deletion (DPDP Act compliance, PRD §8).

### Buttons
- **Edit Profile**
- **Save Changes**
- **Change Exam Goal** (→ Choose Exam)
- **Manage Notifications**
- **Contact Support**
- **Delete Account**
- **Logout**

### Navigation
- → **Choose Exam**, if changing exam goal(s) — screen should pre-populate existing selections.
- → **Subscription**, via a "Manage Plan" link.
- → **Logout** flow.

### Errors
- Invalid profile photo (unsupported format or excessive file size) → inline validation before upload attempt.
- Name field validation (empty or invalid characters) → inline error, save blocked until resolved.
- Save fails due to network issues → retry option; unsaved edits are preserved in the form, not discarded.
- Account deletion requires re-authentication → if re-auth fails, the deletion request is not processed, and the user is informed why.

### Success Messages
- "Profile updated successfully."

### Edge Cases
- User changes their registered email → requires re-verification via the **OTP** flow before the change takes effect.
- User has multiple exam goals set → each should be individually editable/removable rather than only supporting a single combined edit.
- Profile photo upload to Cloudinary fails mid-upload → clear retry option, and the previous photo remains in place until a new upload succeeds (never left blank on failure).
- Data export/deletion request → acknowledged immediately with a clear timeline for fulfillment, consistent with DPDP Act obligations.

### Loading States
- Skeleton profile card while account data loads.
- Spinner on Save Changes.
- Progress indicator during profile-photo upload.

---

## 12. Logout

### Purpose
Securely and clearly end the user's authenticated session.

### User Actions
- Initiate logout (from Profile or a global nav menu).
- Confirm or cancel the logout intent.

### Buttons
- **Logout** (entry point, typically in Profile or nav)
- Confirmation dialog: **Yes, Logout** / **Cancel**

### Navigation
- → **Landing Page**, following a confirmed logout.

### Errors
- Network failure during logout → the local session is cleared regardless (so the device is safely logged out), with a background retry for server-side token invalidation; the user is not left in an ambiguous "half logged out" state.
- Session already expired when Logout is triggered → this is not treated as an error; the app proceeds directly to the logged-out state.

### Success Messages
- "You've been logged out successfully."

### Edge Cases
- Logout triggered automatically due to an expired/invalid session (rather than user-initiated) → a distinct, non-alarming message: "Your session expired — please log in again," clearly different in tone from a voluntary logout confirmation.
- Logout attempted while a timed test is in progress (Practice) → an explicit warning about unsaved/in-progress test state before confirming, since exiting mid-test has real consequences under exam-simulation conditions.
- "Logout of all devices" option, useful if the user suspects unauthorized access to their account (a meaningful trust feature given the account holds subscription/payment history).

### Loading States
- Brief spinner while the local session and cached data are cleared, immediately before the redirect to the Landing Page.

---

## Cross-Cutting Standards (Applies to All Screens)

| Category | Standard |
|---|---|
| **Error tone** | Always specific, never blaming the user; always paired with a clear next action (retry, contact support, adjust input). |
| **Success feedback** | Brief, positive, and non-intrusive (toast/inline confirmation) — never blocks the user's next action with an unnecessary modal. |
| **Loading feedback** | Skeleton screens preferred over blank spinners wherever layout is predictable; genuine spinners reserved for short, unpredictable-duration operations (payment confirmation, AI generation). |
| **Offline handling** | Every screen must distinguish "no data yet" from "no connectivity" — these require different messaging and different recovery actions. |
| **Bilingual consistency** | Any screen supporting a language toggle must persist the user's choice across sessions and apply it consistently to system-generated messages (errors, success toasts), not just static content. |
| **Upsell honesty** | Every premium-gating moment (Learn, Practice, Analytics) must clearly state what is locked and why, consistent with the transparent-pricing principle established in `docs/CompetitorAnalysis.md` and `docs/UserPersonas.md`. |

---

*End of Document.*
