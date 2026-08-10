# context/

Raw React Context objects and their value types only — `createContext(...)`
calls, nothing more. No provider logic (state, effects) lives here; that
belongs in `providers/`. No consuming hook logic lives here either; that
belongs in `hooks/`.

This three-way split (`context/` → `providers/` → `hooks/`) keeps each piece
independently small and testable: a context's shape can change without
touching provider logic, and a provider's internal implementation can change
without any consumer (which only ever imports the `hooks/` hook) noticing.

- `theme-context.ts` — the dark/light/system theme context (consumed via
  `hooks/use-theme.ts`, implemented by `providers/theme-provider.tsx`).
