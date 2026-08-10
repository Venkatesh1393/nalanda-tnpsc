import type { Role } from '../../constants/roles'
import type {
  CurrentAffairDocument,
  ICurrentAffair,
  ICurrentAffairQuizQuestion,
} from '../../models/CurrentAffair.model'
import type {
  BilingualParagraphs,
  BilingualText,
} from '../../models/shared/bilingualText'
import * as currentAffairRepository from '../../repositories/currentAffair.repository'
import type { AdminCurrentAffairListFilter } from '../../repositories/currentAffair.repository'
import * as questionRepository from '../../repositories/question.repository'
import * as userRepository from '../../repositories/user.repository'
import { ApiError } from '../../utils/ApiError'
import type {
  CreateCurrentAffairBody,
  UpdateCurrentAffairBody,
} from '../../validators/currentAffairs.validator'
import { pickText } from '../learn.service'
import { sendCurrentAffairsAlert } from '../notificationTriggers.service'
import * as auditLogService from '../auditLog.service'

export type ActingAdmin = { id: string; role: Role }

async function resolveAuditActor(actor: ActingAdmin) {
  const actingUser = await userRepository.findById(actor.id)
  return { id: actor.id, role: actor.role, email: actingUser?.email ?? 'unknown' }
}

type PublishStatus = 'draft' | 'scheduled' | 'published' | 'archived'

/** Derives a human-readable publish state from the same `isActive`/
 * `publishAt`/`deletedAt` fields every read already uses — never a
 * separate stored enum (see `CurrentAffair.model.ts`'s `publishAt` header
 * comment for why). */
function publishStatusOf(article: CurrentAffairDocument, now: Date): PublishStatus {
  if (article.deletedAt) return 'archived'
  if (!article.isActive) return 'draft'
  if (article.publishAt && article.publishAt > now) return 'scheduled'
  return 'published'
}

export interface AdminCurrentAffairDTO {
  id: string
  date: Date
  period: string
  category: string
  title: BilingualText
  excerpt?: BilingualText
  body: BilingualParagraphs
  highlights: BilingualParagraphs
  examRelevanceTags: string[]
  tags: string[]
  isImportant: boolean
  imageUrl?: string
  imageAlt?: string
  quizQuestionIds: string[]
  quizQuestions: ICurrentAffairQuizQuestion[]
  isActive: boolean
  publishAt: Date | null
  publishStatus: PublishStatus
  createdAt: Date | null
  updatedAt: Date | null
}

function toDTO(article: CurrentAffairDocument): AdminCurrentAffairDTO {
  return {
    id: article.id,
    date: article.date,
    period: article.period,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    highlights: article.highlights,
    examRelevanceTags: article.examRelevanceTags,
    tags: article.tags,
    isImportant: article.isImportant,
    imageUrl: article.imageUrl,
    imageAlt: article.imageAlt,
    quizQuestionIds: article.quizQuestionIds.map((id) => id.toString()),
    quizQuestions: article.quizQuestions,
    isActive: article.isActive,
    publishAt: article.publishAt ?? null,
    publishStatus: publishStatusOf(article, new Date()),
    createdAt: article.createdAt ?? null,
    updatedAt: article.updatedAt ?? null,
  }
}

export async function listCurrentAffairs(
  filter: AdminCurrentAffairListFilter,
  page: number,
  limit: number,
): Promise<{
  items: AdminCurrentAffairDTO[]
  total: number
  page: number
  limit: number
}> {
  const { items, total } = await currentAffairRepository.listForAdmin(filter, page, limit)
  return { items: items.map(toDTO), total, page, limit }
}

export async function getCurrentAffairById(id: string): Promise<AdminCurrentAffairDTO> {
  const article = await currentAffairRepository.findByIdIncludingArchived(id)
  if (!article) throw ApiError.notFound('Current affairs article not found')
  return toDTO(article)
}

/** "Link questions" (Step 54) — every id in `quizQuestionIds` must resolve
 * to a real `Question`; find candidates via the existing
 * `GET /admin/questions?search=` endpoint (Step 53), no separate picker
 * endpoint needed here. */
async function requireQuestionsExist(questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return
  const questions = await questionRepository.findByIds(questionIds)
  if (questions.length !== questionIds.length) {
    throw ApiError.badRequest(
      'quizQuestionIds contains one or more ids that do not exist',
    )
  }
}

export async function createCurrentAffair(
  actor: ActingAdmin,
  data: CreateCurrentAffairBody,
): Promise<AdminCurrentAffairDTO> {
  await requireQuestionsExist(data.quizQuestionIds)

  const article = await currentAffairRepository.create(
    data as unknown as Partial<ICurrentAffair>,
  )
  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'currentAffair.create',
    'CurrentAffair',
    article.id,
    { period: data.period, category: data.category },
  )

  // Sprint 4 Step 62 — a real, immediate event trigger: only when this
  // create genuinely publishes right now (not a draft, not scheduled for
  // later — `publishStatusOf` is the same "never a separate stored status"
  // derivation every read of this article already uses).
  if (publishStatusOf(article, new Date()) === 'published') {
    await sendCurrentAffairsAlert(article.id, pickText(article.title, 'en'))
  }

  return toDTO(article)
}

export async function updateCurrentAffair(
  actor: ActingAdmin,
  id: string,
  data: UpdateCurrentAffairBody,
): Promise<AdminCurrentAffairDTO> {
  if (data.quizQuestionIds) await requireQuestionsExist(data.quizQuestionIds)

  const updated = await currentAffairRepository.updateById(
    id,
    data as unknown as Partial<ICurrentAffair>,
  )
  if (!updated) throw ApiError.notFound('Current affairs article not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'currentAffair.update',
    'CurrentAffair',
    id,
    {
      fields: Object.keys(data),
    },
  )
  return toDTO(updated)
}

/** Publish/unpublish — reuses `isActive`, the same on/off switch every
 * other content model already has (see the model's `publishAt` header
 * comment for the full "schedule vs. publish vs. unpublish" mapping). */
export async function updateCurrentAffairStatus(
  actor: ActingAdmin,
  id: string,
  isActive: boolean,
): Promise<AdminCurrentAffairDTO> {
  const before = await currentAffairRepository.findByIdIncludingArchived(id)
  const wasPublished = before ? publishStatusOf(before, new Date()) === 'published' : false

  const updated = await currentAffairRepository.updateActiveStatus(id, isActive)
  if (!updated) throw ApiError.notFound('Current affairs article not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    isActive ? 'currentAffair.publish' : 'currentAffair.unpublish',
    'CurrentAffair',
    id,
    { isActive },
  )

  // Sprint 4 Step 62 — only a genuine draft/scheduled → published
  // transition notifies; toggling an already-published article is a no-op
  // here, never a re-notification.
  if (!wasPublished && publishStatusOf(updated, new Date()) === 'published') {
    await sendCurrentAffairsAlert(updated.id, pickText(updated.title, 'en'))
  }

  return toDTO(updated)
}

export async function archiveCurrentAffair(
  actor: ActingAdmin,
  id: string,
): Promise<AdminCurrentAffairDTO> {
  const updated = await currentAffairRepository.archive(id)
  if (!updated) throw ApiError.notFound('Current affairs article not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'currentAffair.archive',
    'CurrentAffair',
    id,
  )
  return toDTO(updated)
}

export async function restoreCurrentAffair(
  actor: ActingAdmin,
  id: string,
): Promise<AdminCurrentAffairDTO> {
  const updated = await currentAffairRepository.restore(id)
  if (!updated) throw ApiError.notFound('Archived current affairs article not found')

  const auditActor = await resolveAuditActor(actor)
  await auditLogService.recordAction(
    auditActor,
    'currentAffair.restore',
    'CurrentAffair',
    id,
  )
  return toDTO(updated)
}
