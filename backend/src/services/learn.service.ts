import type { Types } from 'mongoose'

import type { ExamCategoryCode } from '../constants/exam'
import type { SubscriptionTier } from '../constants/roles'
import type { ExamDocument } from '../models/Exam.model'
import type { BilingualText } from '../models/shared/bilingualText'
import type { SubjectDocument } from '../models/Subject.model'
import type { SubtopicDocument } from '../models/Subtopic.model'
import type { TopicDocument } from '../models/Topic.model'
import * as bookmarkRepository from '../repositories/bookmark.repository'
import * as examRepository from '../repositories/exam.repository'
import * as learningProgressRepository from '../repositories/learningProgress.repository'
import * as lessonRepository from '../repositories/lesson.repository'
import * as profileRepository from '../repositories/profile.repository'
import * as studyMaterialRepository from '../repositories/studyMaterial.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as subtopicRepository from '../repositories/subtopic.repository'
import * as topicRepository from '../repositories/topic.repository'
import { cacheKey, CACHE_TTL, getCache } from '../config/cache'
import { hasFeature } from './entitlement.service'
import * as cloudinaryUploadService from './media/cloudinaryUpload.service'
import { ApiError } from '../utils/ApiError'

export type DisplayLanguage = 'en' | 'ta'

export function pickText(text: BilingualText, lang: DisplayLanguage): string {
  return (lang === 'ta' ? text.ta : text.en) ?? text.en ?? text.ta ?? ''
}

// ---- DTOs — field names/shapes mirror `frontend/src/types/learn.ts` so the
// frontend service layer swap is close to 1:1, per this step's "do not
// redesign the existing approved interface" instruction. `id` is always the
// Mongo document's real `slug` (Subject/Topic/Subtopic), never a raw
// ObjectId — that's what keeps every existing `ROUTES.learn*`/`:param` URL
// working unchanged. ----

export interface LearnSubjectDTO {
  id: string
  name: string
  icon: string | null
  topicCount: number
  progressPercent: number
}

export interface LearnTopicDTO {
  id: string
  subjectId: string
  name: string
  subtopicCount: number
  progressPercent: number
  isComplete: boolean
}

export interface LearnSubtopicDTO {
  id: string
  topicId: string
  subjectId: string
  name: string
  hasVideo: boolean
  hasNotes: boolean
  isBookmarked: boolean
  isComplete: boolean
  estimatedMinutes: number
}

export interface LessonDetailDTO {
  subtopic: LearnSubtopicDTO
  subjectName: string
  topicName: string
  description: string
}

export interface VideoLessonDTO {
  subtopicId: string
  title: string
  durationSeconds: number
  language: DisplayLanguage
  hasTranscript: boolean
  isBookmarked: boolean
  progressPercent: number
}

export interface StudyNoteDTO {
  subtopicId: string
  title: string
  paragraphs: string[]
  estimatedReadMinutes: number
  isPremium: boolean
  isBookmarked: boolean
  language: DisplayLanguage
}

export interface LearnSearchResultDTO {
  type: 'subject' | 'topic' | 'subtopic'
  id: string
  label: string
  context: string
  subjectId: string
  topicId?: string
  subtopicId?: string
}

export interface SubtopicLocationDTO {
  subjectId: string
  subjectName: string
  topicId: string
  topicName: string
}

export async function resolveExamId(
  examCategory?: ExamCategoryCode,
): Promise<Types.ObjectId | undefined> {
  if (!examCategory) return undefined
  const exam = await examRepository.findByCode(examCategory)
  if (!exam) throw ApiError.badRequest(`Unknown exam category: ${examCategory}`)
  return exam._id
}

/**
 * Sprint 4 Step 67 — the id→code direction, shared by every caller that
 * used to keep its own request-scoped `Map` memoizing this exact lookup
 * (`dashboard.service.ts#resolveExamCode`, `leaderboard.service.ts`'s
 * identical helper — both deleted in favor of this one). `Exam` documents
 * are edited only through the rarely-used Admin Syllabus screen, so a
 * `CACHE_TTL.LONG` (15 min) process-wide cache trades a small worst-case
 * staleness window for turning what was N duplicate per-request DB round
 * trips into effectively zero after the first hit of the process's
 * lifetime. Returns `''` (never throws) for an unknown/deleted exam id, so
 * callers building a DTO field don't need their own fallback branch.
 */
const EXAM_CODE_CACHE_NAMESPACE = 'exam:code'

export async function resolveExamCode(examId: Types.ObjectId | string): Promise<string> {
  const key = cacheKey(EXAM_CODE_CACHE_NAMESPACE, examId.toString())
  return getCache().wrap(key, CACHE_TTL.LONG, async () => {
    const exam = await examRepository.findById(examId)
    return exam?.code ?? ''
  })
}

/** Called by `services/admin/adminSyllabus.service.ts` after an Exam
 * update/status-change so a code edit is never served stale for up to
 * `CACHE_TTL.LONG` (15 min). */
export async function invalidateExamCodeCache(): Promise<void> {
  await getCache().delByPrefix(`${EXAM_CODE_CACHE_NAMESPACE}:`)
}

/** A student should only see content appropriate to their selected TNPSC
 * exam "where applicable" (Step 45's explicit instruction) — when the
 * caller doesn't name an `examCategory` explicitly, fall back to the
 * signed-in user's own primary exam goal (`Profile.examGoals`, set during
 * Onboarding) rather than defaulting to "every exam's content unfiltered."
 * A user who hasn't chosen an exam yet (onboarding incomplete) still sees
 * the full active catalog — never an empty/broken Subjects page. */
export async function resolveDefaultExamId(
  userId: string,
): Promise<Types.ObjectId | undefined> {
  const profile = await profileRepository.findByUserId(userId)
  const primaryGoal =
    profile?.examGoals.find((goal) => goal.isPrimary) ?? profile?.examGoals[0]
  return primaryGoal?.examId
}

/** Real, computed from `LearningProgress` — never a stored duplicate
 * percentage (this step's explicit instruction). `total === 0` (a subject/
 * topic with no subtopics yet) reads as 0%, not `NaN`. */
async function completionPercent(
  userId: string,
  subtopicIds: Types.ObjectId[],
): Promise<number> {
  if (subtopicIds.length === 0) return 0
  const progressDocs = await learningProgressRepository.findByUserAndSubtopics(
    userId,
    subtopicIds,
  )
  const completed = progressDocs.filter((doc) => doc.status === 'completed').length
  return Math.round((completed / subtopicIds.length) * 100)
}

// ---- Subjects ----

/** Namespace prefix for every cache entry this module owns — the one thing
 * `services/admin/adminSyllabus.service.ts`'s write paths need to know to
 * bust the whole family after a Subject/Topic/Subtopic edit, without either
 * module tracking the other's exact key shapes. */
const LEARN_CACHE_NAMESPACE = 'learn'

/**
 * Sprint 4 Step 67 — the Subject/Topic/Subtopic catalog is admin-edited data
 * (Admin Syllabus, Step 54) that every student reads on every Learn page
 * load; `topicCount`/`subtopics` were being re-fetched per subject on every
 * single request. Cached for `CACHE_TTL.MEDIUM` (5 min) and explicitly
 * busted by `adminSyllabus.service.ts` on any Subject/Topic/Subtopic write,
 * so an admin edit is visible immediately rather than waiting out the TTL —
 * the TTL alone is just the backstop for the (currently none) code paths
 * that mutate this data outside that admin service.
 *
 * Deliberately NOT cached: `progressPercent` below, computed fresh from
 * `LearningProgress` per call — that's per-user, per-request data and must
 * never be shared across users via a cache key.
 */
/** Called by `services/admin/adminSyllabus.service.ts` after any
 * Subject/Topic/Subtopic create/update/archive/restore so cached catalog
 * reads never lag a real admin edit. Deliberately coarse (busts the whole
 * `learn:` family rather than computing exactly which subject/topic keys a
 * given edit could affect) — this cache is refilled from a handful of cheap
 * queries, so over-invalidating on a rare admin write is a non-issue. */
export async function invalidateLearnCache(): Promise<void> {
  await getCache().delByPrefix(`${LEARN_CACHE_NAMESPACE}:`)
}

async function getCatalogSubjects(examId: Types.ObjectId | undefined) {
  const key = cacheKey(LEARN_CACHE_NAMESPACE, 'subjects', examId?.toString() ?? 'all')
  return getCache().wrap(key, CACHE_TTL.MEDIUM, () =>
    examId ? subjectRepository.findByExam(examId) : subjectRepository.findAll(),
  )
}

async function getCatalogTopicCount(subjectId: Types.ObjectId): Promise<number> {
  const key = cacheKey(LEARN_CACHE_NAMESPACE, 'topicCount', subjectId.toString())
  return getCache().wrap(key, CACHE_TTL.MEDIUM, () =>
    topicRepository.countBySubject(subjectId),
  )
}

async function getCatalogSubtopics(subjectId: Types.ObjectId) {
  const key = cacheKey(LEARN_CACHE_NAMESPACE, 'subtopicsBySubject', subjectId.toString())
  return getCache().wrap(key, CACHE_TTL.MEDIUM, () =>
    subtopicRepository.findBySubject(subjectId),
  )
}

export async function getSubjects(
  userId: string,
  examCategory: ExamCategoryCode | undefined,
  lang: DisplayLanguage,
): Promise<LearnSubjectDTO[]> {
  const examId =
    (await resolveExamId(examCategory)) ?? (await resolveDefaultExamId(userId))
  const subjects = await getCatalogSubjects(examId)

  return Promise.all(subjects.map((subject) => toSubjectDTO(subject, userId, lang)))
}

async function toSubjectDTO(
  subject: SubjectDocument,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnSubjectDTO> {
  const [topicCount, subtopics] = await Promise.all([
    getCatalogTopicCount(subject._id),
    getCatalogSubtopics(subject._id),
  ])
  const progressPercent = await completionPercent(
    userId,
    subtopics.map((s) => s._id),
  )
  return {
    id: subject.slug,
    name: pickText(subject.name, lang),
    icon: subject.icon ?? null,
    topicCount,
    progressPercent,
  }
}

export async function getSubjectBySlug(
  slug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnSubjectDTO | null> {
  const subject = await subjectRepository.findBySlug(slug)
  if (!subject) return null
  return toSubjectDTO(subject, userId, lang)
}

// ---- Topics ----

async function requireSubject(subjectSlug: string): Promise<SubjectDocument> {
  const subject = await subjectRepository.findBySlug(subjectSlug)
  if (!subject) throw ApiError.notFound('Subject not found')
  return subject
}

async function requireTopic(
  subject: SubjectDocument,
  topicSlug: string,
): Promise<TopicDocument> {
  const topic = await topicRepository.findBySlug(topicSlug)
  if (!topic || topic.subjectId.toString() !== subject._id.toString()) {
    throw ApiError.notFound('Topic not found')
  }
  return topic
}

async function requireSubtopic(
  topic: TopicDocument,
  subtopicSlug: string,
): Promise<SubtopicDocument> {
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic || subtopic.topicId.toString() !== topic._id.toString()) {
    throw ApiError.notFound('Subtopic not found')
  }
  return subtopic
}

async function toTopicDTO(
  topic: TopicDocument,
  subjectSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnTopicDTO> {
  const [subtopicCount, subtopics] = await Promise.all([
    subtopicRepository.countByTopic(topic._id),
    subtopicRepository.findByTopic(topic._id),
  ])
  const progressPercent = await completionPercent(
    userId,
    subtopics.map((s) => s._id),
  )
  return {
    id: topic.slug,
    subjectId: subjectSlug,
    name: pickText(topic.name, lang),
    subtopicCount,
    progressPercent,
    isComplete: subtopicCount > 0 && progressPercent === 100,
  }
}

export async function getTopics(
  subjectSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnTopicDTO[]> {
  const subject = await requireSubject(subjectSlug)
  const topics = await topicRepository.findBySubject(subject._id)
  return Promise.all(topics.map((topic) => toTopicDTO(topic, subjectSlug, userId, lang)))
}

// ---- Subtopics ----

async function toSubtopicDTO(
  subtopic: SubtopicDocument,
  topicSlug: string,
  subjectSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnSubtopicDTO> {
  const [lesson, studyMaterial, progress] = await Promise.all([
    lessonRepository.findPrimaryForSubtopic(subtopic._id, 'video'),
    studyMaterialRepository.findPrimaryForSubtopic(subtopic._id),
    learningProgressRepository.findByUserAndSubtopic(userId, subtopic._id),
  ])

  const [lessonBookmark, notesBookmark] = await Promise.all([
    lesson ? bookmarkRepository.findOne(userId, 'lesson', lesson._id) : null,
    studyMaterial
      ? bookmarkRepository.findOne(userId, 'study_material', studyMaterial._id)
      : null,
  ])

  return {
    id: subtopic.slug,
    topicId: topicSlug,
    subjectId: subjectSlug,
    name: pickText(subtopic.name, lang),
    hasVideo: Boolean(lesson),
    hasNotes: Boolean(studyMaterial),
    isBookmarked: Boolean(lessonBookmark ?? notesBookmark),
    isComplete: progress?.status === 'completed',
    estimatedMinutes: subtopic.estimatedMinutes ?? 0,
  }
}

export async function getSubtopics(
  subjectSlug: string,
  topicSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LearnSubtopicDTO[]> {
  const subject = await requireSubject(subjectSlug)
  const topic = await requireTopic(subject, topicSlug)
  const subtopics = await subtopicRepository.findByTopic(topic._id)
  return Promise.all(
    subtopics.map((subtopic) =>
      toSubtopicDTO(subtopic, topicSlug, subjectSlug, userId, lang),
    ),
  )
}

// ---- Lesson detail / Video / Notes ----

export async function getLessonDetail(
  subjectSlug: string,
  topicSlug: string,
  subtopicSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<LessonDetailDTO | null> {
  const subject = await subjectRepository.findBySlug(subjectSlug)
  if (!subject) return null
  const topic = await topicRepository.findBySlug(topicSlug)
  if (!topic || topic.subjectId.toString() !== subject._id.toString()) return null
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic || subtopic.topicId.toString() !== topic._id.toString()) return null

  const [subtopicDTO, studyMaterial] = await Promise.all([
    toSubtopicDTO(subtopic, topicSlug, subjectSlug, userId, lang),
    studyMaterialRepository.findPrimaryForSubtopic(subtopic._id),
  ])

  const description = studyMaterial
    ? (studyMaterial.body[lang][0] ?? studyMaterial.body.en[0] ?? '')
    : ''

  return {
    subtopic: subtopicDTO,
    subjectName: pickText(subject.name, lang),
    topicName: pickText(topic.name, lang),
    description,
  }
}

export async function getVideoLesson(
  subjectSlug: string,
  topicSlug: string,
  subtopicSlug: string,
  userId: string,
  lang: DisplayLanguage,
): Promise<VideoLessonDTO | null> {
  const subject = await subjectRepository.findBySlug(subjectSlug)
  if (!subject) return null
  const topic = await topicRepository.findBySlug(topicSlug)
  if (!topic || topic.subjectId.toString() !== subject._id.toString()) return null
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic || subtopic.topicId.toString() !== topic._id.toString()) return null

  const lesson = await lessonRepository.findPrimaryForSubtopic(subtopic._id, 'video')
  if (!lesson) return null

  const [bookmark, progress] = await Promise.all([
    bookmarkRepository.findOne(userId, 'lesson', lesson._id),
    learningProgressRepository.findByUserAndSubtopic(userId, subtopic._id),
  ])
  const lessonProgress = progress?.lessons.find(
    (l) => l.lessonId.toString() === lesson._id.toString(),
  )

  return {
    subtopicId: subtopicSlug,
    title: pickText(lesson.title, lang),
    durationSeconds: lesson.video?.durationSeconds ?? 0,
    language: lang,
    hasTranscript: Boolean(lesson.transcript?.en || lesson.transcript?.ta),
    isBookmarked: Boolean(bookmark),
    progressPercent: lessonProgress?.progressPercent ?? 0,
  }
}

export async function getStudyNotes(
  subjectSlug: string,
  topicSlug: string,
  subtopicSlug: string,
  userId: string,
  subscriptionTier: SubscriptionTier,
  lang: DisplayLanguage,
): Promise<StudyNoteDTO | null> {
  const subject = await subjectRepository.findBySlug(subjectSlug)
  if (!subject) return null
  const topic = await topicRepository.findBySlug(topicSlug)
  if (!topic || topic.subjectId.toString() !== subject._id.toString()) return null
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic || subtopic.topicId.toString() !== topic._id.toString()) return null

  const studyMaterial = await studyMaterialRepository.findPrimaryForSubtopic(subtopic._id)
  if (!studyMaterial) return null

  const bookmark = await bookmarkRepository.findOne(
    userId,
    'study_material',
    studyMaterial._id,
  )
  const paragraphs =
    (lang === 'ta' ? studyMaterial.body.ta : studyMaterial.body.en).length > 0
      ? lang === 'ta'
        ? studyMaterial.body.ta
        : studyMaterial.body.en
      : studyMaterial.body.en

  // `isPremium` here means "locked for this viewer," matching the frontend
  // DTO's existing single-field contract (`frontend/src/types/learn.ts`'s
  // `StudyNote.isPremium`) — content flagged premium is only actually locked
  // when the signed-in user's plan doesn't include `premium_study_material`
  // (Sprint 4 Step 55's entitlement engine). Previously this passed
  // `studyMaterial.isPremium` straight through with no tier check at all, so
  // every user — even paying Plus/Pro subscribers — saw locked notes.
  const isLocked =
    studyMaterial.isPremium && !hasFeature(subscriptionTier, 'premium_study_material')

  return {
    subtopicId: subtopicSlug,
    title: pickText(studyMaterial.title, lang),
    paragraphs,
    estimatedReadMinutes: Math.max(
      1,
      Math.round(paragraphs.join(' ').split(/\s+/).length / 200),
    ),
    isPremium: isLocked,
    isBookmarked: Boolean(bookmark),
    language: lang,
  }
}

// ---- Lessons / Study Materials by id (standalone lookups) ----

export async function getLessonsForSubtopic(
  subjectSlug: string,
  topicSlug: string,
  subtopicSlug: string,
): Promise<
  { id: string; title: BilingualText; type: string; durationSeconds: number }[]
> {
  const subject = await requireSubject(subjectSlug)
  const topic = await requireTopic(subject, topicSlug)
  const subtopic = await requireSubtopic(topic, subtopicSlug)
  const lessons = await lessonRepository.findBySubtopic(subtopic._id)
  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    durationSeconds: lesson.video?.durationSeconds ?? 0,
  }))
}

export async function getLessonById(lessonId: string) {
  const lesson = await lessonRepository.findById(lessonId)
  if (!lesson) throw ApiError.notFound('Lesson not found')
  return lesson
}

export async function getStudyMaterialById(studyMaterialId: string) {
  const studyMaterial = await studyMaterialRepository.findById(studyMaterialId)
  if (!studyMaterial) throw ApiError.notFound('Study material not found')
  return studyMaterial
}

// ---- Media (content_editor/admin only, see routes/studyMaterials.routes.ts) ----

const STUDY_MATERIAL_FILE_FOLDER = 'nalanda/study-materials'

async function requireStudyMaterial(id: string) {
  const studyMaterial = await studyMaterialRepository.findById(id)
  if (!studyMaterial) throw ApiError.notFound('Study material not found')
  return studyMaterial
}

export async function uploadStudyMaterialFile(id: string, file: Express.Multer.File) {
  const studyMaterial = await requireStudyMaterial(id)
  const previousPublicId = studyMaterial.filePublicId
  const previousResourceType = studyMaterial.fileResourceType

  const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image'
  const uploaded = await cloudinaryUploadService.uploadBuffer(file.buffer, {
    folder: STUDY_MATERIAL_FILE_FOLDER,
    resourceType,
  })

  const updated = await studyMaterialRepository.updateFile(id, {
    fileUrl: uploaded.secureUrl,
    filePublicId: uploaded.publicId,
    fileResourceType: resourceType,
    fileFormat: uploaded.format,
    fileBytes: uploaded.bytes,
  })
  if (!updated) throw ApiError.notFound('Study material not found')

  if (previousPublicId && previousResourceType) {
    await cloudinaryUploadService.deleteAsset(previousPublicId, previousResourceType)
  }

  return updated
}

export async function removeStudyMaterialFile(id: string) {
  const studyMaterial = await requireStudyMaterial(id)

  if (studyMaterial.filePublicId && studyMaterial.fileResourceType) {
    await cloudinaryUploadService.deleteAsset(
      studyMaterial.filePublicId,
      studyMaterial.fileResourceType,
    )
  }

  const updated = await studyMaterialRepository.clearFile(id)
  if (!updated) throw ApiError.notFound('Study material not found')
  return updated
}

// ---- Search ----

export async function search(
  query: string,
  examCategory: ExamCategoryCode | undefined,
  lang: DisplayLanguage,
): Promise<LearnSearchResultDTO[]> {
  const examId = await resolveExamId(examCategory)
  const regex = new RegExp(escapeRegex(query), 'i')

  const [subjects, topics, subtopics] = await Promise.all([
    subjectRepository.search(regex, examId),
    topicRepository.search(regex, examId),
    subtopicRepository.search(regex, examId),
  ])

  const subjectById = new Map(subjects.map((s) => [s._id.toString(), s]))
  const results: LearnSearchResultDTO[] = []

  for (const subject of subjects) {
    results.push({
      type: 'subject',
      id: subject.slug,
      label: pickText(subject.name, lang),
      context: 'Subject',
      subjectId: subject.slug,
    })
  }

  // Topics/subtopics need their parent chain resolved for slugs+labels —
  // fetch whatever parents aren't already in hand from the subject search.
  const neededSubjectIds = new Set(
    [
      ...topics.map((t) => t.subjectId.toString()),
      ...subtopics.map((s) => s.subjectId.toString()),
    ].filter((id) => !subjectById.has(id)),
  )
  if (neededSubjectIds.size > 0) {
    const extraSubjects = await Promise.all(
      [...neededSubjectIds].map((id) => subjectRepository.findById(id)),
    )
    for (const s of extraSubjects) {
      if (s) subjectById.set(s._id.toString(), s)
    }
  }

  for (const topic of topics) {
    const parentSubject = subjectById.get(topic.subjectId.toString())
    if (!parentSubject) continue
    results.push({
      type: 'topic',
      id: topic.slug,
      label: pickText(topic.name, lang),
      context: pickText(parentSubject.name, lang),
      subjectId: parentSubject.slug,
    })
  }

  const topicIds = [...new Set(subtopics.map((s) => s.topicId.toString()))]
  const topicById = new Map(
    (await Promise.all(topicIds.map((id) => topicRepository.findById(id))))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => [t._id.toString(), t]),
  )

  for (const subtopic of subtopics) {
    const parentSubject = subjectById.get(subtopic.subjectId.toString())
    const parentTopic = topicById.get(subtopic.topicId.toString())
    if (!parentSubject || !parentTopic) continue
    results.push({
      type: 'subtopic',
      id: subtopic.slug,
      label: pickText(subtopic.name, lang),
      context: `${pickText(parentSubject.name, lang)} · ${pickText(parentTopic.name, lang)}`,
      subjectId: parentSubject.slug,
      topicId: parentTopic.slug,
      subtopicId: subtopic.slug,
    })
  }

  return results.slice(0, 20)
}

/** Exported for `search.service.ts`'s Global Search autocomplete (Sprint 4
 * Step 63), which builds its own word-prefix regex the same way. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---- Cross-module handoff: resolve a bare subtopic slug to its parent
// chain (Practice's "Practice This Topic" pre-filter, docs/Learn_Module.md
// §6) — subtopic slugs are unique across the whole tree, same assumption
// the old frontend mock (`findSubtopicLocation`) already made. ----

export async function findSubtopicLocation(
  subtopicSlug: string,
  lang: DisplayLanguage,
): Promise<SubtopicLocationDTO | null> {
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic) return null
  const [subject, topic] = await Promise.all([
    subjectRepository.findById(subtopic.subjectId),
    topicRepository.findById(subtopic.topicId),
  ])
  if (!subject || !topic) return null
  return {
    subjectId: subject.slug,
    subjectName: pickText(subject.name, lang),
    topicId: topic.slug,
    topicName: pickText(topic.name, lang),
  }
}

// ---- Exams ----

export interface ExamDTO {
  id: string
  code: string
  name: string
  icon: string | null
  order: number
}

function toExamDTO(exam: ExamDocument, lang: DisplayLanguage): ExamDTO {
  return {
    id: exam.code,
    code: exam.code,
    name: pickText(exam.name, lang),
    icon: exam.icon ?? null,
    order: exam.order,
  }
}

export async function getExams(lang: DisplayLanguage): Promise<ExamDTO[]> {
  const exams = await examRepository.findAllActive()
  return exams.map((exam) => toExamDTO(exam, lang))
}
