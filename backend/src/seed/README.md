# seed/

Idempotent development-data seed (`npm run seed`, `src/seed/run.ts`) — 8
TNPSC exam categories + a small 2-subject/4-topic/8-subtopic representative
syllabus hierarchy + a handful of real questions, per Sprint 3 Step 42.

**Location note**: `docs/FolderStructure.md` §11 puts seed scripts in a
repo-root `database/seed/` folder. This step put them inside
`backend/src/seed/` instead — a deliberate, pragmatic deviation: the seed
script needs direct access to the compiled Mongoose models and
`config/env.ts`/`config/database.ts`, and running it via the backend's own
`tsx` toolchain (`tsx src/seed/run.ts`, same pattern as `tsx watch
src/server.ts`) is simpler than standing up a second, separate script
runner outside the `backend/` package. `database/` at the repo root remains
reserved for cross-cutting schema references/migrations if that's ever
needed independently of the backend app.

Re-running `npm run seed` is safe — every document is upserted on a
natural key (`Exam.code`, `Subject`/`Topic`/`Subtopic.slug`, or a
subtopic+title/text match for models without their own slug), never
duplicated.
