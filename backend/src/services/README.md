# services/

Server-side business logic — distinct from `frontend/src/services/`, which
is a client-side HTTP-call wrapper layer (see `docs/FolderStructure.md` §5
for why the same word means two different things on either side of the API
boundary). One subfolder per domain (`auth/`, `learning/`, `practice/`,
`analytics/`, `payments/`, `ai/`, `notifications/`, `admin/`, ...) as each is
built. Services depend on `repositories/` for data and a thin adapter under
`config/` (or a future `integrations/`-style folder) for third-party calls —
never the reverse, and never a direct Mongoose/SDK import here.

Not yet built as of this scaffold (Sprint 3 foundation step).
