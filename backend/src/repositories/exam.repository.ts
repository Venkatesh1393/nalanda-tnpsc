import type { Types } from 'mongoose'

import type { ExamCategoryCode } from '../constants/exam'
import { Exam, type ExamDocument, type IExam } from '../models/Exam.model'

export function findByCodes(codes: ExamCategoryCode[]): Promise<ExamDocument[]> {
  return Exam.find({ code: { $in: codes } })
}

export function findByCode(code: ExamCategoryCode): Promise<ExamDocument | null> {
  return Exam.findOne({ code })
}

export function findById(id: Types.ObjectId | string): Promise<ExamDocument | null> {
  return Exam.findById(id)
}

export function findAllActive(): Promise<ExamDocument[]> {
  return Exam.find({ isActive: true }).sort({ order: 1 })
}

// --- Admin CRUD (Sprint 4 Step 54) --- Exam has no soft-delete plugin (see
// `Exam.model.ts`'s header comment) — only activate/deactivate applies, no
// archive/restore. `findById` above already has no `isActive` filter, so it
// doubles as the admin read.

export function create(data: Partial<IExam>): Promise<ExamDocument> {
  return Exam.create(data)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<IExam>,
): Promise<ExamDocument | null> {
  const exam = await Exam.findById(id)
  if (!exam) return null
  Object.assign(exam, data)
  await exam.save()
  return exam
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<ExamDocument | null> {
  return Exam.findByIdAndUpdate(id, { $set: { isActive } }, { new: true })
}

export interface AdminExamListFilter {
  search?: string
  status?: 'active' | 'inactive'
}

function buildAdminQuery(filter: AdminExamListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status) query.isActive = filter.status === 'active'
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'name.en': regex }, { 'name.ta': regex }, { code: regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminExamListFilter,
  page: number,
  limit: number,
): Promise<{ items: ExamDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    Exam.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Exam.countDocuments(query),
  ])
  return { items, total }
}
