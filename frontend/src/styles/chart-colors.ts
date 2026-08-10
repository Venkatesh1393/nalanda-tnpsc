/**
 * The curated chart palette (docs/UI_Design_System.md §17) as CSS variable
 * references — passed directly to Recharts' `fill`/`stroke` props. Modern
 * browsers resolve `var(--chart-1)` inside SVG attributes natively, so these
 * stay theme-reactive (light/dark) automatically with no JS re-computation
 * or re-render needed on theme change.
 *
 * Deliberately distinct from `--primary`/`--destructive`/`--success` — a
 * chart data series must never be visually confused with a semantic status
 * color (docs/UI_Design_System.md §17).
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

/** Cycles through CHART_COLORS for a series index beyond the 5 defined. */
export function getChartColor(seriesIndex: number): string {
  return CHART_COLORS[seriesIndex % CHART_COLORS.length]
}
