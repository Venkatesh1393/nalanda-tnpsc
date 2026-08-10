# models/

Mongoose schema definitions — one file per MongoDB collection, per
`docs/Database.md`'s collection catalog (Sprint 3 Step 42). 22 models:

- **Content taxonomy**: `Exam`, `Subject`, `Topic`, `Subtopic`, `Lesson`,
  `StudyMaterial`
- **Question system**: `Question`, `QuestionAttempt`, `PracticeSession`,
  `Bookmark`
- **Student system**: `User`, `Profile`, `StudyPlan`, `LearningProgress`
- **Engagement**: `CurrentAffair`, `Notification`, `Achievement`,
  `Leaderboard`
- **Commercial**: `Subscription`, `Payment`
- **Analytics/AI**: `StudentAnalytics`, `AIHistory`

`shared/` holds cross-model helpers (`bilingualField`/`bilingualParagraphsField`
for `{en, ta}` text, `softDeletePlugin` for content models). Import the
barrel (`models/index.ts`) or a specific model file directly — both work,
Mongoose registers a model once per name regardless of import path.

**Real deviations from `docs/Database.md` worth knowing before touching
these files** — see `docs/PROJECT_CONTEXT.md` §14's Step 42 entry for full
detail:

- `Exam` is a real collection, not a bare enum (this step's explicit ask).
- `Video` was merged into `Lesson` (the requested model list named `Lesson`
  - `StudyMaterial`, not `Video`).
- `LearningProgress` is new, not in `Database.md` at all — backs the
  already-built Learn module's progress tracking.
- No `MockTest`/`LiveExam`/`Badge` collections yet — out of this step's
  requested scope, not an oversight.
- `repositories/`/`services/`/`validators/`/`controllers/` for these models
  are still empty (see their own READMEs) — this step is models + seed
  data only, no auth, no API surface yet.
