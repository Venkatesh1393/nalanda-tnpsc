# repositories/

The _only_ layer permitted to query MongoDB (per `docs/FolderStructure.md`
§2/§6) — one file per model, exporting plain functions/classes that
`services/` calls instead of touching Mongoose directly. This boundary is
what makes `services/` unit-testable against a mocked repository, no real
database required.

Not yet built as of this scaffold (Sprint 3 foundation step) — lands
alongside the first real domain models.
