import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 to `target` once, the first time the returned
 * `ref` scrolls into view (docs/Landing_Page_Design.md §7-10 — "a single,
 * restrained 'proof reveal' moment," never a continuous ticker, never
 * re-triggered on subsequent scrolls). Skips straight to `target` under
 * `prefers-reduced-motion` (docs/UI_Design_System.md §31).
 */
export function useCountUp(target: number, durationSeconds = 1.2) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReducedMotion = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return

    const controls = animate(0, target, {
      duration: durationSeconds,
      ease: 'easeOut',
      onUpdate: (latest) => setValue(Math.round(latest)),
    })

    return () => controls.stop()
  }, [isInView, target, durationSeconds, prefersReducedMotion])

  // Reduced motion skips the animation loop entirely — the final value is
  // derived directly during render instead of via a synchronous setState
  // inside the effect above (react-hooks/set-state-in-effect).
  const displayValue = isInView && prefersReducedMotion ? target : value

  return { ref, value: displayValue }
}
