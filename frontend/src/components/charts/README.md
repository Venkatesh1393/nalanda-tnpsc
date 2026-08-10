# components/charts/

Recharts-based data visualization components, styled per
`docs/UI_Design_System.md` §17/§39 — the curated `--chart-1..5` palette
(never the semantic primary/destructive/success colors), minimal single-
pixel gridlines, and a custom card-styled tooltip instead of Recharts'
default browser-native-looking one.

- `score-ring.tsx` — the signature circular percentile/score ring (plain SVG,
  not Recharts — this exact shape doesn't need a full charting library).
- `chart-tooltip.tsx` — the shared custom tooltip, passed as `content` to any
  Recharts `<Tooltip>`.
- `trend-line-chart.tsx` — a generic score-over-time area/line chart with
  smooth interpolation and a fading gradient fill.

Every component here is purely presentational and generic (accepts
`{ label, value }[]`-shaped data) — it has no knowledge of _what_ the data
represents. A feature (e.g. `features/analytics/`) supplies real data by
calling a `services/` function and passing the result in.
