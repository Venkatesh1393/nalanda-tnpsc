# services/

Domain-oriented data-fetching functions — one file per backend module,
mirroring `backend/src/services/` one-to-one (per `docs/FolderStructure.md`
§5), e.g. `dashboardService.ts`, `learnService.ts`, `practiceService.ts`.

**Split of responsibility with `api/`:** `api/` owns the _transport_ (the
configured Axios instance, endpoint path constants) — it knows nothing about
what a "question" or "subscription" is. `services/` owns the _domain_ calls
built on top of that transport (e.g. `getQuestions(filters)` calls
`apiClient.get(endpoints.questions.list, { params: filters })` and returns
typed data).

**No backend exists yet (Sprint 3)**, so every file at this level is a
stable **facade** — the one import path every component/feature uses, never
`services/mock/*` directly — that currently delegates straight through to a
same-named function in `services/mock/` (docs/PROJECT_CONTEXT.md §14). When
the real backend lands, swap a facade function's body for the real
`apiClient` call it's commented to become; no consuming component needs to
change either way. A few files (`learnService.ts`, `practiceService.ts`)
also hold real composition logic beyond a plain pass-through (Lesson
Details/Video/Notes/Search, session-question-selection) — that logic isn't
part of any single backend module's raw API surface, so it lives here
rather than in `services/mock/`.

See `services/mock/README.md` for the mock implementations themselves.
