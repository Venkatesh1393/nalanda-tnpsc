import type { SVGProps } from 'react'

/**
 * A restrained, non-cartoonish streak-flame glyph (docs/UI_Design_System.md
 * §23, §37) — deliberately calmer than a typical gamification "fire" icon,
 * to stay dignified for an adult, high-stakes-exam audience. Follows the
 * same 24x24 / stroke-based / currentColor conventions as lucide-react so it
 * can be dropped in anywhere a Lucide icon would be used.
 */
export function StreakFlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 21c3.314 0 6-2.462 6-6.5 0-3.5-2.5-5.5-3.5-8.5-.667 1.5-1.2 2.4-2 3-1-2-1.2-4-1.5-6-2 2-4 5.5-4 9C7 18.538 8.686 21 12 21Z" />
      <path d="M12 21c1.657 0 3-1.343 3-3.25 0-1.5-1-2.5-1.5-3.75-.5 1-1 1.5-1.5 1.75-.25-1-.5-1.75-1-2.75-1 1.25-2 2.75-2 4.75 0 1.907 1.343 3.25 3 3.25Z" />
    </svg>
  )
}
