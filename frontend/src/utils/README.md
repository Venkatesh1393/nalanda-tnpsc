# utils/

Generic, pure, stateless helper functions — no React, no app-specific
domain knowledge, no side effects beyond what's explicitly named (e.g.
`debounce`'s timer). Anything here should be portable enough to copy into
an unrelated project unchanged.

Distinct from `lib/`, which holds _singleton app infrastructure_ (the one
`cn()` helper shadcn expects at a fixed path, the one validated `env` object,
the one shared `QueryClient` instance) — `utils/` holds _the many_, reusable
pure functions any part of the app might need (date/number formatting,
debouncing, string helpers).

- `format-date.ts` — locale/bilingual-aware date formatting (Tamil/English,
  per `docs/UI_Design_System.md`'s bilingual-dignity principle).
- `debounce.ts` — generic debounce, e.g. for the Search overlay's
  input-as-you-type behavior (`docs/Navigation.md` §7).
