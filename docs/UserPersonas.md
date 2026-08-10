# Nalanda TNPSC — User Personas, Empathy Maps & Journey Maps

| | |
|---|---|
| **Document Owner** | UX Research |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md` |
| **Scope** | 5 primary personas spanning individual learners and the B2B/institutional side of the platform |

### Purpose & Method Note

The PRD (`docs/PRD.md`, Section 4) already defines four lightweight personas (Kalaivani, Arun, Meena, Suresh) at a business-goals level. This document goes one layer deeper as a **UX research artifact**: it adds two persona types the PRD does not yet cover in depth — the **coaching-center student** (a hybrid offline+digital learner) and the **coaching-center owner** (Nalanda's B2B buyer) — and adds empathy maps and journey maps to make each persona actionable for interaction design, not just positioning. Where a persona here overlaps with a PRD persona, it is noted explicitly so the two documents stay consistent rather than contradictory.

---

## Persona Index

| # | Persona | Represents (PRD linkage) | Role in Nalanda's Business Model |
|---|---|---|---|
| 1 | **Priya** — The College Student | New/overlaps with "Kalaivani" | Free/Plus tier, top-of-funnel volume |
| 2 | **Karthik** — The Working Professional | Same segment as "Arun" | Plus/Pro tier, high-LTV part-time user |
| 3 | **Divya** — The Full-Time TNPSC Aspirant | Same segment as "Meena" | Pro tier, highest engagement & advocacy |
| 4 | **Selvam** — The Coaching Center Student | New | Hybrid free/Plus user, acquired via institutional channel |
| 5 | **Rajendran** — The Coaching Center Owner | New | Institutional/B2B buyer, licensing revenue |

---

## 1. Priya — The College Student

| Attribute | Detail |
|---|---|
| **Age** | 20 |
| **Location** | Villupuram (tier-3 town), studying at a government arts & science college |
| **Education** | Second-year B.A. Economics |
| **Target Exam(s)** | TNPSC Group 4, VAO (first attempt); considering Group 2A later |

### Goals
- Secure a stable government job to support her family and gain social standing.
- Pass at least one TNPSC exam within the next 2 attempt cycles.
- Build foundational GK/aptitude knowledge without paying for coaching she can't afford yet.

### Motivation
- Family pressure and aspiration — she would be the first in her family to hold a government post.
- Peer influence: several seniors from her college have cleared Group 4/VAO, which makes the goal feel achievable.
- Financial security and stability that a government job represents in her community.

### Frustrations
- Free YouTube/Telegram content is contradictory — different channels teach different "shortcuts," and she can't tell which is trustworthy.
- No way to benchmark herself against other aspirants — she studies in isolation with no sense of her actual standing.
- College coursework and TNPSC prep compete for the same hours; she has no structured way to balance both.

### Daily Study Routine
- 1.5–2 hours/day, mostly evenings after college and household chores.
- Studies from borrowed printed guides and WhatsApp-forwarded PDFs; occasionally watches Tamil YouTube explainer videos at 1.5x speed.
- No fixed schedule — study happens "when there's time," not on a plan.

### Technical Skills
- Comfortable with smartphones, WhatsApp, YouTube, Instagram; not comfortable with unfamiliar apps that require account setup friction or English-only UIs.
- Types faster in Tamil (transliterated) than in English.

### Budget
- Very low discretionary spend (₹0–₹200/month realistically); relies on family for any paid resource, so must justify any spend as "worth it."

### Preferred Learning Style
- Visual and example-driven; short Tamil-medium video explanations over long text.
- Learns well through repetition-based quizzes rather than reading dense notes.

### Pain Points
- Cannot afford coaching institute fees (₹15,000–₹40,000/course).
- Overwhelmed by syllabus breadth with no clear "start here" path.
- Low confidence in English-medium sections (general English, some aptitude wording).

### Buying Behaviour
- Will not pay upfront without strong social proof (reviews, a friend's recommendation, or a visible free trial).
- Highly price-sensitive; a ₹49–₹99/month entry price is far more persuadable than an annual lump sum.
- Influenced heavily by what her peer group (college WhatsApp groups) is already using.

### Mobile Usage
- Android-only, shared or hand-me-down mid/low-range device; primary and often only computing device.
- Heavy data-consciousness — avoids auto-playing video, prefers downloadable/offline content.

### Internet Availability
- Intermittent 3G/4G via a prepaid data pack with a daily cap; home Wi-Fi is uncommon.
- Needs the app to work acceptably on low bandwidth and to cache content for offline review.

### Feature Expectations
- Free, structured syllabus walkthrough with a clear "what to study first" path.
- Tamil-first explanations with English terms introduced gradually.
- Lightweight quizzes she can finish during small pockets of time (10–15 minutes).
- Some way to see how she compares to other aspirants (even anonymized).

### How AI Can Help
- A personalized "start here" study plan generated from a 5-minute diagnostic, so she doesn't have to guess where to begin.
- AI-driven weak-area detection so limited study time is spent on her actual gaps, not a generic full syllabus re-read.
- A Tamil-medium AI doubt chatbot that reduces her dependence on unreliable WhatsApp groups for quick clarifications.

### How Analytics Can Help
- Simple percentile/rank feedback after each quiz builds the reality-check and motivation the PRD identifies as critical at the Mock Testing stage.
- Visible syllabus-completion percentage gives her a tangible sense of progress despite an unstructured daily routine.
- Streak/consistency tracking nudges her toward regular (even if short) daily study sessions.

### Empathy Map

| Quadrant | Details |
|---|---|
| **Thinks & Feels** | "Am I even studying the right things?" Anxious about wasting limited time; hopeful but easily discouraged by comparison to wealthier peers who afford coaching. |
| **Sees** | Conflicting free YouTube channels; seniors' success stories on Instagram; coaching institute ads she can't afford; a cluttered syllabus PDF. |
| **Hears** | Family saying "just study hard, it'll work out"; peers debating which YouTube channel is "actually correct"; coaching agents' sales pitches. |
| **Says & Does** | Asks classmates which channel/app to trust; forwards and re-shares PDFs; switches between 3–4 free apps looking for "the right one." |
| **Pain** | No structure, no feedback loop, no way to verify she's on track, financial constraint blocking premium help. |
| **Gain** | Free/cheap structured guidance, a sense of "someone is guiding me," visible proof of progress. |

### Journey Map

| Stage | Action | Thoughts/Feelings | Nalanda Touchpoint | Opportunity |
|---|---|---|---|---|
| Discovery | Sees a friend using Nalanda / finds it via a "TNPSC Group 4 syllabus" search | Skeptical, curious | SEO landing page, free syllabus content | Lead with genuinely free, high-value content — no paywall on the first touch |
| Onboarding | Signs up with Google, picks Group 4 + VAO | Hopeful but impatient | Guided exam-selection flow | Keep onboarding under 60 seconds; avoid English-heavy forms |
| Diagnostic | Takes a short diagnostic quiz | Nervous about being "found out" as behind | AI diagnostic + skill map | Frame results encouragingly, not just a raw score |
| Daily Study | Uses spare 15–20 minute pockets | Slightly guilty about inconsistency | Streaks, short quizzes, Tamil notes | Design for short, resumable sessions, not long linear courses |
| Mock Test | Takes her first full mock closer to the exam | Anxious, seeking validation | Rank/percentile, sectional analysis | Make the first mock test free and non-threatening in tone |
| Decision to Pay | Considers Plus tier before the exam date | Weighs cost vs. perceived benefit | Transparent pricing page | Show a concrete "what changes if you upgrade" comparison, not vague upsells |
| Post-Exam | Awaits results, discusses answer key | Anxious, seeking community | Community/answer-key discussion | Retain her regardless of outcome — funnel into next exam attempt or next persona stage |

---

## 2. Karthik — The Working Professional

| Attribute | Detail |
|---|---|
| **Age** | 28 |
| **Location** | Coimbatore |
| **Education** | B.E. Mechanical; currently working as a private-sector supervisor |
| **Target Exam(s)** | TNPSC Group 2 / 2A |

### Goals
- Transition from a private job with limited long-term security to a government position with better job security and social respect.
- Clear Group 2/2A within 1–2 attempts without quitting his current job.

### Motivation
- Job security, pension benefits, and social status associated with government service.
- A desire to "not waste" the effort already invested in earlier partial attempts at studying.
- Family expectation of stability now that he is considering marriage/family planning.

### Frustrations
- Constantly feels behind because he can't attend live classes at fixed times.
- Generic multi-exam platforms (per `CompetitorAnalysis.md`, e.g., Testbook, Byju's Exam Prep) waste his limited time with content not specific to TNPSC.
- Loses track of which topics he has actually mastered versus merely "read once."

### Daily Study Routine
- 1–2 hours/day, almost always 9:30 PM–11:30 PM after work, plus commute-time audio/video on weekdays.
- Weekend catch-up sessions of 3–4 hours when possible.
- Prefers finishing a complete topic or test in one sitting rather than fragmented reading.

### Technical Skills
- High digital literacy — comfortable with apps, subscriptions, digital payments, cloud note-taking.
- Uses a laptop occasionally on weekends but is mobile-first on weekdays.

### Budget
- Moderate discretionary income (₹500–₹1,500/month is easily justifiable if ROI is clear).
- Values time far more than money — will pay for anything that saves him study hours.

### Preferred Learning Style
- Dense, high-yield content: bullet-point notes, one-liners, and quizzes over long lecture videos.
- Prefers self-paced, on-demand content to anything requiring live attendance.

### Pain Points
- No time for long-form lectures; needs the "so what" of every topic quickly.
- Struggles to identify which of his weak areas are actually costing him marks versus which feel weak but aren't tested often.
- Reminders/notifications are either absent (he forgets) or excessive (he gets fatigued and ignores them).

### Buying Behaviour
- Researches before buying — compares 2–3 platforms, reads reviews, checks for hidden auto-renewal traps (a known Testbook/Byju's complaint pattern).
- Prefers a clear, published price over a "contact us" quote (a gap identified for Vetri App, Dexter Academy, and Shankar IAS Academy in `CompetitorAnalysis.md`).
- Will subscribe to an annual plan if convinced early, since he dislikes repeated purchase decisions.

### Mobile Usage
- Mid-to-high-range Android or iPhone; heavy daily mobile use across work and personal apps.
- Frequently studies during commute and lunch breaks — needs quick app launch and resumability.

### Internet Availability
- Stable 4G/Wi-Fi at home and office; occasional patchy connectivity during commute.
- Downloads content in advance for commute-time offline use.

### Feature Expectations
- Adaptive practice that prioritizes his actual weak topics, not a fixed linear syllabus order.
- Push reminders that are smart (adjust to his actual activity pattern) rather than generic daily spam.
- A clean, quantified progress dashboard he can check in under a minute.

### How AI Can Help
- AI-generated personalized study plan that fits his stated 1–2 hours/day and adjusts automatically when he misses a day (per PRD Section 10, Feature 1).
- Adaptive difficulty so he isn't re-served questions he's already mastered, respecting his limited time.
- Smart revision scheduler (spaced repetition) so previously studied topics resurface right before he'd otherwise forget them.

### How Analytics Can Help
- Time-per-question and sectional analytics tell him precisely where marks are being lost, letting him triage effort efficiently.
- A weekly progress summary (not just per-test) matches his check-in cadence better than a constant real-time dashboard.
- Percentile tracking over time shows trend, not just a single-test snapshot, which matters more for a slow, part-time preparation arc.

### Empathy Map

| Quadrant | Details |
|---|---|
| **Thinks & Feels** | "Am I actually improving, or just spinning my wheels?" Time-pressured, mildly anxious about balancing job and prep, wants efficiency above all. |
| **Sees** | Colleagues who cleared exams years ago; generic multi-exam app dashboards cluttered with irrelevant exams; his own inconsistent streak. |
| **Hears** | Coworkers casually mentioning "just take the exam, what's the harm"; family asking about progress; ads for premium coaching he considers overpriced. |
| **Says & Does** | Compares 2–3 apps before subscribing; sets phone reminders manually because in-app ones feel generic; studies in short, intense bursts. |
| **Pain** | Time scarcity, generic content dilution, unclear ROI on time spent. |
| **Gain** | Clear, fast feedback on what's working; content that respects his limited time; confidence that his effort compounds. |

### Journey Map

| Stage | Action | Thoughts/Feelings | Nalanda Touchpoint | Opportunity |
|---|---|---|---|---|
| Discovery | Compares apps after a colleague mentions TNPSC prep online | Analytical, comparison-shopping | Comparison-friendly landing page, transparent pricing | Publish pricing upfront; this persona actively distrusts "contact us" pricing |
| Onboarding | Inputs target exam, date, and 1–2 hrs/day availability | Wants to see immediate personalization | AI study-plan generator | Show a concrete, dated plan within seconds of onboarding — instant perceived value |
| Structured Study | Studies late at night in short bursts | Focused but fatigued | Bite-sized notes, adaptive quizzes | Keep session lengths short and clearly bounded (e.g., "12-minute session") |
| Practice | Takes topic quizzes during commute | Efficiency-focused | Offline-cached quizzes, quick resume | Ensure state saves mid-quiz if interrupted by a call or network drop |
| Mock Test | Weekend full-length mock | Seeking a hard reality check | Full mock engine, sectional analytics | Weekly/bi-weekly mock cadence matching his weekend availability |
| Renewal Decision | Considers renewing subscription | Evaluating ROI over past weeks | Renewal reminder, progress trend view | Show a "here's what you gained this month" recap before the renewal prompt |
| Outcome | Passes Prelims, moves to Mains prep | Motivated, more time-invested now | Mains module, deeper analytics | Upsell naturally into Pro tier at this transition, not before |

---

## 3. Divya — The Full-Time TNPSC Aspirant

| Attribute | Detail |
|---|---|
| **Age** | 25 |
| **Location** | Trichy, living with family while preparing full-time |
| **Education** | M.A. Public Administration |
| **Target Exam(s)** | TNPSC Group 1 (third attempt — cleared Prelims twice, not yet cleared Mains) |

### Goals
- Finally clear Group 1 Mains and the interview stage this attempt cycle.
- Build a genuine edge in answer-writing and current affairs depth beyond what free content offers.

### Motivation
- Deep personal investment — years of preparation and prior partial success make quitting feel like wasted effort.
- A strong sense of purpose around public service, reinforced by her postgraduate specialization.
- Pressure to justify continued full-time preparation (opportunity cost) to her family.

### Frustrations
- Mains answer-writing feedback is subjective and hard to get without expensive one-on-one mentoring.
- Current affairs volume feels infinite and unfiltered — she can't tell what's actually exam-relevant.
- Free content plateaus — she has already consumed most of what YouTube/Winmeen-style sources offer and needs a genuine "next level."

### Daily Study Routine
- 8+ hours/day, structured into blocks: morning current affairs, midday subject study, afternoon answer writing, evening revision.
- Maintains her own handwritten notes and a physical answer-writing register.
- Takes at least one full-length mock or sectional test most days.

### Technical Skills
- High comfort with digital tools; already uses multiple apps/websites (Winmeen, Adda247 Tamil, YouTube) simultaneously and is used to cross-referencing sources.
- Comfortable typing in English for essay/answer practice, though thinks and reasons bilingually.

### Budget
- Highest willingness to pay among the five personas — treats this as a "final push" investment; ₹2,000–₹5,000+/year is justifiable if it demonstrably improves Mains performance.
- Will pay for one-on-one or small-group mentorship-style features if genuinely differentiated.

### Preferred Learning Style
- Deep, structured, mentor-guided learning; wants rubric-based feedback, not just scores.
- Values curated, prioritized content over raw volume — "tell me what matters," not "here's everything."

### Pain Points
- No scalable way to get quality feedback on descriptive answers without an expensive real mentor.
- Current affairs overload with no relevance filtering specific to Group 1 Mains themes (ethics, governance, state-specific issues).
- Isolation — full-time solo preparation with no peer accountability or benchmark group.

### Buying Behaviour
- Willing to pay for premium tiers upfront, especially annual plans, if she trusts the feature will move her actual outcome (Mains score).
- Strongly influenced by credible testimonials/success stories from aspirants in a similar situation (repeat attempters), more than generic marketing.
- Will churn quickly if a paid feature underdelivers versus its promise — high expectations, low tolerance for gimmicks.

### Mobile Usage
- Uses both mobile (for revision, current affairs, quizzes on the go) and a laptop/tablet for serious answer-writing sessions.
- Comfortable across both surfaces; expects continuity (progress syncs) between them.

### Internet Availability
- Stable home Wi-Fi given her full-time study setup; not a bandwidth-constrained user.

### Feature Expectations
- AI-assisted mains-answer evaluation with actionable, rubric-based feedback (structure, relevance, coverage) — not just a numeric score.
- Curated, monthly current-affairs capsules explicitly tagged to Mains-relevant themes.
- Mock interview practice and a way to benchmark her Mains-readiness against other serious aspirants.

### How AI Can Help
- AI mains-answer evaluation (PRD Section 10, Feature 5) directly addresses her single biggest bottleneck — lack of scalable, high-quality answer-writing feedback.
- Current-affairs summarizer with relevance tagging (Feature 6) cuts through information overload specific to her stage of preparation.
- Performance prediction / rank estimator (Feature 7) gives her a realistic read on where she stands relative to the invisible competition she's up against.

### How Analytics Can Help
- Answer-writing analytics over time (structure quality, relevance score trends across attempts) show whether her writing is genuinely improving, not just her recall.
- Sectional and topic-level Mains analytics help her allocate her 8-hour day precisely rather than spreading effort evenly across a huge syllabus.
- Comparative percentile data (within Nalanda's serious-aspirant cohort) gives her the "compared to peers like me" signal that solo preparation otherwise can't provide.

### Empathy Map

| Quadrant | Details |
|---|---|
| **Thinks & Feels** | "This has to be the attempt that works." A mix of quiet exhaustion and stubborn determination; frustrated by the invisibility of her own progress on subjective skills like answer writing. |
| **Sees** | Peers from her postgraduate cohort who've already cleared exams or moved on to other careers; an ever-growing pile of current affairs sources; her own answer-writing register with no external feedback marks. |
| **Hears** | Family gently questioning "how much longer"; other aspirants' success stories in online forums; conflicting advice on what's "actually important" for Mains. |
| **Says & Does** | Cross-references multiple sources for current affairs; writes practice answers with no consistent feedback loop; seeks out any credible mentor or evaluator she can access. |
| **Pain** | No scalable feedback on the one skill (answer writing) that decides her outcome; information overload; isolation. |
| **Gain** | Credible, rubric-based feedback; a filtered, high-signal current-affairs stream; a sense of measurable progress toward Mains readiness. |

### Journey Map

| Stage | Action | Thoughts/Feelings | Nalanda Touchpoint | Opportunity |
|---|---|---|---|---|
| Discovery | Searches specifically for "TNPSC Mains answer evaluation" after another cycle of unclear self-assessment | Skeptical but hopeful for a genuine solution | Targeted content/SEO around Mains answer writing | Speak directly to the "no feedback loop" pain point in messaging, not generic prep marketing |
| Onboarding | Selects Group 1, indicates prior Prelims clearance and Mains focus | Wants to be recognized as an advanced user, not a beginner | Persona-aware onboarding branching | Route her to Mains-specific content immediately, skip beginner diagnostics |
| Deep Study | Daily structured blocks: current affairs, subject study, answer writing | Focused, self-critical | Curated current-affairs capsule, answer-writing module | Keep the answer-writing submission flow frictionless (fast upload/typing, quick turnaround feedback) |
| Feedback Loop | Submits practice answers, awaits evaluation | Anxious for credible, specific feedback | AI mains evaluation with rubric breakdown | Make feedback specific and improvement-oriented, never just a score — trust hinges on this |
| Benchmarking | Takes sectional/full Mains-style mocks | Seeking validation of readiness | Percentile/rank estimator among serious aspirants | Ensure the comparison cohort is genuinely comparable (other Mains-stage users), not diluted by beginners |
| Interview Prep | Approaches interview stage after clearing Mains | High-stakes, seeks structured practice | Mock interview module | Offer structured, rubric-based mock interviews, echoing what only Shankar IAS Academy currently offers |
| Outcome/Advocacy | Clears or reattempts | Relief or renewed determination | Success-story capture / retention into next cycle | She is Nalanda's most credible advocate if successful — invest in a respectful, consent-based testimonial program |

---

## 4. Selvam — The Coaching Center Student

| Attribute | Detail |
|---|---|
| **Age** | 23 |
| **Location** | Madurai |
| **Education** | B.Com graduate |
| **Target Exam(s)** | TNPSC Group 2/2A, enrolled at a local coaching institute (e.g., a Dexter Academy-style regional center) |

### Goals
- Get the maximum value out of the coaching fees his family has already paid.
- Supplement classroom teaching with extra practice between physical classes.
- Clear the exam within the timeline his coaching batch is structured around.

### Motivation
- Sunk-cost commitment — his family paid a meaningful coaching fee, so he wants to make it "worth it."
- Peer accountability from his coaching batchmates creates social motivation to keep pace.
- Trust in his coaching institute's faculty as the primary source of truth, supplemented (not replaced) by digital tools.

### Frustrations
- Physical classes move at a fixed pace that doesn't match his personal strengths/weaknesses — sometimes too slow, sometimes too fast.
- Institute-provided material is often photocopied/PDF-based with no interactive practice or instant feedback.
- Hard to get individual doubt resolution in a large batch classroom setting.

### Daily Study Routine
- Attends 2–3 hours of physical/live-online coaching classes daily, plus 2–3 hours of self-study using institute material at home.
- Practices from institute-provided question sets, occasionally supplemented by free apps or YouTube.
- Weekly institute mock tests set the rhythm of his preparation.

### Technical Skills
- Moderate — comfortable with WhatsApp (his institute's primary digital touchpoint), YouTube, and basic apps; less experienced with more complex SaaS-style dashboards.

### Budget
- Already spent his primary budget on coaching fees (₹10,000–₹25,000/course); has limited additional spend left for a second paid product unless it's clearly complementary, not redundant.
- More likely to pay for a low-cost add-on (₹49–₹149/month) than a full competing subscription.

### Preferred Learning Style
- Blended: values live human teaching for concept explanation, but wants digital tools specifically for repetitive practice and self-testing.
- Comfortable with structured, syllabus-following pacing set externally (by the institute) rather than fully self-directed learning.

### Pain Points
- Redundant or conflicting information between institute material and outside digital sources.
- No easy way to track his own analytics separately from the institute's own (often informal) tracking.
- Feels he needs "more practice" between classes but institute resources refresh slowly.

### Buying Behaviour
- Trusts recommendations from his coaching institute above generic app-store discovery — if his institute recommends or bundles a tool, adoption friction drops sharply.
- Price-sensitive as a secondary/supplementary spend, not a primary one.
- More likely to adopt something his batchmates are already using (social proof within a tight-knit cohort).

### Mobile Usage
- Primary device for all supplementary study; uses it between/after physical classes.
- Uses WhatsApp groups heavily for institute communication and peer discussion.

### Internet Availability
- Reasonably stable in a tier-2 city (Madurai) with home Wi-Fi or affordable 4G; occasional data constraints near month-end.

### Feature Expectations
- Practice content that complements (not duplicates) what his institute already teaches — ideally syllabus-aligned to standard TNPSC patterns his coaching also follows.
- Individual analytics he can use to have more productive conversations with his coaching faculty about his specific weak areas.
- Quick between-class practice sessions that fit around a fixed physical class schedule.

### How AI Can Help
- Weak-area detection gives him concrete, individual talking points to bring to his coaching faculty, making limited one-on-one doubt time more productive.
- AI doubt chatbot fills the gap between classes when faculty isn't immediately available.
- Adaptive practice ensures his supplementary self-study time targets gaps the classroom pace doesn't address for him personally.

### How Analytics Can Help
- Personal analytics distinct from the institute's own (often informal, paper-based) tracking give him an objective, portable record of his progress.
- Comparative percentile data (even just among Nalanda's broader user base) supplements the institute's own internal batch ranking with a wider benchmark.
- Progress trends over the coaching course's duration help him and his family gauge whether the coaching investment is translating into real improvement.

### Empathy Map

| Quadrant | Details |
|---|---|
| **Thinks & Feels** | "I've already paid for coaching — I need this to work." Values his institute's guidance but sometimes feels lost in a large batch; wants a personal edge without abandoning trusted structure. |
| **Sees** | A packed physical classroom; photocopied/PDF-based institute material; batchmates on WhatsApp comparing notes and asking doubts. |
| **Hears** | Faculty covering standard syllabus at a fixed group pace; batchmates discussing which extra apps they use; family asking if the coaching fee is "worth it." |
| **Says & Does** | Supplements classroom learning with WhatsApp-shared PDFs and YouTube; asks faculty for extra doubt-clearing time when possible; compares his own pace informally with batchmates. |
| **Pain** | Fixed classroom pace mismatched to his personal level; redundant/conflicting material; limited individual doubt-resolution bandwidth. |
| **Gain** | A complementary digital layer that respects and reinforces (not competes with) his coaching investment; objective personal analytics; efficient use of between-class time. |

### Journey Map

| Stage | Action | Thoughts/Feelings | Nalanda Touchpoint | Opportunity |
|---|---|---|---|---|
| Discovery | Institute recommends/bundles Nalanda as a supplementary tool, or he finds it independently | Curious but wary of redundancy | Institutional partnership channel, or organic app-store discovery | Pursue B2B partnerships with coaching institutes as a distribution channel, not just direct-to-consumer |
| Onboarding | Signs up, aligns his exam goal to match his coaching batch's target | Wants quick setup that doesn't duplicate what he already has | Exam-goal selection | Offer an "import/align with your coaching syllabus" framing so it doesn't feel redundant |
| Supplementary Practice | Uses the app between and after physical classes | Focused on filling specific gaps | Adaptive practice, quick quizzes | Design explicitly for "gap-filling" sessions, distinct from primary-course positioning |
| Doubt Resolution | Hits a doubt outside class hours | Frustrated by delayed faculty access | AI doubt chatbot | Position the chatbot as a bridge to faculty availability, not a faculty replacement |
| Progress Check-in | Compares his analytics with institute's internal ranking | Seeking an objective second opinion | Personal analytics dashboard | Make analytics exportable/shareable so he can discuss them with his coaching faculty |
| Mock Test | Takes institute weekly mocks plus Nalanda's own mocks | Wants broader benchmarking than just his batch | Percentile among Nalanda's wider user base | Clearly differentiate Nalanda's benchmark pool from the institute's smaller batch-only ranking |
| Outcome | Clears exam or continues to next attempt | Credits both institute and supplementary tools | Retention/referral | Encourage referral to batchmates — this persona's adoption is highly peer-driven |

---

## 5. Rajendran — The Coaching Center Owner

| Attribute | Detail |
|---|---|
| **Age** | 45 |
| **Location** | Salem (tier-2 city), runs a mid-sized TNPSC/competitive-exam coaching institute with ~300 active students across 2 branches |
| **Education** | M.Com; two decades running the institute after an earlier career in education administration |
| **Role** | B2B decision-maker and buyer — Nalanda's Institutional/B2B persona (per PRD Section 9) |

### Goals
- Differentiate his institute from larger Chennai-based brands (Shankar IAS, Dexter Academy) and free resources (Winmeen) by offering a modern, tech-enabled learning experience.
- Improve student outcomes (pass rates) to strengthen his institute's reputation and word-of-mouth referrals.
- Reduce the administrative burden of manually tracking attendance, test scores, and student progress across two branches.

### Motivation
- Business survival and growth in an increasingly competitive coaching market where digital-native players (Vetri App, Testbook, Adda247) are encroaching on his traditional customer base.
- Professional pride in producing successful candidates — his reputation is built on outcomes, not just enrollment numbers.
- Desire to modernize without fully replacing his core asset: experienced human faculty and in-person mentorship.

### Frustrations
- Struggles to track individual student performance and weak areas across 300 students using manual/paper-based or basic spreadsheet methods.
- Sees students independently using apps like Vetri App or Adda247 Tamil and worries about losing "ownership" of the student relationship and data.
- Limited technical staff/budget to build or maintain custom software himself.

### Daily Study Routine *(interpreted as Daily Operational Routine)*
- Splits time between both branches, oversees faculty scheduling, reviews weekly test results manually, and personally handles parent/student queries about progress.
- Spends significant time each week compiling test scores and rankings by hand or in basic spreadsheets to share with students and parents.

### Technical Skills
- Moderate — comfortable with WhatsApp Business, basic spreadsheets, and standard smartphone apps; not a power user of complex SaaS admin dashboards, so values simplicity and guided setup over configurability.
- Relies on younger staff members for anything more technical.

### Budget
- Meaningful institutional budget available (₹20,000–₹1,00,000+/year plausible) if a tool demonstrably improves student outcomes, retention, or operational efficiency — but requires clear, demonstrable ROI before committing, not just a features list.
- Prefers predictable, transparent institutional pricing (per-student or per-branch licensing) over ambiguous custom quotes — notably, this is the same "quote-based pricing" friction his own institute peers (Shankar IAS Academy, Dexter Academy) are criticized for in `CompetitorAnalysis.md`, so a transparent institutional price list is a genuine differentiator for Nalanda.

### Preferred Learning Style *(interpreted as Preferred Management/Decision Style)*
- Prefers concrete case studies and peer references ("which other institutes use this") over abstract feature pitches.
- Wants a low-friction pilot (e.g., one branch or one batch) before committing institute-wide.

### Pain Points
- No unified system to assign exams, track attendance, and view performance analytics across both branches.
- Risk of appearing "behind the times" to prospective students comparing institutes, several of whom now expect some digital component.
- Difficulty proving his institute's value quantitatively (e.g., average score improvement) to prospective students' families during admissions season.

### Buying Behaviour
- Institutional/B2B buying behavior: evaluates via a demo or pilot, negotiates per-student or per-branch pricing, and expects dedicated onboarding/support rather than a self-serve signup flow.
- Highly influenced by peer institute adoption and concrete outcome data (e.g., a case study showing measurable score improvement, similar to the testimonial pattern seen in Vetri App's marketing).
- Decision cycle is slower than an individual consumer's — involves discussion with co-faculty and sometimes a trial term before renewal commitment.

### Mobile Usage
- Uses mobile primarily for communication (WhatsApp, calls) and light oversight (checking dashboards); heavier administrative work happens on a desktop/laptop at the institute office.

### Internet Availability
- Stable broadband at both branch offices; less of a bandwidth-constrained persona than his own students.

### Feature Expectations
- A coaching-center management console: student enrollment, exam assignment, attendance tracking, and cohort-level performance analytics (directly aligned with the B2B feature already offered by Vetri App, per `CompetitorAnalysis.md`).
- White-labeled or co-branded access so students perceive the tool as part of his institute's offering, not a competing third-party product.
- Simple, exportable reports he can show to parents/prospective students as proof of teaching effectiveness.

### How AI Can Help
- Aggregated, AI-driven weak-area analysis across his entire student cohort helps him and his faculty target classroom teaching time toward the topics genuinely causing the most students to lose marks.
- AI-flagged at-risk students (those falling behind pace or repeatedly underperforming) let him and his faculty intervene proactively rather than reactively.
- Reduces manual administrative overhead (auto-generated performance reports) freeing his time for higher-value mentorship and business development.

### How Analytics Can Help
- Cohort-level dashboards (batch-wide average scores, sectional weak spots, attendance-performance correlation) replace his current manual/spreadsheet tracking.
- Comparative benchmarking of his institute's students against the broader Nalanda user base gives him credible, third-party-validated proof points for marketing to prospective students' families.
- Term-over-term trend data supports renewal/retention conversations with students and parents, and can substantiate his institute's outcome claims.

### Empathy Map

| Quadrant | Details |
|---|---|
| **Thinks & Feels** | "I need to modernize without losing what makes my institute personal." Proud of his faculty and track record, but anxious about digital-native competitors and losing the student relationship to an app. |
| **Sees** | Students using consumer apps independently; competing institutes advertising "AI-powered" preparation; a growing pile of manual test-score spreadsheets. |
| **Hears** | Parents asking what makes his institute different from free/cheap online options; faculty expressing frustration with manual tracking overhead; peer institute owners discussing digital adoption. |
| **Says & Does** | Asks other institute owners what tools they use; requests demos before committing; personally reviews weekly test results by hand. |
| **Pain** | Manual, non-scalable performance tracking; competitive pressure from digital-native players; limited technical capacity in-house. |
| **Gain** | A tool that strengthens (not replaces) his institute's brand and faculty relationships, demonstrable outcome data for marketing, and reduced admin overhead. |

### Journey Map

| Stage | Action | Thoughts/Feelings | Nalanda Touchpoint | Opportunity |
|---|---|---|---|---|
| Awareness | Hears about Nalanda's institutional offering from a peer institute owner or a Nalanda B2B outreach effort | Cautiously interested, competitive concern | B2B sales outreach, case studies/testimonials | Lead with peer institute proof points and concrete outcome data, not generic feature lists |
| Evaluation | Requests a demo, asks about pricing and data ownership | Analytical, risk-averse | Transparent institutional pricing page, live demo | Publish clear per-student/per-branch pricing tiers upfront, unlike quote-based competitors |
| Pilot | Runs a pilot with one batch/branch | Watching for real outcome signals, not just features | Cohort analytics dashboard, onboarding support | Provide hands-on onboarding support given his moderate technical comfort |
| Rollout | Expands to both branches if pilot succeeds | Growing confidence, seeking co-branding options | White-label/co-branded student access | Offer easy co-branding so students see it as "his institute's tool" |
| Ongoing Use | Reviews weekly/monthly cohort analytics, flags at-risk students | Relief at reduced admin burden | AI-flagged at-risk students, exportable reports | Auto-generate parent-ready reports to save him manual compilation time |
| Renewal/Advocacy | Renews annually, potentially refers peer institute owners | Confident advocate if outcomes improved | Renewal touchpoint, referral program | Build an institute-referral incentive program — this persona's network is a strong distribution channel |

---

## Cross-Persona Recommendations for Nalanda TNPSC

1. **Design onboarding branches by persona intent, not a single generic flow.** Priya needs a beginner-friendly "start here" path; Karthik needs fast, time-respecting personalization; Divya needs to skip beginner content entirely and land in Mains-focused tools; Selvam needs an "align with your coaching syllabus" framing; Rajendran needs an institutional signup path entirely separate from the consumer flow. A single onboarding flow will underserve at least three of these five personas.

2. **Treat transparent pricing as a cross-cutting differentiator, not just a B2C tactic.** Both individual personas (Priya, Karthik) and the institutional persona (Rajendran) are put off by "contact us for a quote" pricing — a pattern this research and `CompetitorAnalysis.md` both independently surface across Vetri App, Dexter Academy, and Shankar IAS Academy. Publishing clear tiers for both individual and institutional plans is a low-cost, high-trust differentiator.

3. **Build the coaching-institute channel (Selvam + Rajendran) as a deliberate acquisition strategy, not an afterthought.** Selvam's adoption is driven heavily by institute recommendation and peer/batchmate usage; Rajendran is a B2B buyer motivated by outcome data and reduced admin burden. Together they represent a distribution channel where one successful institute partnership can bring dozens of students at once — a meaningfully more efficient acquisition path than pure direct-to-consumer marketing for tier-2/tier-3 cities.

4. **Make analytics legible at very different altitudes for different personas.** Priya needs simple, encouraging percentile feedback; Karthik needs weekly trend summaries; Divya needs granular rubric-based answer-writing analytics; Selvam needs personal analytics portable enough to discuss with his coaching faculty; Rajendran needs cohort-level, exportable, parent-ready reports. A single analytics view will not satisfy all five — Nalanda needs at least an individual view and a cohort/institutional view as genuinely distinct surfaces.

5. **Prioritize AI mains-answer evaluation and the coaching-center management console as the two highest-leverage builds.** Across personas, Divya's need (scalable, credible Mains feedback) and Rajendran's need (cohort management replacing manual tracking) are the two most acute, highest-willingness-to-pay problems surfaced — and both align with whitespace already identified in `CompetitorAnalysis.md` (no reviewed competitor does AI mains evaluation at scale; only Vetri App offers a coaching-center console, and its depth is unconfirmed).

6. **Respect bandwidth and device constraints as a default, not an edge case.** Priya (and, to a lesser extent, Selvam) represent a large share of Nalanda's addressable market in tier-2/tier-3 Tamil Nadu. Every feature — including AI chat, analytics dashboards, and video content — must degrade gracefully on low-end Android devices and intermittent connectivity, consistent with the PRD's non-functional requirements (Section 8).

7. **Build trust-building mechanisms tailored to each persona's proof requirement.** Priya trusts peer/social proof; Karthik trusts comparison-shopping and transparent terms; Divya trusts credible testimonials from aspirants in her exact situation (repeat Mains attempters); Selvam trusts his coaching institute's endorsement; Rajendran trusts peer institute case studies and pilot-based validation. A single generic "trusted by X users" banner will not move any of these personas as effectively as persona-specific proof.

---

*End of Document.*
