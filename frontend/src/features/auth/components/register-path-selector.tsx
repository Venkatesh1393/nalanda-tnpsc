import type { TFunction } from 'i18next'
import { Building2, GraduationCap, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/typography'
import { cn } from '@/lib/utils'

export type RegisterPath = 'individual' | 'coaching-student' | 'institution-owner'

type PathOption = {
  path: RegisterPath
  icon: LucideIcon
  title: string
  description: string
}

/** Built from `t` rather than a module-scope constant — `t` isn't
 * available at module scope. */
function buildPathOptions(t: TFunction<'auth'>): PathOption[] {
  return [
    {
      path: 'individual',
      icon: UserRound,
      title: t('register.pathSelector.individualTitle'),
      description: t('register.pathSelector.individualDescription'),
    },
    {
      path: 'coaching-student',
      icon: GraduationCap,
      title: t('register.pathSelector.coachingStudentTitle'),
      description: t('register.pathSelector.coachingStudentDescription'),
    },
    {
      path: 'institution-owner',
      icon: Building2,
      title: t('register.pathSelector.institutionOwnerTitle'),
      description: t('register.pathSelector.institutionOwnerDescription'),
    },
  ]
}

/**
 * "Choose Your Path" (docs/Registration_Flow.md §3) — the very first
 * Register screen, before any personal info is collected, so the rest of
 * the form only ever asks for what that path actually needs.
 */
export function RegisterPathSelector({
  onSelect,
}: {
  onSelect: (path: RegisterPath) => void
}) {
  const { t } = useTranslation('auth')
  const pathOptions = buildPathOptions(t)
  return (
    <div className="flex flex-col gap-3" role="list">
      {pathOptions.map(({ path, icon: Icon, title, description }) => (
        <Card
          key={path}
          role="listitem"
          interactive
          tabIndex={0}
          onClick={() => onSelect(path)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(path)
            }
          }}
          className={cn(
            'shadow-xs transition-shadow duration-200 hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5',
          )}
        >
          <CardHeader className="flex-row items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5">
            <Heading variant="heading-4">{title}</Heading>
            <Text variant="body-sm">{description}</Text>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
