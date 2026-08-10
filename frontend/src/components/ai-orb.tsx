import { motion } from 'framer-motion'

import { motionBase } from '@/animations/variants'
import { cn } from '@/lib/utils'

type AiOrbProps = {
  size?: 'md' | 'lg'
  /** Pulse cycle duration in seconds. The Landing Page Hero's idle state
   * uses the slower default; docs/Onboarding.md §6 (the Generate Study
   * Plan screen) asks for this to be "slightly more active/faster-cycling
   * ... to visually signal 'actively working' rather than 'waiting'." */
  pulseSeconds?: number
  /** 'viewport' plays the entrance once when scrolled into view (the
   * Hero's usage, docs/Landing_Page_Design.md §6); 'mount' plays it
   * immediately (the Onboarding Generate-Plan screen, which is never
   * scrolled past). */
  trigger?: 'mount' | 'viewport'
  className?: string
}

/**
 * The platform's single AI Assistant visual identity (docs/Landing_Page_Design.md
 * §6) — a soft-edged, glowing, non-anthropomorphic orb. Deliberately reused
 * unchanged (same gradient, same glass treatment) everywhere the product
 * wants to say "the AI is here/working," per docs/Onboarding.md §6's
 * explicit continuity requirement between the Hero section and the
 * Generate Study Plan screen ("same glowing orb, same color treatment").
 */
export function AiOrb({
  size = 'lg',
  pulseSeconds = 3.5,
  trigger = 'mount',
  className,
}: AiOrbProps) {
  const entranceProps =
    trigger === 'viewport'
      ? {
          initial: { opacity: 0, scale: 0.85 },
          whileInView: { opacity: 1, scale: 1 },
          viewport: { once: true, margin: '-40px' },
        }
      : {
          initial: { opacity: 0, scale: 0.85 },
          animate: { opacity: 1, scale: 1 },
        }

  return (
    <motion.div
      {...entranceProps}
      transition={motionBase}
      className={cn(
        'relative flex items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md',
        size === 'lg' ? 'size-40 sm:size-52' : 'size-24 sm:size-28',
        className,
      )}
    >
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: pulseSeconds, repeat: Infinity, ease: 'easeInOut' }}
        className={cn(
          'from-ai-teal to-primary rounded-full bg-gradient-to-br blur-md',
          size === 'lg' ? 'size-28 sm:size-36' : 'size-16 sm:size-20',
        )}
      />
    </motion.div>
  )
}
