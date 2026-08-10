import { GAMIFICATION_CONFIG } from '../config/gamification.config'
import type { LearningProgressDocument } from '../models/LearningProgress.model'
import * as learningProgressRepository from '../repositories/learningProgress.repository'
import * as lessonRepository from '../repositories/lesson.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as subtopicRepository from '../repositories/subtopic.repository'
import * as topicRepository from '../repositories/topic.repository'
import { ApiError } from '../utils/ApiError'
import type { UpdateLearningProgressBody } from '../validators/learningProgress.validator'
import * as gamificationService from './gamification.service'
import { pickText, type DisplayLanguage } from './learn.service'

/** Matches `frontend/src/services/learnProgressService.ts`'s (mocked)
 * `AUTO_COMPLETE_THRESHOLD` — a video watched past this point auto-marks
 * its subtopic complete without a separate explicit action. Notes have no
 * equivalent (docs/Learn_Module.md §5 — completion there is always the
 * user's own explicit "Mark as Read"). */
const AUTO_COMPLETE_THRESHOLD = 90

export interface LearningProgressEntryDTO {
  subjectId: string
  subjectName: string
  topicId: string
  topicName: string
  subtopicId: string
  subtopicName: string
  status: string
  notesRead: boolean
  lastAccessedAt: string
  completedAt: string | null
}

export interface LastVisitedDTO {
  subjectId: string
  topicId: string
  subtopicId: string
  visitedAt: string
}

async function toEntryDTO(
  doc: LearningProgressDocument,
  lang: DisplayLanguage,
): Promise<LearningProgressEntryDTO | null> {
  const [subject, topic, subtopic] = await Promise.all([
    subjectRepository.findById(doc.subjectId),
    topicRepository.findById(doc.topicId),
    subtopicRepository.findById(doc.subtopicId),
  ])
  if (!subject || !topic || !subtopic) return null
  return {
    subjectId: subject.slug,
    subjectName: pickText(subject.name, lang),
    topicId: topic.slug,
    topicName: pickText(topic.name, lang),
    subtopicId: subtopic.slug,
    subtopicName: pickText(subtopic.name, lang),
    status: doc.status,
    notesRead: doc.notesRead,
    lastAccessedAt: doc.lastAccessedAt.toISOString(),
    completedAt: doc.completedAt?.toISOString() ?? null,
  }
}

export async function getProgress(
  userId: string,
  lang: DisplayLanguage,
  subjectSlug?: string,
): Promise<LearningProgressEntryDTO[]> {
  const subjectId = subjectSlug
    ? (await subjectRepository.findBySlug(subjectSlug))?._id
    : undefined
  if (subjectSlug && !subjectId) throw ApiError.notFound('Subject not found')

  const docs = await learningProgressRepository.findByUser(userId, { subjectId })
  const entries = await Promise.all(docs.map((doc) => toEntryDTO(doc, lang)))
  return entries.filter((entry): entry is LearningProgressEntryDTO => entry !== null)
}

export async function getLastVisited(userId: string): Promise<LastVisitedDTO | null> {
  const [mostRecent] = await learningProgressRepository.findMostRecentByUser(userId, 1)
  if (!mostRecent) return null
  const [subject, topic, subtopic] = await Promise.all([
    subjectRepository.findById(mostRecent.subjectId),
    topicRepository.findById(mostRecent.topicId),
    subtopicRepository.findById(mostRecent.subtopicId),
  ])
  if (!subject || !topic || !subtopic) return null
  return {
    subjectId: subject.slug,
    topicId: topic.slug,
    subtopicId: subtopic.slug,
    visitedAt: mostRecent.lastAccessedAt.toISOString(),
  }
}

async function resolveSubtopicChain(subtopicSlug: string) {
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic) throw ApiError.notFound('Subtopic not found')
  return {
    subjectId: subtopic.subjectId,
    topicId: subtopic.topicId,
    subtopicId: subtopic._id,
  }
}

/**
 * `PATCH /learning-progress/:subtopicSlug` — a single endpoint backing
 * every mutation `learnProgressService.ts` (frontend) used to make
 * independently against `localStorage`: recording a visit (empty body),
 * updating a lesson's watch progress (auto-completing past the threshold,
 * mirroring the old mock's own behavior exactly), toggling notes-read, and
 * marking a subtopic complete/incomplete. Every call also bumps
 * `lastAccessedAt`, which is what powers `getLastVisited` (Continue
 * Learning) — never a separate "visit" write.
 */
export async function updateProgress(
  userId: string,
  subtopicSlug: string,
  body: UpdateLearningProgressBody,
): Promise<void> {
  const ids = await resolveSubtopicChain(subtopicSlug)

  // Sprint 4 Step 61 (Gamification System) — XP is awarded exactly once,
  // the moment this subtopic *transitions into* `completed` (never on a
  // later no-op re-save of an already-completed subtopic), so the pre-write
  // status must be read first.
  const existing = await learningProgressRepository.findByUserAndSubtopic(
    userId,
    ids.subtopicId,
  )
  const wasCompleted = existing?.status === 'completed'
  let justCompleted = false

  if (body.lesson) {
    const { progressPercent } = body.lesson
    const lessonId =
      body.lesson.lessonId ??
      (await lessonRepository.findPrimaryForSubtopic(ids.subtopicId, 'video'))?._id
    if (!lessonId)
      throw ApiError.badRequest('This subtopic has no video lesson to track.')

    const lessonStatus =
      progressPercent >= AUTO_COMPLETE_THRESHOLD ? 'completed' : 'in_progress'
    await learningProgressRepository.upsertLessonProgress(
      userId,
      ids,
      ids.subtopicId,
      lessonId,
      lessonStatus,
      progressPercent,
    )
    if (progressPercent >= AUTO_COMPLETE_THRESHOLD && !body.status) {
      await learningProgressRepository.setStatus(userId, ids, ids.subtopicId, 'completed')
      if (!wasCompleted) justCompleted = true
    }
  }

  if (body.notesRead !== undefined) {
    await learningProgressRepository.setNotesRead(
      userId,
      ids,
      ids.subtopicId,
      body.notesRead,
    )
  }

  if (body.status) {
    await learningProgressRepository.setStatus(userId, ids, ids.subtopicId, body.status)
    if (body.status === 'completed' && !wasCompleted) justCompleted = true
  }

  if (!body.lesson && body.notesRead === undefined && !body.status) {
    // An empty body — just record the visit.
    await learningProgressRepository.touch(userId, ids, ids.subtopicId)
  }

  if (justCompleted) {
    await gamificationService.awardXp(userId, {
      reason: 'lesson_completion',
      xpAmount: GAMIFICATION_CONFIG.xp.lessonCompletion,
      coinsAmount: GAMIFICATION_CONFIG.coins.lessonCompletion,
      refId: ids.subtopicId,
    })
  }
}
