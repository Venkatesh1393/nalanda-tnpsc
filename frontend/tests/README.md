# tests/

Unit and component tests, mirroring the `src/` structure (per
`docs/FolderStructure.md` §12) — e.g. `tests/hooks/use-theme.test.ts` mirrors
`src/hooks/use-theme.ts`.

No test runner is installed yet — it wasn't part of this foundation's
requested scope. Add one (e.g. Vitest, which integrates natively with Vite)
when the first real components/hooks land and need coverage.
