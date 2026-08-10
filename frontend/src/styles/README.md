# styles/

Derived style configuration for JS/TS contexts that read the design tokens
defined in `src/index.css` but can't consume a Tailwind class directly (chart
libraries, animation offsets) — never a second place to define new tokens.

- `chart-colors.ts` — the curated `--chart-1..5` palette as CSS variable
  reference strings, used directly in Recharts `fill`/`stroke` props
  (docs/UI_Design_System.md §17).
- `spacing.ts` — the same 4px-based spacing scale Tailwind's utilities
  already use, exported as plain numbers for the rare non-Tailwind context
  (a chart's numeric `margin` prop, a Framer Motion pixel offset) that needs
  one. Not a bespoke scale — `docs/UI_Design_System.md` doesn't define its
  own spacing system, so this intentionally mirrors Tailwind's default.
