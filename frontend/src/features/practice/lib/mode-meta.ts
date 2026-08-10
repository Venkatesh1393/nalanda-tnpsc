import type { PracticeMode } from '@/types/practice'

/** Display metadata for each practice mode — kept in its own module (rather
 * than alongside `ModeConfigForm`) so that component file only exports the
 * component itself, per the project's Fast Refresh convention.
 *
 * Titles/descriptions are static UI copy (not backend data), so they're
 * translated — but this is a plain data module, not a component, so it
 * can't call `useTranslation` itself. It exports fully-qualified i18next
 * key paths (namespace-prefixed, so they resolve correctly no matter which
 * namespace array a call site's `useTranslation` uses as its default);
 * render sites resolve them with `t(MODE_META[mode].titleKey)` /
 * `t(MODE_META[mode].descriptionKey)` (both live under `practice:modeMeta.*`
 * in `i18n/locales/{en,ta}/practice.json`). */
export const MODE_META = {
  quiz: {
    titleKey: 'practice:modeMeta.quiz.title',
    descriptionKey: 'practice:modeMeta.quiz.description',
  },
  'hundred-questions': {
    titleKey: 'practice:modeMeta.hundredQuestions.title',
    descriptionKey: 'practice:modeMeta.hundredQuestions.description',
  },
  sectional: {
    titleKey: 'practice:modeMeta.sectional.title',
    descriptionKey: 'practice:modeMeta.sectional.description',
  },
  mock: {
    titleKey: 'practice:modeMeta.mock.title',
    descriptionKey: 'practice:modeMeta.mock.description',
  },
  pyq: {
    titleKey: 'practice:modeMeta.pyq.title',
    descriptionKey: 'practice:modeMeta.pyq.description',
  },
} as const satisfies Record<PracticeMode, { titleKey: string; descriptionKey: string }>
