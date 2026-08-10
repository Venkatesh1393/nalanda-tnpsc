import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  LayoutDashboard,
  Newspaper,
  Settings,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react'

import { ROUTES } from '@/constants/routes'

export type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

/** The Sidebar's nav tree. `Content` covers the whole Exam → Subject →
 * Topic → Subtopic → Lesson hierarchy + Study Materials as one tabbed page
 * (Step 54) — no separate "Exams" entry. `Subscriptions`/`Analytics`/
 * `Settings` still render an honest "coming soon" placeholder (no backend
 * yet); every other entry is real. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Users', href: ROUTES.users, icon: Users },
  { label: 'Content', href: ROUTES.content, icon: FileText },
  { label: 'Questions', href: ROUTES.questions, icon: BookOpen },
  { label: 'AI Question Generator', href: ROUTES.aiQuestionGenerate, icon: Sparkles },
  { label: 'Current Affairs', href: ROUTES.currentAffairs, icon: Newspaper },
  { label: 'Live Exams', href: ROUTES.liveExams, icon: Timer },
  { label: 'Subscriptions', href: ROUTES.subscriptions, icon: CreditCard },
  { label: 'Analytics', href: ROUTES.analytics, icon: BarChart3 },
  { label: 'Settings', href: ROUTES.settings, icon: Settings },
]
