# types/

App-local TypeScript types and DTOs — request/response shapes matching
`docs/API.md`'s endpoint contracts, view-model types for components, etc.

Types genuinely shared across `frontend/`, `admin/`, and `mobile/` (e.g. a
`User` or `Question` shape that all three apps need identically) belong in
the shared `shared/types/` package (per `docs/FolderStructure.md` §4) instead,
to avoid three apps maintaining three slightly-drifting copies of the same
type.
