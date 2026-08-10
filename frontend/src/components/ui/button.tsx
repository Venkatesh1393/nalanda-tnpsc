import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/spinner"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Reserved exclusively for AI-triggering actions (docs/UI_Design_System.md
        // §13, §35) — the AI Teal gradient is never used for any other button
        // meaning, so this variant must not be applied to non-AI actions.
        ai: "bg-gradient-to-r from-ai-teal to-primary text-primary-foreground shadow-xs hover:opacity-90",
        // Reserved exclusively for premium/upgrade CTAs (docs/UI_Design_System.md
        // §7, §36) — a tinted fill rather than a solid gradient, since gold is
        // "used sparingly, never as a background field"; never applied outside
        // a premium/achievement context.
        premium:
          "bg-premium-gold/15 text-premium-gold hover:bg-premium-gold/25 dark:bg-premium-gold/20 dark:hover:bg-premium-gold/30",
      },
      // Every size below also sets a `pointer-coarse:` companion — 44px is
      // the design system's own mobile touch-target floor (docs/UI_Design_System.md
      // §31), applied only under `@media (pointer: coarse)` (i.e. an actual
      // finger, on any screen size — phone, tablet, or a touch laptop) so
      // the compact Stripe/Linear-restraint sizing below is untouched for
      // mouse/trackpad input, where it's already a fully adequate target.
      size: {
        default:
          "h-8 gap-1.5 px-2.5 pointer-coarse:h-11 pointer-coarse:px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs pointer-coarse:h-11 pointer-coarse:px-3 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] pointer-coarse:h-11 pointer-coarse:px-3 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 pointer-coarse:h-11 pointer-coarse:px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 pointer-coarse:size-11",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] pointer-coarse:size-11 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] pointer-coarse:size-11 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * Swaps the label for an inline spinner while keeping the button's
     * committed width (docs/UI_Design_System.md §13 — "button remains its
     * committed width to prevent layout shift"). The label stays in the DOM
     * (just made invisible) rather than being measured/replaced, which is
     * what guarantees the width never shifts.
     */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="relative inline-flex items-center justify-center gap-1.5">
          <span className="invisible inline-flex items-center gap-1.5">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" />
          </span>
        </span>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
