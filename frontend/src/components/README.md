# components/

Domain-agnostic, cross-feature shared UI only. If a component needs to know
what an "exam," "subscription," "practice session," or any other Nalanda
business concept is, it does **not** belong here — it belongs in the
matching module under `features/`.

- `ui/` — shadcn/ui-**generated** design-system primitives only (Button,
  Card, Input, Label, Badge, Table…). See `ui/README.md`. Never hand-edit
  around this rule by adding a manually-written file into `ui/` — even a
  genuine design-system primitive belongs directly in `components/` instead
  if it isn't produced by `npx shadcn add`, so the "everything in `ui/` is
  generated, excluded from lint/prettier" invariant stays simple and true.
- `typography.tsx` — the `Heading`/`Text` components implementing the full
  type scale (`docs/UI_Design_System.md` §4). Hand-authored (not shadcn
  CLI-managed), which is exactly why it lives here and not in `ui/`, even
  though it's conceptually a design-system primitive.
- Everything else directly in this folder is a small, genuinely
  cross-feature composite that doesn't warrant its own `features/` module —
  e.g. `theme-toggle.tsx` (used anywhere a theme switch is needed, not tied
  to one product feature).

This folder deliberately has no `features/` subfolder of its own anymore —
that responsibility moved to the top-level `src/features/` (per this
project's feature-sliced structure), to avoid two same-named folders with
different meanings at different levels.
