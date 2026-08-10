/**
 * docs/UI_Design_System.md doesn't define a bespoke spacing scale — this
 * project deliberately relies on Tailwind's default 4px-increment scale
 * (p-1 = 4px, p-2 = 8px, p-4 = 16px, ...) via utility classes, which is
 * already a solid, widely-understood system consistent with the 4px-based
 * rhythm implied by our radius/type-scale choices.
 *
 * This file exists only for the rare *non-Tailwind* contexts that need a
 * numeric spacing value in JS/TS — Recharts `margin` props, Framer Motion
 * pixel offsets, etc. — so those call sites reference the same scale
 * instead of inventing ad hoc numbers.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const

export type SpacingToken = keyof typeof spacing
