/**
 * The Practice feature's public surface — pages import from here, never by
 * reaching into `features/practice/components/*` directly (per
 * `features/README.md`, the same convention `features/learn/index.ts`/
 * `features/dashboard/index.ts` already follow).
 */
export { AchievementUnlockBanner } from '@/features/practice/components/achievement-unlock-banner'
export { AiExplanationPanel } from '@/features/practice/components/ai-explanation-panel'
export { MODE_META } from '@/features/practice/lib/mode-meta'
export { ModeConfigForm } from '@/features/practice/components/mode-config-form'
export { PracticeQuestionPanel } from '@/features/practice/components/practice-question-panel'
export { PracticeSummaryCard } from '@/features/practice/components/practice-summary-card'
export {
  QuestionPalette,
  type PaletteItemState,
} from '@/features/practice/components/question-palette'
export { QuestionTimer } from '@/features/practice/components/question-timer'
