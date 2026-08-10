/**
 * Frontend route path constants, matching the illustrative route map in
 * docs/InformationArchitecture.md §9. Used by `routes/` (once a real route
 * table exists) and by any `<Link>`/redirect in the app — never hand-type
 * a path string at the call site.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  /** The shared OTP-entry screen (docs/OTP_Flow.md) — reached from both
   * Login and Register, which pass `{ email, intent }` via router state;
   * accessing it with no state redirects back to `login`. */
  verifyEmail: '/verify-email',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  blog: '/blog',
  /** Full feature-detail page linked from the Landing Page's Feature Cards
   * section (docs/Landing_Page_Design.md §11's closing "Explore All
   * Features" CTA) — not built yet, same status as `about`/`contact`/`blog`. */
  features: '/features',
  /** Dedicated stories/testimonials page linked from the Landing Page's
   * Success Stories section (docs/Landing_Page_Design.md §14's "Read More
   * Success Stories" CTA) — not built yet, same status as `features`. */
  successStories: '/success-stories',
  privacy: '/privacy',
  terms: '/terms',
  /** Public exam landing page (docs/InformationArchitecture.md §9's
   * `/exams/:examSlug`) — `slug` should be an `EXAM_CATEGORIES[number].id`
   * (constants/exam.ts). */
  examLanding: (slug: string) => `/exams/${slug}`,
  /** An in-page anchor on the public Website home (docs/Landing_Page_Design.md
   * §11's Feature Cards section) — used by the Navbar's product-module links
   * before those modules have their own public route. */
  homeSection: (sectionId: string) => `/#${sectionId}`,
  /** The post-registration wizard (docs/Onboarding.md,
   * docs/Onboarding_Personalization_Flow.md) — authenticated-only, reached
   * right after a new account verifies (never on an existing-user login). */
  onboarding: '/app/onboarding',
  dashboard: '/app/dashboard',
  /** Learn module hierarchy (docs/Learn_Module.md) — `subjectId`/`topicId`/
   * `subtopicId` are hand-authored kebab-case slugs (`utils/slugify.ts`,
   * `services/learnService.ts`), not opaque IDs. */
  learnSubjects: '/app/learn',
  learnTopics: (subjectId: string) => `/app/learn/${subjectId}`,
  learnSubtopics: (subjectId: string, topicId: string) =>
    `/app/learn/${subjectId}/${topicId}`,
  learnLesson: (subjectId: string, topicId: string, subtopicId: string) =>
    `/app/learn/${subjectId}/${topicId}/${subtopicId}`,
  learnVideo: (subjectId: string, topicId: string, subtopicId: string) =>
    `/app/learn/${subjectId}/${topicId}/${subtopicId}/video`,
  learnNotes: (subjectId: string, topicId: string, subtopicId: string) =>
    `/app/learn/${subjectId}/${topicId}/${subtopicId}/notes`,
  learnBookmarks: '/app/learn/bookmarks',
  learnRevision: '/app/learn/revision',
  practice: (mode: string) => `/app/practice/${mode}`,
  /** Smart Practice's live/summary/review screens (docs/Smart_Practice.md)
   * — `sessionId` is a locally generated mock id
   * (`services/practiceSessionService.ts`), not a real backend id. */
  practiceSession: (sessionId: string) => `/app/practice/session/${sessionId}`,
  practiceSummary: (sessionId: string) => `/app/practice/session/${sessionId}/summary`,
  practiceReview: (sessionId: string) => `/app/practice/session/${sessionId}/review`,
  /** Step 46 — real Topic Quiz history (backend `GET /practice/history`). A
   * static segment, so it must be declared as its own `<Route>` distinct
   * from `practice(':mode')` above; React Router ranks static path
   * segments over dynamic ones regardless of declaration order, so the two
   * never collide even though `/app/practice/history` also matches
   * `:mode`. */
  practiceHistory: '/app/practice/history',
  /** Weekly Live Exam (Step 48, docs/InformationArchitecture.md §7.10) —
   * `:tab` mirrors `currentAffairs(period)`'s pattern (`upcoming` \| `live`
   * \| `completed` \| `my-attempts`); the detail/session/result screens use
   * a literal `exam/` prefix, the same "static segment disambiguates from
   * the tab param" precedent `currentAffairsArticle` already set relative
   * to `currentAffairs(period)`. */
  liveExams: (tab: string) => `/app/live-exams/${tab}`,
  liveExamDetail: (liveExamId: string) => `/app/live-exams/exam/${liveExamId}`,
  liveExamSession: (liveExamId: string) => `/app/live-exams/exam/${liveExamId}/session`,
  liveExamResult: (liveExamId: string) => `/app/live-exams/exam/${liveExamId}/result`,
  currentAffairs: (period: string) => `/app/current-affairs/${period}`,
  /** Article detail (docs/InformationArchitecture.md §9's illustrative map
   * has no dedicated detail path — `article/:id` added here, same "hand-
   * authored slug/id, not in the illustrative map" precedent Learn's routes
   * already set). */
  currentAffairsArticle: (id: string) => `/app/current-affairs/article/${id}`,
  /** A single "professional dashboard" page (docs/InformationArchitecture.md
   * §9's illustrative map suggested per-view `/app/analytics/:view` routes —
   * built 2026-07-31 as one page presenting all charts together instead,
   * the same "simplify the illustrative map once the real thing is built"
   * precedent Learn's slug-based routes already set). */
  analytics: '/app/analytics',
  /** The Notification Center (docs/InformationArchitecture.md §7.7 — "also
   * surfaced via the top-bar bell") — built 2026-07-31 as its own page.
   * Distinct from `settings('notifications')` below, which is the Settings
   * module's *preferences* tab (channel/type opt-in), not this list. */
  notifications: '/app/notifications',
  /** Global Search's full results page (Sprint 4 Step 63) — reached from
   * the Cmd/Ctrl+K overlay's "See all results" row, or a direct `?q=`
   * link. The overlay itself (`features/search/components/global-search.tsx`)
   * is mounted once in `routes/protected-route.tsx`, not a route of its own. */
  search: '/app/search',
  /** Sprint 4 Step 64 — Nalanda AI Tutor. `?contextType=&contextRefId=`
   * optionally pre-grounds a new conversation (e.g. Practice's "Ask
   * Follow-up" handoff, `features/practice/components/ai-explanation-panel.tsx`) —
   * same query-param-handoff precedent as `practice(':mode')`'s
   * `?subtopicId=`. */
  aiTutor: '/app/ai-tutor',
  subscription: '/app/payments/subscription',
  /** Settings (docs/InformationArchitecture.md §7.5 — Profile is the
   * default tab). `section` is a plain string (not the
   * `constants/settings.ts` `SettingsSection` union) so this can double as
   * the route-table path builder called with a literal `:section`
   * placeholder, the same `practice`/`currentAffairs` precedent above —
   * `pages/settings/settings-page.tsx` validates the real param at
   * render time instead. */
  settings: (section: string) => `/app/settings/${section}`,
  community: (threadId: string) => `/app/community/${threadId}`,
} as const
