import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Languages,
  type LucideIcon,
} from 'lucide-react'

/**
 * Maps `LearnSubject.iconKey` (a plain string, per `services/learnService.ts`'s
 * mock dataset) to its Lucide icon component — keeps the mock data itself
 * serializable/plain, matching the precedent already set for Dashboard's
 * `DashboardTask.type` -> icon mapping.
 */
const SUBJECT_ICONS: Record<string, LucideIcon> = {
  languages: Languages,
  'book-open': BookOpen,
  'flask-conical': FlaskConical,
  landmark: Landmark,
  calculator: Calculator,
}

export function getSubjectIcon(iconKey: string): LucideIcon {
  return SUBJECT_ICONS[iconKey] ?? BookOpen
}
