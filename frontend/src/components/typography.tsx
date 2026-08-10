import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ElementType } from 'react'

import { cn } from '@/lib/utils'

/**
 * The type scale from docs/UI_Design_System.md §4 — every text size/weight/
 * line-height combination in the product should come from one of these two
 * components, not an ad hoc `text-[22px] font-[550]` inline.
 */

const headingVariants = cva('font-sans text-foreground', {
  variants: {
    variant: {
      display: 'text-display font-bold',
      'heading-1': 'text-heading-1 font-bold',
      'heading-2': 'text-heading-2 font-semibold',
      'heading-3': 'text-heading-3 font-semibold',
      'heading-4': 'text-heading-4 font-semibold',
    },
  },
  defaultVariants: {
    variant: 'heading-2',
  },
})

const defaultHeadingTag: Record<
  NonNullable<VariantProps<typeof headingVariants>['variant']>,
  ElementType
> = {
  display: 'h1',
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
}

type HeadingProps = ComponentProps<'h1'> &
  VariantProps<typeof headingVariants> & {
    /** Override the rendered element without changing the visual style. */
    as?: ElementType
  }

export function Heading({
  className,
  variant = 'heading-2',
  as,
  ...props
}: HeadingProps) {
  const Comp = as ?? defaultHeadingTag[variant ?? 'heading-2']
  return <Comp className={cn(headingVariants({ variant }), className)} {...props} />
}

const textVariants = cva('font-sans text-foreground', {
  variants: {
    variant: {
      'body-lg': 'text-body-lg font-normal',
      'body-md': 'text-body-md font-normal',
      'body-sm': 'text-body-sm font-normal text-muted-foreground',
      caption: 'text-caption font-medium text-muted-foreground',
      overline:
        'text-overline font-semibold tracking-[0.04em] text-muted-foreground uppercase',
    },
  },
  defaultVariants: {
    variant: 'body-md',
  },
})

type TextProps = ComponentProps<'p'> &
  VariantProps<typeof textVariants> & {
    as?: ElementType
  }

export function Text({ className, variant = 'body-md', as = 'p', ...props }: TextProps) {
  const Comp = as
  return <Comp className={cn(textVariants({ variant }), className)} {...props} />
}
