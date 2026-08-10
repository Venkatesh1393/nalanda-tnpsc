# providers/

Provider _components_ — the stateful implementation behind a context from
`context/`. A provider owns the actual logic (state, effects, persistence)
that gives a context object real behavior.

- `theme-provider.tsx` — implements dark/light/system theme switching
  (persists to localStorage, tracks OS preference live) on top of
  `context/theme-context.ts`.
- `app-providers.tsx` — composes every app-wide provider (Theme, React
  Query, React Router) into one wrapper so `main.tsx` stays a plain render
  call. Add a future provider (e.g. an AuthProvider) here, not as another
  manually-nested layer in `main.tsx`.

Consumers should almost never import from `providers/` directly — they
import the matching hook from `hooks/` instead (e.g. `useTheme()`), which is
what actually enforces "must be used within a Provider."
