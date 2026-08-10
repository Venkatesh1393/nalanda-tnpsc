# validators/

Zod schemas, one file per route/controller (mirrors `routes/` 1:1, per
`docs/FolderStructure.md` §6), consumed by `middleware/validate.middleware.ts`
via `validate({ body, query, params })` on each route definition. Keeps
request-shape validation centralized and out of controllers.

Not yet built as of this scaffold (Sprint 3 foundation step) — the first
schemas land with the Auth module (registration, OTP request/verify).
