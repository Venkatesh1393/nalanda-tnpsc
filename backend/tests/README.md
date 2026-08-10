# backend/tests/

```
tests/
├── unit/          Pure logic — services, utils — no DB or network involved
├── integration/   Repository + database interaction tests (against a test DB instance)
└── contract/      Verifies API responses match the documented envelope/schema
```

Per `docs/FolderStructure.md` §12. No test runner is installed yet — this
scaffold (Sprint 3 foundation step) only stands up the folder convention; a
future step should pick one (Vitest and Jest are both realistic fits for
this TypeScript/Express stack) and confirm with the user before adding it,
matching the precedent set by `docs/MASTER_ROADMAP.md` Phase 13 for
`frontend/`.
