# constants/

App-wide constant values — enums, fixed lookup tables, route paths — that
would otherwise end up as magic strings scattered and re-typed across many
files. If a value appears in more than one file and rarely changes, it
belongs here.

- `exam.ts` — the 8 TNPSC exam categories (docs/PRD.md, docs/Database.md
  §4.1's `examCategories` enum), bilingual labels included.
- `routes.ts` — path constants matching the illustrative route map in
  `docs/InformationArchitecture.md` §9, so a path is typed once here and
  referenced everywhere (React Router `<Link>`s, redirects, `api/endpoints.ts`
  deep-link fields) rather than re-typed as a raw string per call site.
