# Sprint 4 Step 53 Completion Report — Admin Question Management + Bulk Import

| | |
|---|---|
| **Step** | Sprint 4 Step 53 — Admin Question Management + Bulk Import |
| **Date** | 2026-08-04 |
| **Scope** | Question CRUD (create/edit/preview/activate/deactivate/archive/search/filter/paginate), production-quality CSV/XLSX Bulk Import (template, upload→parse→validate→preview→confirm, duplicate detection, error report, security hardening), tests, docs |
| **Result** | **PASS** — see [Final Verdict](#final-verdict) |

This is the bulk-question-upload gap Step 52 explicitly deferred ("bulk question upload... explicitly excluded from this step, per instruction," `docs/SPRINT_4_STEP_52_COMPLETION_REPORT.md` §1/§4). Explicitly out of scope for this step, per instruction: Payments, AI, and any redesign of the student-facing Smart Practice UI (only its question-eligibility data source was extended — no behavior change).

---

## 1. Method

1. Read `CLAUDE.md`, prior memory (`project_admin_portal`, `project_backend_foundation`, `project_mock_service_architecture`), and the real Step 52 admin foundation before writing anything.
2. Delegated a research pass over the existing `Question` model, admin RBAC pattern, upload middleware, and Smart Practice's question-selection query to understand exactly what to extend vs. build new — confirmed the model already supports everything Step 53 needed (`isActive`, soft-delete, bilingual fields) except CRUD/list/import code, which didn't exist at all yet (only 5 read-only repository functions existed, for Practice's random-sample query).
3. Asked the user two scoping questions before building: partial vs. all-or-nothing import (chose **partial**), and synchronous vs. async-job import flow (chose **synchronous/stateless**, matching this project's existing no-job-queue precedent).
4. Built the backend module (validators → repository → services → controllers → routes, the established layering), then the `admin/` frontend (service layer → 2 new UI primitives → 3 pages → routing).
5. Ran `typecheck`/`lint`/`format`/`build` for both `backend` and `admin` after every major addition, not just at the end.
6. Wrote and ran a throwaway `tsx` script against live MongoDB Atlas (Firebase-bypass pattern, proven 8+ times in this project already) exercising the full CRUD lifecycle, a CSV import covering every row outcome, an XLSX import, and a real `practice.service.createSession()` call proving Smart Practice pickup — then deleted it and every document it created.
7. Updated `docs/API.md`, `docs/MASTER_ROADMAP.md`, `docs/PROJECT_CONTEXT.md`, and wrote this report.

---

## 2. Design Decisions

**No new Question status field.** The task asked for activate/deactivate/archive. `Question.model.ts` already had exactly what's needed: `isActive` (boolean) for activate/deactivate, and the existing `softDeletePlugin`'s `deletedAt` (used by every other content model already) for archive/restore. A list `status` filter (`active`/`inactive`/`archived`) is derived from these two fields at query time — no schema migration.

**Bulk Import is stateless, no job queue.** Confirmed with the user before building: `POST /import/preview` parses+validates and returns a row-by-row preview, writing nothing to MongoDB. `POST /import/confirm` **re-uploads and re-parses the identical file** rather than trusting a client-held "resolved" JSON payload — only a plain array of admin-approved row numbers round-trips between the two calls. This means a tampered client request can never inject unvalidated content, and matches this project's repeated "no background-job scheduler exists yet" precedent (Analytics/Leaderboard compute live instead of materializing).

**Reference validation is one shared function.** `adminQuestions.service.ts`'s `validateQuestionReferences()` is used by *both* the direct create/update endpoints and the Bulk Import row parser — every exam id must resolve to a real `Exam`; subject/topic/subtopic must resolve to real, active content nodes; and the topic/subtopic must actually belong to the given subject/topic. A question with an inconsistent hierarchy would silently never surface in any of Learn's or Practice's subject/topic-scoped queries, so this check exists once and is reused, not duplicated.

**Zod mirrors Mongoose, deliberately.** `Question.model.ts`'s own custom validator ("2-6 options; `mcq_single` needs exactly one correct option, other types at least one; `pyqYear` required when `isPreviousYear`") is re-expressed in `validators/question.validator.ts`'s `superRefine` so the admin gets a specific, actionable 400 — the global error handler only surfaces field *names* for a raw Mongoose `ValidationError`, not messages. Mongoose still re-checks the same rule as a genuine second line of defense.

---

## 3. Bulk Import Pipeline

**Upload → Parse → Validate → Preview → Confirm**, exactly as specified:

- **File validation**: MIME + extension allowlist (`.csv`, `.xlsx` only — same `multer` memory-storage pattern `upload.middleware.ts` already established for images/PDFs), 8MB size cap, 2000-row cap enforced after parsing.
- **Column validation**: headers matched case/spacing-insensitively against one shared column-definition constant (`constants/questionImport.ts`) that both the parser and the downloadable template read — they can never drift apart on a column name.
- **Row validation**: every field (options 2-6, `correctOption` 1-6 referencing a filled option, `difficulty`/`source`/`tnpscExamType` enums with case-insensitive auto-correction + a warning, `isPreviousYear`/`pyqYear` cross-field rule, boolean fields, image URL format) is checked with a specific per-field message; enum mismatches get a **deterministic suggested correction** where one exists (closest case-insensitive or prefix match).
- **Reference validation**: `examCodes`/`subjectSlug`/`topicSlug`/`subtopicSlug` resolved to real documents (cached per unique value within a file, so a 500-row file with 3 distinct subtopics does 3 lookups, not 500), with the same hierarchy-consistency check CRUD uses.
- **Duplicate detection**: two passes over provisionally-valid rows — within the file itself (same subtopic + normalized question text, second+ occurrence flagged), then against MongoDB (existing questions in the same subtopic, fetched once per subtopic and cached). A duplicate is always excluded from what gets imported, even if the admin leaves it checked in the client — the server only inserts rows still `valid` after confirm's fresh re-parse.
- **Preview**: valid/invalid/duplicate counts + a full per-row breakdown (raw cell values, resolved preview, errors, warnings, duplicate-of pointer) — no MongoDB writes.
- **Error report**: every error carries `{field, message, suggestion?}`; the admin frontend can download this as a CSV. Messages are hand-written and specific (e.g. `"medium-ish" is not a recognized difficulty`) — nothing from the parser or Mongoose ever reaches the client verbatim, per "do not expose backend internals."
- **Partial import**: `insertMany({ordered: false})` — one row's unexpected failure never blocks the rest.

**Security hardening**, per the task's explicit list:
- *Formula injection*: XLSX cells are read via `.text`/formula `.result` only — a raw `=SUM(...)`-style formula string is never carried into stored content. The admin frontend's client-generated error-report CSV export separately prefixes any cell starting with `=+-@` with a single quote before download, closing the same vector on the way back out.
- *Malicious spreadsheets*: `.xlsm` (macro-enabled) is rejected by the extension allowlist; `exceljs` never executes anything, it only reads cell values.
- *Oversized uploads*: 8MB file cap (multer) + 2000-row cap (post-parse).
- *Unexpected MIME types*: same allowlist pattern as every other upload route in this codebase.
- *Invalid ObjectIds*: every id used to build a Question document is either freshly resolved server-side from a slug/code (import path) or re-validated with `isValidObjectId` (Zod, direct CRUD path) — a raw client-supplied ObjectId is never trusted blindly.

---

## 4. Verification — 27/27 Assertions, Live MongoDB Atlas

A throwaway `tsx` script (`backend/src/seed/verifyStep53.ts`, written, run, then deleted) used the same Firebase-bypass pattern this project has proven 8+ times: a temporary `User` created via `userSync.service.findOrCreateUserFromFirebase` (promoted to `content_editor`), then every service function called **directly** (not over HTTP — controllers are thin pass-throughs, same simplification prior steps used).

| # | Assertion | Result |
|---|---|---|
| 1 | Seeded reference content (exam/subject/topic/subtopic) resolved | PASS |
| 2 | `createQuestion` returns `status: active` | PASS |
| 3 | `createQuestion` persisted to MongoDB | PASS |
| 4 | `updateQuestion` changed a field | PASS |
| 5 | `updateQuestionStatus(false)` deactivates | PASS |
| 6 | `updateQuestionStatus(true)` reactivates | PASS |
| 7 | `archiveQuestion` sets `status: archived` | PASS |
| 8 | `archiveQuestion` sets `deletedAt` in MongoDB | PASS |
| 9 | An archived question is still fetchable via admin detail read | PASS |
| 10 | `restoreQuestion` clears the archive | PASS |
| 11 | `createQuestion` rejects an inconsistent subject/topic/subtopic hierarchy | PASS |
| 12 | CSV: a valid row parses as `valid` | PASS |
| 13 | CSV: an exact duplicate row is flagged `duplicate` (`type: file`) | PASS |
| 14 | CSV: a row with bad difficulty/out-of-range `correctOption`/missing subject is flagged `invalid` with errors | PASS |
| 15 | CSV: a PYQ row with case-insensitive `"Medium"` difficulty parses as `valid` (auto-corrected) | PASS |
| 16 | CSV: a row matching an already-seeded question's text is flagged `duplicate` (`type: database`) | PASS |
| 17 | `confirmImport` inserted only the 2 genuinely valid rows | PASS |
| 18 | `confirmImport` skipped the 3 invalid/duplicate rows | PASS |
| 19 | Imported row 1 exists in MongoDB with correct options/correctness | PASS |
| 20 | Imported PYQ row correctly parsed `isPreviousYear`/`pyqYear`/case-fixed `difficulty` | PASS |
| 21 | XLSX row parses as `valid` | PASS |
| 22 | XLSX `confirmImport` inserted 1 row | PASS |
| 23 | XLSX-imported question exists in MongoDB | PASS |
| 24 | Newly imported CSV question is in Smart Practice's eligible pool (`findRandomQuestionIds`) | PASS |
| 25 | Newly imported XLSX question is in Smart Practice's eligible pool | PASS |
| 26 | A real `practiceService.createSession()` call selects the newly imported questions | PASS |
| 27 | Deactivating a question removes it from the eligible pool again | PASS |

**27/27 passed.** All test questions (CRUD-created + imported), the audit log entries, the temporary user/profile/session, and the one real `PracticeSession` document created during the Smart Practice check were deleted in the script's `finally` block before it exited. No shared/seeded content was touched.

---

## 5. Per-Area Summary

| Area | Status | Notes |
|---|---|---|
| Create/Edit/Preview question | ✅ Real | One page toggles Edit ⇄ live client-side Preview |
| Activate/Deactivate | ✅ Real | `isActive` toggle; verified it gates Smart Practice eligibility |
| Archive | ✅ Real | Reuses the existing soft-delete plugin, no new field |
| Search/Filter/Paginate | ✅ Real | Exam/Subject/Topic/Subtopic/Difficulty/Language/PreviousYear/Status, cascading dropdowns |
| Question editor fields | ✅ Real | EN/TA text, 2-6 options, correct answer, explanation, difficulty, exam/subject/topic/subtopic, tags, source, PYQ flag+exam/year, image URL, premium/AI-eligibility |
| Server-side validation | ✅ Real | Zod mirrors `Question.model.ts`'s own Mongoose invariants |
| CSV + XLSX bulk import | ✅ Real | One shared parser, format-detected by extension |
| Template (downloadable) | ✅ Real | Generated on the fly from one shared column-definition constant; XLSX includes an Instructions sheet |
| File/column/row/reference/duplicate validation | ✅ Real | All five categories, see §3 |
| Preview before import | ✅ Real | Valid/invalid/duplicate/warnings all shown, nothing written yet |
| Error report | ✅ Real | Row/field/message/suggestion, downloadable as CSV client-side |
| Partial import | ✅ Real | `insertMany({ordered:false})`; invalid/duplicate rows never imported |
| Security (formula injection, malicious files, oversized uploads, MIME, ObjectIds) | ✅ Real | See §3 |
| RBAC | ✅ Real | View: any admin-staff role; mutate (CRUD + import): `content_editor`/`admin`/`super_admin` only, enforced server-side |
| Smart Practice integration | ✅ Verified | A bulk-imported `isActive: true` question is immediately selectable; no Smart Practice code was touched or redesigned |
| Payments / AI | Not built | Explicitly out of scope, per instruction |

---

## 6. Quality Gates

| Check | backend | admin |
|---|---|---|
| Typecheck | ✅ Clean | ✅ Clean |
| Lint | ✅ Clean | ✅ Clean |
| Format | ✅ Clean (re-formatted to project convention) | ✅ Clean — see note below |
| Build | ✅ Clean | ✅ Clean |
| Automated test suite | None installed (unchanged from every prior step) | None installed |
| Functional verification | Throwaway script, 27/27 passed against live Atlas, test data deleted after | Manual code-path verification only (no browser-automation tool in this environment) |

**A real, pre-existing gap found and fixed in passing**: `admin/` had no `.prettierrc.json` at all (unlike `backend/`, which has one), so `npm run format` had been silently defaulting to Prettier's double-quote style — and had apparently never actually been run since Step 52, since every existing file was hand-written in single-quote/no-semicolon style. Running `format` for this step would otherwise have produced a large, unrelated quote-style flip across ~40 pre-existing files. Fixed by adding the identical `.prettierrc.json` `backend/` already uses, then re-formatting — the app now matches its own established style, and this step's actual diff stays scoped to the files it touched.

`npm install exceljs csv-parse csv-stringify` in `backend/` surfaced the same class of pre-existing, accepted `uuid` "missing buffer bounds check" moderate advisory already documented for `firebase-admin`'s dependency chain (`exceljs` pulls in the same vulnerable `uuid` transitively) — not a new or different risk, not re-litigated per the existing accepted-risk note in project memory.

---

## Final Verdict

**PASS.**

- Question create/edit/preview/activate/deactivate/archive/search/filter/paginate are all real, backed by MongoDB, RBAC-gated server-side.
- Bulk Import supports both CSV and XLSX, with a downloadable template, full file/column/row/reference/duplicate validation, a preview step before any write, a structured error report, and genuine partial-import semantics — invalid or duplicate rows are never silently imported.
- Security requirements (formula injection, malicious spreadsheets, oversized uploads, unexpected MIME types, invalid ObjectIds) are addressed with specific, verifiable mechanisms, not just disclaimed.
- 27/27 real assertions passed against live MongoDB Atlas, including proof that a bulk-imported question is immediately selectable by the existing, untouched Smart Practice engine, and that deactivating it removes it again.
- Both `backend` and `admin` build/typecheck/lint clean.
- Payments and AI were correctly **not** touched, per instruction.
- Two scoping questions (partial vs. all-or-nothing import; sync vs. async job flow) were asked and resolved with the user before writing code, rather than assumed.
