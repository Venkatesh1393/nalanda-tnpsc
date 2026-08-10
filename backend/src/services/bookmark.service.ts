import type { Types } from 'mongoose'

import type { BookmarkContentType } from '../constants/bookmarks'
import type { BookmarkDocument } from '../models/Bookmark.model'
import * as bookmarkRepository from '../repositories/bookmark.repository'
import * as currentAffairRepository from '../repositories/currentAffair.repository'
import * as lessonRepository from '../repositories/lesson.repository'
import * as questionRepository from '../repositories/question.repository'
import * as studyMaterialRepository from '../repositories/studyMaterial.repository'
import * as subjectRepository from '../repositories/subject.repository'
import * as subtopicRepository from '../repositories/subtopic.repository'
import * as topicRepository from '../repositories/topic.repository'
import { ApiError } from '../utils/ApiError'
import type { CreateBookmarkBody } from '../validators/bookmark.validator'
import { pickText, type DisplayLanguage } from './learn.service'

export interface LearnBookmarkDTO {
  id: string
  contentType: BookmarkContentType
  /** The raw target document's own id — for `question`/`current_affairs`
   * bookmarks this is the only field the frontend can match "is this exact
   * item bookmarked?" against (neither has a subtopic-slug identity the way
   * lesson/study_material do). */
  contentId: string
  title: string
  /** `'Current Affairs'` for `current_affairs` bookmarks (no Learn subject
   * hierarchy applies) — never blank, so the existing Bookmarks card
   * caption always has something to show. */
  subjectName: string
  topicName: string
  /** Omitted (not just empty-string) for content with no Learn hierarchy
   * home — `current_affairs` bookmarks. `features/learn/components/
   * bookmarks-list.tsx` already only deep-links via these three when all
   * are present, and separately falls back to `contentId` (surfaced as
   * `subtopicId` below, matching the frontend's existing "subtopicId holds
   * the article id directly" convention for non-Learn content) for
   * `current-affairs`. */
  subjectId?: string
  topicId?: string
  subtopicId: string
  personalNote: string | null
  createdAt: string
}

/** Resolves `(subtopicSlug, contentType)` — the shape the frontend still
 * deals in (Step 44/45's "don't redesign the UI" — subtopic slugs, never
 * raw Mongo ids) — to the actual `Lesson`/`StudyMaterial` document that is
 * the subtopic's primary content of that type, since `Bookmark.contentId`
 * is a real, single-document reference, not a subtopic reference. */
async function resolvePrimaryContentId(
  subtopicSlug: string,
  contentType: 'lesson' | 'study_material',
): Promise<Types.ObjectId> {
  const subtopic = await subtopicRepository.findBySlug(subtopicSlug)
  if (!subtopic) throw ApiError.notFound('Subtopic not found')

  if (contentType === 'lesson') {
    const lesson = await lessonRepository.findPrimaryForSubtopic(subtopic._id, 'video')
    if (!lesson) throw ApiError.badRequest('This subtopic has no video to bookmark.')
    return lesson._id
  }

  const studyMaterial = await studyMaterialRepository.findPrimaryForSubtopic(subtopic._id)
  if (!studyMaterial) throw ApiError.badRequest('This subtopic has no notes to bookmark.')
  return studyMaterial._id
}

/** Resolves whichever shape of `CreateBookmarkBody` was sent to the actual
 * `(contentType, contentId)` pair `Bookmark` stores — a real Question `_id`
 * for `question`, or the subtopic's primary Lesson/StudyMaterial doc for
 * the other two types. */
async function resolveContentId(
  body: CreateBookmarkBody,
): Promise<{ contentType: BookmarkContentType; contentId: Types.ObjectId }> {
  if (body.contentType === 'question') {
    const question = await questionRepository.findById(body.questionId)
    if (!question) throw ApiError.notFound('Question not found')
    return { contentType: 'question', contentId: question._id }
  }
  if (body.contentType === 'current_affairs') {
    const article = await currentAffairRepository.findById(body.currentAffairId)
    if (!article) throw ApiError.notFound('Current affairs article not found')
    return { contentType: 'current_affairs', contentId: article._id }
  }
  const contentId = await resolvePrimaryContentId(body.subtopicSlug, body.contentType)
  return { contentType: body.contentType, contentId }
}

/** Idempotent create — a duplicate `POST /bookmarks` for the same content
 * returns the existing bookmark rather than throwing `ALREADY_BOOKMARKED`,
 * since the frontend's own `toggleBookmark` contract (return the resulting
 * bookmarked state) never needs that as a hard error. */
export async function createBookmark(
  userId: string,
  body: CreateBookmarkBody,
): Promise<{ bookmarkId: string; createdAt: string }> {
  const { contentType, contentId } = await resolveContentId(body)
  const existing = await bookmarkRepository.findOne(userId, contentType, contentId)
  if (existing) {
    return { bookmarkId: existing.id, createdAt: existing.createdAt.toISOString() }
  }
  const bookmark = await bookmarkRepository.create(
    userId,
    contentType,
    contentId,
    body.note,
  )
  return { bookmarkId: bookmark.id, createdAt: bookmark.createdAt.toISOString() }
}

/** Backs the frontend's `toggleBookmark(): Promise<boolean>` — creates if
 * absent, removes if present, returns the resulting bookmarked state.
 * Prevents duplicate bookmarks via `Bookmark`'s own unique compound index
 * as the final guarantee, on top of this read-then-write check. */
export async function toggleBookmark(
  userId: string,
  body: CreateBookmarkBody,
): Promise<boolean> {
  const { contentType, contentId } = await resolveContentId(body)
  const existing = await bookmarkRepository.findOne(userId, contentType, contentId)
  if (existing) {
    await bookmarkRepository.removeById(userId, existing._id)
    return false
  }
  await bookmarkRepository.create(userId, contentType, contentId, body.note)
  return true
}

export async function removeBookmark(userId: string, bookmarkId: string): Promise<void> {
  const removed = await bookmarkRepository.removeById(userId, bookmarkId)
  if (!removed) throw ApiError.notFound('Bookmark not found')
}

async function toBookmarkDTO(
  bookmark: BookmarkDocument,
  lang: DisplayLanguage,
): Promise<LearnBookmarkDTO | null> {
  if (bookmark.contentType === 'question') {
    const question = await questionRepository.findById(bookmark.contentId)
    if (!question) return null
    const [subject, topic, subtopic] = await Promise.all([
      subjectRepository.findById(question.subjectId),
      topicRepository.findById(question.topicId),
      subtopicRepository.findById(question.subtopicId),
    ])
    if (!subject || !topic || !subtopic) return null

    return {
      id: bookmark.id,
      contentType: 'question',
      contentId: question._id.toString(),
      title: pickText(question.questionText, lang).slice(0, 120),
      subjectName: pickText(subject.name, lang),
      topicName: pickText(topic.name, lang),
      subjectId: subject.slug,
      topicId: topic.slug,
      subtopicId: subtopic.slug,
      personalNote: bookmark.note ?? null,
      createdAt: bookmark.createdAt.toISOString(),
    }
  }

  if (bookmark.contentType === 'current_affairs') {
    const article = await currentAffairRepository.findById(bookmark.contentId)
    if (!article) return null
    return {
      id: bookmark.id,
      contentType: 'current_affairs',
      contentId: article.id,
      title: pickText(article.title, lang),
      subjectName: 'Current Affairs',
      topicName: article.category,
      // No Learn hierarchy applies — `subtopicId` carries the article's own
      // id instead, matching `bookmarks-list.tsx`'s existing convention for
      // non-Learn content (`ToggleBookmarkInput`'s doc comment).
      subtopicId: article.id,
      personalNote: bookmark.note ?? null,
      createdAt: bookmark.createdAt.toISOString(),
    }
  }

  if (bookmark.contentType !== 'lesson' && bookmark.contentType !== 'study_material') {
    return null
  }

  const content =
    bookmark.contentType === 'lesson'
      ? await lessonRepository.findById(bookmark.contentId)
      : await studyMaterialRepository.findById(bookmark.contentId)
  if (!content) return null

  const subtopic = await subtopicRepository.findById(content.subtopicId)
  if (!subtopic) return null
  const [subject, topic] = await Promise.all([
    subjectRepository.findById(subtopic.subjectId),
    topicRepository.findById(subtopic.topicId),
  ])
  if (!subject || !topic) return null

  return {
    id: bookmark.id,
    contentType: bookmark.contentType,
    contentId: bookmark.contentId.toString(),
    title: pickText(content.title, lang),
    subjectName: pickText(subject.name, lang),
    topicName: pickText(topic.name, lang),
    subjectId: subject.slug,
    topicId: topic.slug,
    subtopicId: subtopic.slug,
    personalNote: bookmark.note ?? null,
    createdAt: bookmark.createdAt.toISOString(),
  }
}

export async function listBookmarks(
  userId: string,
  lang: DisplayLanguage,
  contentType?: BookmarkContentType,
): Promise<LearnBookmarkDTO[]> {
  const bookmarks = await bookmarkRepository.findByUser(userId, contentType)
  const dtos = await Promise.all(
    bookmarks.map((bookmark) => toBookmarkDTO(bookmark, lang)),
  )
  return dtos.filter((dto): dto is LearnBookmarkDTO => dto !== null)
}
