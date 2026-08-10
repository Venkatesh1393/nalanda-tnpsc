import type { Request, Response } from 'express'

import type { ExamCategoryCode } from '../constants/exam'
import * as learnService from '../services/learn.service'
import { ApiError } from '../utils/ApiError'
import { sendSuccess } from '../utils/ApiResponse'
import { resolveDisplayLanguage } from '../utils/language'

export async function getExams(req: Request, res: Response): Promise<void> {
  const lang = resolveDisplayLanguage(req)
  const exams = await learnService.getExams(lang)
  sendSuccess(res, exams)
}

export async function getSubjects(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const examCategory = req.query.examCategory as ExamCategoryCode | undefined
  const subjects = await learnService.getSubjects(req.user.sub, examCategory, lang)
  sendSuccess(res, subjects)
}

export async function getSubject(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '' } = req.params
  const subject = await learnService.getSubjectBySlug(subjectSlug, req.user.sub, lang)
  if (!subject) throw ApiError.notFound('Subject not found')
  sendSuccess(res, subject)
}

export async function getTopics(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '' } = req.params
  const topics = await learnService.getTopics(subjectSlug, req.user.sub, lang)
  sendSuccess(res, topics)
}

export async function getSubtopics(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '', topicSlug = '' } = req.params
  const subtopics = await learnService.getSubtopics(
    subjectSlug,
    topicSlug,
    req.user.sub,
    lang,
  )
  sendSuccess(res, subtopics)
}

export async function getLessonDetail(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '', topicSlug = '', subtopicSlug = '' } = req.params
  const detail = await learnService.getLessonDetail(
    subjectSlug,
    topicSlug,
    subtopicSlug,
    req.user.sub,
    lang,
  )
  // `null` (not a 404) when the hierarchy doesn't resolve — matches the
  // old frontend mock's contract exactly, letting the existing
  // `LessonOverview` component's "couldn't be found" EmptyState branch
  // keep working unchanged rather than needing new error-handling.
  sendSuccess(res, detail)
}

export async function getLessons(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const { subjectSlug = '', topicSlug = '', subtopicSlug = '' } = req.params
  const lessons = await learnService.getLessonsForSubtopic(
    subjectSlug,
    topicSlug,
    subtopicSlug,
  )
  sendSuccess(res, lessons)
}

export async function getVideo(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '', topicSlug = '', subtopicSlug = '' } = req.params
  const video = await learnService.getVideoLesson(
    subjectSlug,
    topicSlug,
    subtopicSlug,
    req.user.sub,
    lang,
  )
  sendSuccess(res, video)
}

export async function getNotes(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subjectSlug = '', topicSlug = '', subtopicSlug = '' } = req.params
  const notes = await learnService.getStudyNotes(
    subjectSlug,
    topicSlug,
    subtopicSlug,
    req.user.sub,
    req.user.subscriptionTier,
    lang,
  )
  sendSuccess(res, notes)
}

export async function search(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const q = String(req.query.q ?? '')
  const examCategory = req.query.examCategory as ExamCategoryCode | undefined
  const results = await learnService.search(q, examCategory, lang)
  sendSuccess(res, results)
}

export async function getSubtopicLocation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized()
  const lang = resolveDisplayLanguage(req)
  const { subtopicSlug = '' } = req.params
  const location = await learnService.findSubtopicLocation(subtopicSlug, lang)
  sendSuccess(res, location)
}
