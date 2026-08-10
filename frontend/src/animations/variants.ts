import type { Transition, Variants } from 'framer-motion'

/**
 * Duration/easing tokens from docs/UI_Design_System.md §19. Reach for
 * `motionBase` by default; `motionCelebratory` is reserved for genuine,
 * earned milestones only (§32) — never routine transitions.
 */
export const motionInstant: Transition = { duration: 0.1, ease: 'easeOut' }
export const motionFast: Transition = { duration: 0.18, ease: 'easeInOut' }
export const motionBase: Transition = {
  duration: 0.26,
  ease: [0.2, 0.8, 0.2, 1],
}
export const motionCelebratory: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 15,
}

/**
 * The shared entrance variant used throughout the product for card/section
 * reveals on scroll/mount (docs/UI_Design_System.md — used across
 * Dashboard stat cards, Feature Cards, Analytics charts, etc.).
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: motionBase },
}

/**
 * A staggered-children wrapper — apply to a parent to make its children
 * (each using `fadeInUp`) reveal in sequence rather than all at once.
 */
export function staggerChildren(staggerDelaySeconds = 0.06): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelaySeconds },
    },
  }
}

/**
 * Directional entrance pair used only by the Landing Page's Success Stories
 * section (docs/Landing_Page_Design.md §14 — "the only place on the page
 * using a directional, rather than purely vertical, entrance animation,
 * marking this section as distinct in tone"). Not intended for general
 * reuse outside that one context — reach for `fadeInUp` everywhere else.
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: motionBase },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: motionBase },
}
