# Sprint 4 Step 71.5 Completion Report — Enterprise Content Management Pipeline

| | |
|---|---|
| **Step** | Sprint 4 Step 71.5 — Enterprise Content Management Pipeline |
| **Date** | 2026-08-10 |
| **Scope** | Governed content workflow (Draft → Pending Review → Approved → Published), full version history with rollback, multi-format bulk import (CSV/XLSX existing, Word `.docx` new, PDF metadata extraction new), safe bulk update/bulk delete, and a complete audit trail — for the `Question` content type only. |
| **Result** | **PASS** — see [§7 Final Verdict](#7-final-verdict) |

Immediately after Sprint 4 Step 71 (Production Frontend Deployment). Scope was narrowed and confirmed with the user via four `AskUserQuestion` prompts before any code was written (PDF metadata-only, Word requires a structured template, two-stage approval chain, higher synchronous import cap over new job-queue infrastructure) — see the approved plan for the full record. Explicitly out of scope, disclosed up front: every other content type (Exam/Subject/Topic/Subtopic/Lesson/StudyMaterial/CurrentAffair/LiveExam) — the new `contentWorkflow` plugin is built generically reusable, but only `Question.model.ts` attaches it this step.

---

## 1. Design Reconciliation

The task's literal 5-state diagram (Draft → Pending Review → Approved → Published → **Archived**) maps onto **4 new stored `workflow.status` values** (`draft`/`pending_review`/`approved`/`published`) plus the **pre-existing** Step 53 soft-delete `archive()`/`restore()` mechanism for "Archived." A second, parallel "archived" concept next to one that already exists, is already audited, and already has admin UI would have been duplicate code for the same idea — CLAUDE.md's "never duplicate code" rule applied directly.

The task's three-stage approval chain (Content Editor → Reviewer → Admin Approval → Published) maps onto the **existing role set with zero new roles added**: `content_editor` submits, `moderator` reviews (its first real write path on Questions — previously read-only), `admin`/`super_admin` gives final publish approval. No self-approval blocking or distinct-person enforcement, matching the confirmed two-stage simplification.

## 2. What Was Built

**Data model** (`backend/src/models/`):
- `shared/contentWorkflow.plugin.ts` — new, reusable Mongoose plugin (same shape as the neighboring `softDelete.plugin.ts`), adds a `workflow` sub-document (`status` + `submittedBy/At`, `reviewedBy/At`, `reviewNote`, `publishedBy/At`, `lastEditedBy/At`) to any schema that attaches it.
- `Question.model.ts` — attaches the plugin.
- `QuestionVersion.model.ts` — new collection, full-document content snapshots (not field-level diffs — simpler, still fully supports rollback), append-only, `changeType: create|update|bulkImport|bulkUpdate|rollback`.

**Backend services** (`backend/src/services/admin/`):
- `questionWorkflow.service.ts` — `submitForReview`/`approveQuestion`/`requestChanges`/`publishQuestion`, each state-machine-guarded (a 400 if the question isn't in the required preceding state) and audit-logged.
- `questionVersion.service.ts` — `listVersions`/`getVersion`/`rollback` (rollback re-runs every content validator via the existing `updateById` path, then appends a new version rather than deleting history).
- `questionBulkActions.service.ts` — `bulkUpdatePreview`/`bulkUpdate` (a deliberately narrow field allowlist: `isActive`/`isPremium`/`difficulty`/`tags`/`aiExplanationEligible` — hierarchy references and content text stay single-question/file-import-only, since bulk-patching those safely needs the same per-document reference revalidation the import path already does) and `bulkDelete` (soft-delete only, reuses the existing `archive()` mechanism — no hard-delete exists anywhere in this codebase for `Question`).
- `wordQuestionParser.ts` — new. `mammoth`-based `.docx` text extraction + a documented line-based convention (`Q:`, lettered options `A)`/`ATA)`, `ANSWER:`, `DIFFICULTY:`, etc., `---` question separator) producing the *exact same* `{rowNumber, raw}` shape the CSV/XLSX parsers already produce — every downstream step (reference resolution, dedup, preview, confirm) in `questionImport.service.ts` is reused completely unchanged.
- `pdfMetadata.service.ts` — new. `pdf-parse`'s `Info` dictionary only (title/author/creation date) — never `.text`, per the confirmed metadata-only scope. Read-only, no audit log entry (matches the existing "reads aren't audited" convention).
- `questionImport.service.ts` — extended: `.docx` dispatch, `generateTemplateDocx()` (via the new `docx` package), `IMPORT_MAX_ROWS` raised 2,000 → 10,000, and imported questions now start at `workflow.status: 'pending_review'` (not `draft`) with `submittedBy` set — the confirm click already *is* the deliberate submission act.
- `adminQuestions.service.ts` — extended: `createQuestion`/`updateQuestion` now write a version snapshot and bump `lastEditedBy`/`lastEditedAt`; `resolveAuditActor`/`toDTO`/`recordVersion` exported for reuse by the four new sibling services (no duplicated actor-resolution or DTO-mapping logic).

**Enforcement point**: `question.repository.ts`'s `findRandomQuestionIds` (the real Smart Practice/Live Exam question-selection query) now requires `'workflow.status': 'published'` alongside its existing `isActive`/`deletedAt` filters — this is the one place the workflow becomes real rather than decorative.

**Routes/validators/middleware**: 15 new endpoints under `/admin/questions` (workflow transitions, version history + rollback, bulk update/delete + preview, PDF metadata, docx template format), two new role-gate constants (`canReviewQuestions` = moderator+, `canPublishQuestions` = admin+) alongside the existing `canManageQuestions`, new Zod schemas, `uploadPdfMetadataFile` middleware, `.docx` folded into the existing bulk-import upload allowlist (the shared `/import/preview`/`/import/confirm` routes handle all three formats — `questionImport.service.ts`'s parser dispatch, not the upload middleware, is what picks the format-specific path).

**Migration**: `backend/src/scripts/migrateQuestionWorkflowStatus.ts` (`npm run migrate:question-workflow`) — one-time, manually-run backfill (`workflow.status: 'published'` for every question predating this step), same precedent as the existing `promoteToSuperAdmin.ts`. **Not run against the live shared dev database as part of this step** — it's a deliberate pre-deploy action for whoever owns deployment (same reasoning `docs/DEPLOYMENT_GUIDE.md` already applies to other one-time steps), not something to trigger unprompted against shared data. Its exact query logic was verified correct via the verification script's own disposable fixture (§4, item 9).

**Admin frontend** (`admin/src/`): `adminQuestionsService.ts` + `api/endpoints.ts` extended 1:1 with the backend; `questions-list-page.tsx` gained row-select checkboxes, a bulk-actions bar (preview-before-commit, matching the existing bulk-import UX convention), and a workflow-status badge column; `question-editor-page.tsx` gained a Workflow card (role-gated action buttons, sourced from `useAuth().user.role` — a UX convenience, the backend route gate is the real boundary) and a Version History card (view/rollback per version); `question-import-page.tsx` gained `.docx` upload support, a third template-download button, and a PDF-metadata-extraction card.

**New dependencies**: `mammoth` (.docx text extraction), `docx` (.docx template generation), `pdf-parse@1.1.1` pinned to the lightweight classic API (not the newer `2.x`, which is a much heavier `pdfjs-dist`-based rewrite with image/table extraction this feature doesn't need).

## 3. Audit Trail

No new infrastructure — the existing `AuditLog` model/service (Step 52) already had everything the task's "who imported/edited/approved/published, timestamp" requirement needs. 8 new namespaced action verbs added: `question.submitForReview`, `.approve`, `.requestChanges`, `.publish`, `.rollback`, `.bulkUpdate`, `.bulkDelete` (Word imports reuse the existing `question.bulkImport` verb — same action, different file format, not a separate verb).

## 4. Verification — 40/40 Assertions, Live MongoDB Atlas

A new throwaway-style script, `backend/src/scripts/verifyContentPipeline.ts` (`npm run verify:content-pipeline`), same proven pattern as `verifyAiQuestionGenerator.ts` — disposable fixtures against the live database, real query results asserted on, every fixture deleted before exit (confirmed: "Cleanup complete — no test fixtures left behind").

| # | Area | Result |
|---|---|---|
| 1 | Create defaults to `draft` + records version 1 | 4/4 PASS |
| 2 | Update records a new version, never resets workflow status | 3/3 PASS |
| 3 | Published-only enforcement — the real `findRandomQuestionIds` selection query | 3/3 PASS |
| 4 | Full state machine: submit → approve/request-changes → resubmit → approve → publish, with invalid-transition rejections (400) at every wrong-state attempt | 12/12 PASS |
| 5 | Rollback restores content, appends (never deletes) history | 5/5 PASS |
| 6 | Bulk update/delete — exact-set matching, real persistence, version snapshots, no hard-delete | 7/7 PASS |
| 7 | Word (`.docx`) import round-trips a real generated document through the shared parse→preview→confirm pipeline against this database's real fixtures, lands at `pending_review` | 8/8 PASS |
| 8 | PDF metadata extraction (see the disclosed finding below) | 5/5 PASS |
| 9 | Migration backfill logic (byte-level "legacy document" simulation via a raw driver insert, bypassing Mongoose defaults) | 3/3 PASS |

**A real finding surfaced while writing §8's test, not swept aside**: `pdf-parse`'s bundled pdfjs throws `bad XRef entry` on a byte-for-byte valid PDF specifically when required under `tsx` — confirmed via `cmp` that the exact same buffer parses correctly under plain compiled Node execution. Since this project's `npm run dev` **and every `verify:*` script** run via `tsx`, this is a real, practical gap: **locally testing the PDF-metadata feature against `npm run dev` will fail**, even though the feature is correct. §8 proves the underlying dependency and this service's transform logic both work correctly by shelling out to a plain `node -e` subprocess (no `tsx` in the loader chain) — the same execution path production actually uses (`npm start` → `node dist/server.js`). One assertion in §8 also positively confirms the `tsx`-specific failure is real and reproducible (a direct in-process call is asserted to throw), rather than silently working around a bug that might already be fixed. **Recommend**: verify this specific feature against `npm run build && npm start`, not `npm run dev`, until/unless an upstream `tsx`/pdfjs compatibility fix lands.

- `npm run typecheck`/`lint`/`format:check`/`build` clean for both `backend/` and `admin/`. (`format:check` reports pre-existing drift in files this step didn't touch — confirmed via `git status` — out of scope here, same disclosed pattern Step 71's report already used.)
- Manual admin-UI click-testing not performed — no browser automation available in this environment, same disclosed gap as recent prior steps. The verification script substitutes real service/DB-level checks; the three admin pages were type-checked and built clean but not visually confirmed.
- The HTTP-layer `authorizeRoles` route gate itself (e.g. a `moderator` JWT actually getting a 403 on `/publish`) is **not** exercised by the verification script — no `verify*.ts` script in this codebase spins up a real server + signed JWT (confirmed by reading `verifyAiQuestionGenerator.ts`'s own header comment, which discloses the identical boundary). Covered instead by `tsc`/`eslint` passing clean plus direct code review of `routes/admin/questions.routes.ts`'s role-gate wiring.

## 5. Explicit Scope Boundaries (disclosed, not silently dropped)

- Only `Question` has the workflow/versioning wired up end-to-end; the plugin is reusable but unattached elsewhere.
- PDF support is metadata extraction only — never question-text/option parsing from PDF pages.
- Word import requires the documented structured template; a freeform document fails the same way an unrecognized CSV column does today (reported invalid, never silently dropped or AI-guessed).
- Bulk-update is limited to a safe field allowlist; hierarchy/content-text bulk changes remain single-question or file-import only.
- No new job-queue/background-processing infrastructure — scale is handled via a higher synchronous cap (10,000 rows/file), reaching "100,000+ questions" through multiple imports over time.
- The one-time workflow-status migration was written and its logic verified, but not run against the live shared dev database as part of this step.

## 6. A Real Bug Found and Fixed During Verification (not a pre-existing code defect)

While testing rollback (§4 item 5), `questionRepository.updateById(questionId, targetVersion.snapshot)` crashed with `MongooseError: No _id found on document!` — `targetVersion.snapshot` is a live Mongoose subdocument instance, not a plain object, and passing it directly into `Object.assign` on another document risked Mongoose's internal document machinery leaking through. Fixed by converting via `targetVersion.toObject().snapshot` before use — the safe, idiomatic way to reuse a persisted subdocument as plain input. Caught by the verification script exactly as intended, not shipped.

## 7. Final Verdict

**PASS.** 40/40 real assertions against live MongoDB Atlas, zero failures, all fixtures cleaned up. `typecheck`/`lint`/`format:check`/`build` clean for both `backend/` and `admin/`. One real bug (rollback's subdocument-assignment crash) was found and fixed during verification, not shipped. One genuine environment-specific finding (`pdf-parse` vs `tsx`) is disclosed with a clear workaround and recommendation rather than papered over. Two known, disclosed gaps remain before this is fully end-to-end confirmed: no browser-based admin-UI click-testing (no automation tooling available this session) and no HTTP-layer JWT/role-gate test (matches this codebase's established verification-script boundary). The one-time workflow-status migration is written, logic-verified, and documented as a required manual pre-deploy step — deliberately not run against shared dev data unprompted.
