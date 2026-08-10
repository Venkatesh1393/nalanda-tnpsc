import { GAMIFICATION_CONFIG } from '../config/gamification.config'
import * as bookmarkRepository from '../repositories/bookmark.repository'
import * as currentAffairRepository from '../repositories/currentAffair.repository'
import type { ListFilter } from '../repositories/currentAffair.repository'
import * as currentAffairReadRepository from '../repositories/currentAffairRead.repository'
import * as questionRepository from '../repositories/question.repository'
import { ApiError } from '../utils/ApiError'
import * as gamificationService from './gamification.service'
import { pickText, type DisplayLanguage } from './learn.service'
import * as cloudinaryUploadService from './media/cloudinaryUpload.service'
import type {
  CurrentAffairDocument,
  ICurrentAffairQuizQuestion,
} from '../models/CurrentAffair.model'

const EXCERPT_MAX_LENGTH = 140

export interface PreviewItemDTO {
  id: string
  date: string
  title: string
  excerpt: string
  tags: string[]
}

export interface CurrentAffairItemDTO {
  id: string
  date: string
  period: string
  category: string
  title: string
  excerpt: string
  body: string[]
  highlights: string[]
  examRelevanceTags: string[]
  tags: string[]
  isImportant: boolean
  imageUrl: string | null
  imageAlt: string | null
  quizAvailable: boolean
  isBookmarked: boolean
}

export interface QuizQuestionDTO {
  id: string
  questionText: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation: string
}

export interface ArchiveMonthDTO {
  key: string
  label: string
  count: number
}

export interface SearchResultDTO {
  id: string
  title: string
  excerpt: string
  date: string
  category: string
}

export interface RelatedQuestionDTO {
  id: string
  questionText: string
  difficulty: string
}

function excerptOf(article: CurrentAffairDocument, lang: DisplayLanguage): string {
  const authored = article.excerpt ? pickText(article.excerpt, lang) : ''
  if (authored) return authored
  const firstParagraph = article.body[lang]?.[0] ?? article.body.en[0] ?? ''
  return firstParagraph.length > EXCERPT_MAX_LENGTH
    ? `${firstParagraph.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}…`
    : firstParagraph
}

function toPreviewDTO(
  article: CurrentAffairDocument,
  lang: DisplayLanguage,
): PreviewItemDTO {
  return {
    id: article.id,
    date: article.date.toISOString(),
    title: pickText(article.title, lang),
    excerpt: excerptOf(article, lang),
    tags: article.examRelevanceTags.slice(0, 2),
  }
}

async function toItemDTO(
  article: CurrentAffairDocument,
  lang: DisplayLanguage,
  userId: string | undefined,
): Promise<CurrentAffairItemDTO> {
  const isBookmarked = userId
    ? Boolean(await bookmarkRepository.findOne(userId, 'current_affairs', article._id))
    : false

  return {
    id: article.id,
    date: article.date.toISOString(),
    period: article.period,
    category: article.category,
    title: pickText(article.title, lang),
    excerpt: excerptOf(article, lang),
    body: article.body[lang]?.length ? article.body[lang] : article.body.en,
    highlights: article.highlights[lang]?.length
      ? article.highlights[lang]
      : article.highlights.en,
    examRelevanceTags: article.examRelevanceTags,
    tags: article.tags,
    isImportant: article.isImportant,
    imageUrl: article.imageUrl ?? null,
    imageAlt: article.imageAlt ?? null,
    quizAvailable: article.quizQuestions.length > 0,
    isBookmarked,
  }
}

function toQuizQuestionDTO(
  question: ICurrentAffairQuizQuestion,
  lang: DisplayLanguage,
): QuizQuestionDTO {
  return {
    id: question.questionId,
    questionText: pickText(question.questionText, lang),
    options: question.options.map((option) => ({
      id: option.optionId,
      text: pickText(option.text, lang),
    })),
    correctOptionId: question.correctOptionId,
    explanation: pickText(question.explanation, lang),
  }
}

export async function getPreview(
  limit: number,
  lang: DisplayLanguage,
): Promise<PreviewItemDTO[]> {
  const articles = await currentAffairRepository.findRecentDaily(limit)
  return articles.map((article) => toPreviewDTO(article, lang))
}

export async function getList(
  filter: ListFilter,
  page: number,
  limit: number,
  lang: DisplayLanguage,
  userId: string | undefined,
): Promise<{ items: CurrentAffairItemDTO[]; total: number }> {
  const { items, total } = await currentAffairRepository.findList(filter, page, limit)
  const dtos = await Promise.all(items.map((article) => toItemDTO(article, lang, userId)))
  return { items: dtos, total }
}

async function requireArticle(id: string): Promise<CurrentAffairDocument> {
  const article = await currentAffairRepository.findById(id)
  if (!article) throw ApiError.notFound('Current affairs article not found')
  return article
}

export async function getDetail(
  id: string,
  lang: DisplayLanguage,
  userId: string | undefined,
): Promise<CurrentAffairItemDTO> {
  const article = await requireArticle(id)
  return toItemDTO(article, lang, userId)
}

/**
 * `POST /current-affairs/:id/read` (Sprint 4 Step 61) — records that this
 * student has read this article and awards XP the first time only, backed
 * by `CurrentAffairRead`'s unique index (previously `readProgressPercent`
 * was an explicitly local-only frontend concept with no backend signal at
 * all — see `frontend/src/services/currentAffairsService.ts`'s header
 * comment). A second call for the same article is a harmless no-op, never
 * a duplicate award.
 */
export async function markAsRead(
  userId: string,
  id: string,
): Promise<{ alreadyRead: boolean }> {
  const article = await requireArticle(id)
  const recorded = await currentAffairReadRepository.recordIfNew(userId, article._id)
  if (!recorded) return { alreadyRead: true }

  await gamificationService.awardXp(userId, {
    reason: 'current_affairs_reading',
    xpAmount: GAMIFICATION_CONFIG.xp.currentAffairsReading,
    coinsAmount: GAMIFICATION_CONFIG.coins.currentAffairsReading,
    refId: article._id,
  })
  return { alreadyRead: false }
}

export async function getQuiz(
  id: string,
  lang: DisplayLanguage,
): Promise<QuizQuestionDTO[]> {
  const article = await requireArticle(id)
  return article.quizQuestions.map((question) => toQuizQuestionDTO(question, lang))
}

/** "Related questions" — real TNPSC-syllabus `Question` docs this article
 * links to (`quizQuestionIds`), sanitized the same way Practice's own
 * question DTOs are (never a correct-answer leak) since these are real,
 * gradeable syllabus questions a student might practice, not the article's
 * own self-contained comprehension quiz above. */
export async function getRelatedQuestions(
  id: string,
  lang: DisplayLanguage,
): Promise<RelatedQuestionDTO[]> {
  const article = await requireArticle(id)
  if (article.quizQuestionIds.length === 0) return []
  const questions = await questionRepository.findByIds(article.quizQuestionIds)
  return questions.map((question) => ({
    id: question._id.toString(),
    questionText: pickText(question.questionText, lang),
    difficulty: question.difficulty,
  }))
}

export async function search(
  query: string,
  lang: DisplayLanguage,
): Promise<SearchResultDTO[]> {
  const normalized = query.trim()
  if (normalized.length < 2) return []
  const regex = new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const articles = await currentAffairRepository.search(regex)
  return articles.map((article) => ({
    id: article.id,
    title: pickText(article.title, lang),
    excerpt: excerptOf(article, lang),
    date: article.date.toISOString(),
    category: article.category,
  }))
}

export async function getArchiveMonths(): Promise<ArchiveMonthDTO[]> {
  const rows = await currentAffairRepository.findArchiveMonths()
  return rows.map((row) => ({
    key: row.key,
    label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
      new Date(`${row.key}-01T00:00:00Z`),
    ),
    count: row.count,
  }))
}

export async function getArchiveForMonth(
  month: string,
  lang: DisplayLanguage,
  userId: string | undefined,
): Promise<CurrentAffairItemDTO[]> {
  const articles = await currentAffairRepository.findByMonth(month)
  return Promise.all(articles.map((article) => toItemDTO(article, lang, userId)))
}

// ---- Media (content_editor/admin only, see routes/currentAffairs.routes.ts) ----

const CURRENT_AFFAIRS_IMAGE_FOLDER = 'nalanda/current-affairs'

export async function uploadImage(
  id: string,
  file: Express.Multer.File,
): Promise<CurrentAffairDocument> {
  const article = await requireArticle(id)
  const previousPublicId = article.imagePublicId

  const uploaded = await cloudinaryUploadService.uploadBuffer(file.buffer, {
    folder: CURRENT_AFFAIRS_IMAGE_FOLDER,
    resourceType: 'image',
  })

  const updated = await currentAffairRepository.updateImage(id, {
    imageUrl: uploaded.secureUrl,
    imagePublicId: uploaded.publicId,
  })
  if (!updated) throw ApiError.notFound('Current affairs article not found')

  if (previousPublicId) {
    await cloudinaryUploadService.deleteAsset(previousPublicId, 'image')
  }

  return updated
}

export async function removeImage(id: string): Promise<CurrentAffairDocument> {
  const article = await requireArticle(id)

  if (article.imagePublicId) {
    await cloudinaryUploadService.deleteAsset(article.imagePublicId, 'image')
  }

  const updated = await currentAffairRepository.clearImage(id)
  if (!updated) throw ApiError.notFound('Current affairs article not found')
  return updated
}
