import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

/**
 * Replaces Recharts' default browser-native-looking tooltip box with one
 * matching the app's Card chrome (docs/UI_Design_System.md §17 — "custom-
 * styled to match card chrome, never the default tooltip box"). Pass as the
 * `content` prop to any Recharts `<Tooltip>`.
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-popover text-popover-foreground border-border rounded-lg border px-3 py-2 text-sm shadow-md">
      {label !== undefined && (
        <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, index) => (
          <div
            key={`${String(entry.dataKey)}-${index}`}
            className="flex items-center gap-2"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
