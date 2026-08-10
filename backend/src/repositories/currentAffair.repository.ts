import type { Types } from 'mongoose'

import type {
  CurrentAffairsCategory,
  CurrentAffairsPeriod,
} from '../constants/currentAffairs'
import type { ICurrentAffair } from '../models/CurrentAffair.model'
import { CurrentAffair, type CurrentAffairDocument } from '../models/CurrentAffair.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'

export interface ListFilter {
  period: CurrentAffairsPeriod
  category?: CurrentAffairsCategory
  month?: string // YYYY-MM
}

/** The "is this publicly visible right now" gate every student-facing query
 * below shares — `isActive: true` (the master on/off switch, same
 * convention as every other content model) AND not scheduled for the
 * future (Step 54's `publishAt`). A function, not a static object, since it
 * needs `now` — every call site passes a fresh `new Date()` rather than a
 * value computed once and reused across a long-lived process. Every
 * article seeded before Step 54 has `publishAt` genuinely absent, so the
 * `$exists: false` branch keeps them exactly as visible as before —
 * zero behavior change for pre-existing content. */
/** Exported for `search.repository.ts`'s Global Search fan-out (Sprint 4
 * Step 63), which needs this exact "publicly visible right now" gate
 * alongside its own `$text` clause. */
export function buildActiveFilter(now: Date): Record<string, unknown> {
  return {
    isActive: true,
    ...notDeletedFilter,
    $or: [
      { publishAt: { $exists: false } },
      { publishAt: null },
      { publishAt: { $lte: now } },
    ],
  }
}

function monthRange(month: string): { $gte: Date; $lt: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year!, mon! - 1, 1))
  const end = new Date(Date.UTC(year!, mon!, 1))
  return { $gte: start, $lt: end }
}

export async function findList(
  filter: ListFilter,
  page: number,
  limit: number,
): Promise<{ items: CurrentAffairDocument[]; total: number }> {
  const query: Record<string, unknown> = {
    ...buildActiveFilter(new Date()),
    period: filter.period,
    ...(filter.category && { category: filter.category }),
    ...(filter.month && { date: monthRange(filter.month) }),
  }
  const [items, total] = await Promise.all([
    CurrentAffair.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CurrentAffair.countDocuments(query),
  ])
  return { items, total }
}

/** Every article published in a given `YYYY-MM` month, any `period` — an
 * archive naturally aggregates everything published that month, not just
 * entries authored as "monthly capsules" (mirrors the frontend mock's
 * `getArchiveForMonth` semantics exactly). */
export function findByMonth(month: string): Promise<CurrentAffairDocument[]> {
  return CurrentAffair.find({
    ...buildActiveFilter(new Date()),
    date: monthRange(month),
  }).sort({
    date: -1,
  })
}

export interface ArchiveMonthRow {
  key: string
  count: number
}

export async function findArchiveMonths(): Promise<ArchiveMonthRow[]> {
  const rows = await CurrentAffair.aggregate<{ _id: string; count: number }>([
    { $match: buildActiveFilter(new Date()) },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ])
  return rows.map((row) => ({ key: row._id, count: row.count }))
}

export function findRecentDaily(limit: number): Promise<CurrentAffairDocument[]> {
  return CurrentAffair.find({ ...buildActiveFilter(new Date()), period: 'daily' })
    .sort({ date: -1 })
    .limit(limit)
}

export function findById(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOne({ _id: id, ...buildActiveFilter(new Date()) })
}

/** Sets the article's image to a freshly-uploaded Cloudinary asset — always
 * both fields together, since an `imageUrl` without its `imagePublicId`
 * could never be deleted/replaced again. Scoped to `notDeletedFilter` only
 * (not the full publish-visibility gate) so a content editor can attach an
 * image to a draft/scheduled article before it ever goes live. */
export function updateImage(
  id: Types.ObjectId | string,
  image: { imageUrl: string; imagePublicId: string },
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: image },
    { new: true },
  )
}

export function clearImage(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $unset: { imageUrl: '', imagePublicId: '' } },
    { new: true },
  )
}

export function search(regex: RegExp): Promise<CurrentAffairDocument[]> {
  return CurrentAffair.find({
    $and: [
      buildActiveFilter(new Date()),
      {
        $or: [
          { 'title.en': regex },
          { 'title.ta': regex },
          { examRelevanceTags: regex },
          { tags: regex },
        ],
      },
    ],
  })
    .sort({ date: -1 })
    .limit(20)
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------

export function create(data: Partial<ICurrentAffair>): Promise<CurrentAffairDocument> {
  return CurrentAffair.create(data)
}

/** Admin-only read — no `isActive`/`publishAt` gate, so a draft or
 * scheduled-for-the-future article is still viewable/editable. */
export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findById(id)
}

/** Applies a partial update via `.save()` — same reasoning as
 * `question.repository.ts`'s `updateById`: cross-field/custom validators
 * need the real, fully-merged document, not an update-query context. */
export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<ICurrentAffair>,
): Promise<CurrentAffairDocument | null> {
  const article = await CurrentAffair.findOne({ _id: id, ...notDeletedFilter })
  if (!article) return null
  Object.assign(article, data)
  await article.save()
  return article
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(
  id: Types.ObjectId | string,
): Promise<CurrentAffairDocument | null> {
  return CurrentAffair.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminCurrentAffairListFilter {
  search?: string
  period?: CurrentAffairsPeriod
  category?: CurrentAffairsCategory
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminCurrentAffairListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}

  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }

  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'title.en': regex }, { 'title.ta': regex }]
  }
  if (filter.period) query.period = filter.period
  if (filter.category) query.category = filter.category

  return query
}

export async function listForAdmin(
  filter: AdminCurrentAffairListFilter,
  page: number,
  limit: number,
): Promise<{ items: CurrentAffairDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    CurrentAffair.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CurrentAffair.countDocuments(query),
  ])
  return { items, total }
}
