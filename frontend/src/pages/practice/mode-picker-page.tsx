import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ROUTES } from '@/constants/routes'
import { ModeConfigForm } from '@/features/practice'
import type { PracticeMode } from '@/types/practice'

const VALID_MODES: PracticeMode[] = [
  'quiz',
  'hundred-questions',
  'sectional',
  'mock',
  'pyq',
]

function isPracticeMode(value: string | undefined): value is PracticeMode {
  return value !== undefined && VALID_MODES.includes(value as PracticeMode)
}

/** `/app/practice/:mode` — the mode-specific start screen. */
export function ModePickerPage() {
  const { mode } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('practice')

  if (!isPracticeMode(mode)) {
    return (
      <EmptyState
        title={t('modePickerPage.unknownModeTitle')}
        description={t('modePickerPage.unknownModeDescription')}
        actionLabel={t('shared.backToDashboard')}
        onAction={() => navigate(ROUTES.dashboard)}
      />
    )
  }

  return <ModeConfigForm mode={mode} />
}
