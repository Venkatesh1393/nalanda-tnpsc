import {
  BellRing,
  BookOpen,
  Crown,
  type LucideIcon,
  Megaphone,
  Newspaper,
  Trophy,
} from 'lucide-react'

import type { NotificationCategoryId } from '@/types/notifications'

/** Maps a category id to its Lucide icon — exported as a plain `Record`
 * (looked up via `NOTIFICATION_CATEGORY_ICONS[id]` at the call site,
 * `features/dashboard/components/today-tasks-card.tsx`'s `TASK_ICONS`
 * precedent) rather than a `getX()` accessor function — the React Compiler
 * ESLint rule (`react-hooks/static-components`) flags a component reference
 * returned from a function call and assigned to a capitalized variable as
 * "created during render," even though it's a stable lookup; a direct
 * object index doesn't trigger that heuristic. `Crown` (not `Sparkles`) for
 * Premium Updates so it doesn't visually collide with the `Sparkles` "Ask
 * AI" affordance used elsewhere in the product. */
export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategoryId, LucideIcon> = {
  'exam-reminder': BellRing,
  'study-reminder': BookOpen,
  'premium-update': Crown,
  'current-affairs-alert': Newspaper,
  achievement: Trophy,
  'system-notice': Megaphone,
}
