# services/mock/

The actual mock implementations backing every `services/*.ts` facade —
realistic, hand-authored TNPSC content (not lorem-ipsum/filler), simulated
network latency (`delay()`), and `localStorage`-backed state where a module
has user-mutable data (Notifications' read/deleted state, Learn/Practice/
Current Affairs progress).

**Never imported directly by a component or `features/*` file** — always
through the matching `services/X.ts` facade (`getDashboardSummary` from
`services/dashboardService.ts`, not `services/mock/dashboardMockService.ts`).
This indirection is the entire point: when Sprint 3's backend lands, only
the facade files change (their bodies become real `apiClient` calls against
`api/endpoints.ts`) — nothing under `features/`/`pages/` needs to change,
and nothing here needs to be imported anywhere else ever again.

| File                        | Backs facade                   | Notes                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dashboardMockService.ts`   | `services/dashboardService.ts` | `getRankSummary`'s `leaderboardMockService` import is now dead code in practice — `dashboardService.ts` reads real `GET /dashboard` rank data instead (Step 44), never this function                                                                                                                                                 |
| `leaderboardMockService.ts` | —                              | `services/leaderboardService.ts` is real now (see below) — this file survives only because `dashboardMockService.ts`'s unused `getRankSummary` still imports its `COHORT_SIZE`/`MY_POSITION` constants; not otherwise consumed anywhere live                                                                                         |
| `questionsMockService.ts`   | `services/practiceService.ts`  | Owns the raw question bank; `practiceService.ts` adds session-selection logic on top. Its subject/topic/subtopic names were originally hand-matched against the (now-removed) `subjectsMockService.ts`/`topicsMockService.ts` content tree — kept in sync with the real backend's seeded Learn hierarchy names instead as of Step 45 |
| `publicMockService.ts`      | `services/publicService.ts`    | Stats/Testimonials/Success Stories only — `getTopRankers` was removed once `publicService.ts` switched to the real `GET /public/top-rankers`                                                                                                                                                                                         |

Not every mocked module lives here: `authService.ts`, `onboardingService.ts`,
`practiceSessionService.ts`, `currentAffairsProgressService.ts`, and
`profileService.ts` are already fully mocked in place, each with its own
specialized, already-established behavior (OTP lockout simulation,
`localStorage` progress ledgers) that doesn't fit this facade/mock split
cleanly — see each file's own header comment. `learnProgressService.ts` is
now mostly real (see below) but keeps its own `localStorage` bucket for the
one content type still mocked (Practice questions from Sectional/Mock/PYQ/
100 Questions), same reason it was never part of this folder's split.

**`services/learnService.ts` is real as of Step 45** (Sprint 3) — no longer
a facade over a mock at all. `subjectsMockService.ts`/`topicsMockService.ts`
(the Subjects→Topics→Subtopics content tree they used to own) were deleted
once nothing imported them anymore; `learnProgressService.ts` is now a
**hybrid** — subtopic progress, video/note bookmarks, _and_ Current Affairs
bookmarks are all real (backed by `LearningProgress`/`Bookmark` in MongoDB,
the latter as of the Current Affairs step below); only Practice question
bookmarks for the still-mocked Sectional/Mock/PYQ/100 Questions modes stay
on its original `localStorage` bucket, since that content itself has no
real backend yet.

**`services/analyticsService.ts` is real as of Step 47** (Sprint 3) — every
function calls the live `backend/src/routes/analytics.routes.ts` module,
computed via MongoDB aggregation from `QuestionAttempt`/`PracticeSession`/
`LearningProgress`. `analyticsMockService.ts` was deleted once nothing
imported it anymore, same precedent as the Learn content-tree mocks above.

**`services/currentAffairsService.ts`, `services/leaderboardService.ts`,
and `services/notificationsService.ts` are all real as of the Current
Affairs + Leaderboard + Notifications backend step** — `currentAffairsMockService.ts`
and `notificationsMockService.ts` were deleted once nothing imported them
anymore, same "delete once orphaned" precedent as every prior real-backend
step. `currentAffairsProgressService.ts` (read-progress only) stays
`localStorage`-backed on purpose — no backend field exists for it, an
explicitly out-of-scope field for that step, unrelated to the article
content itself now being real. `leaderboardMockService.ts` survives only as
a dead import inside `dashboardMockService.ts`'s unused `getRankSummary`
(see the table above) — not deleted, since deleting it would break that
file's build even though nothing live actually calls that function anymore.

**`services/paymentsService.ts#getPricingPlans` is real as of Sprint 4 Step
55** (Premium Plans + Entitlement Engine) — it now calls the live
`GET /payments/plans` (`backend/src/config/plans.config.ts`'s catalog).
`paymentsMockService.ts` was deleted once nothing imported it anymore, same
"delete once orphaned" precedent as every prior real-backend step. The
authenticated `getMySubscription()` added alongside it was never mocked —
no authenticated Payments feature existed before this step.
