import type { Types } from 'mongoose'

import type { IStudyMaterial } from '../models/StudyMaterial.model'
import { notDeletedFilter } from '../models/shared/softDelete.plugin'
import { StudyMaterial, type StudyMaterialDocument } from '../models/StudyMaterial.model'

export function findBySubtopic(
  subtopicId: Types.ObjectId | string,
): Promise<StudyMaterialDocument[]> {
  return StudyMaterial.find({ subtopicId, isActive: true, ...notDeletedFilter }).sort({
    createdAt: 1,
  })
}

/** The subtopic's primary study material — current content is 1:1
 * subtopic→notes, same "lowest-order/earliest match, never assumes
 * uniqueness" approach as `lesson.repository.ts`'s `findPrimaryForSubtopic`. */
export function findPrimaryForSubtopic(
  subtopicId: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOne({ subtopicId, isActive: true, ...notDeletedFilter }).sort({
    createdAt: 1,
  })
}

export function findById(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOne({ _id: id, isActive: true, ...notDeletedFilter })
}

/** Sets the material's file to a freshly-uploaded Cloudinary asset — always
 * the full metadata set together, since a `fileUrl` without its
 * `filePublicId`/`fileResourceType` could never be deleted/replaced again. */
export function updateFile(
  id: Types.ObjectId | string,
  file: {
    fileUrl: string
    filePublicId: string
    fileResourceType: 'image' | 'raw'
    fileFormat: string
    fileBytes: number
  },
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOneAndUpdate(
    { _id: id, isActive: true, ...notDeletedFilter },
    { $set: file },
    { new: true },
  )
}

export function clearFile(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOneAndUpdate(
    { _id: id, isActive: true, ...notDeletedFilter },
    {
      $unset: {
        fileUrl: '',
        filePublicId: '',
        fileResourceType: '',
        fileFormat: '',
        fileBytes: '',
      },
    },
    { new: true },
  )
}

/** Active, non-deleted count for a subtopic — Step 54's orphan-prevention
 * check before a Subtopic can be deactivated/archived. */
export function countBySubtopic(subtopicId: Types.ObjectId | string): Promise<number> {
  return StudyMaterial.countDocuments({ subtopicId, isActive: true, ...notDeletedFilter })
}

// --- Admin CRUD (Sprint 4 Step 54) ---------------------------------------
//
// `updateFile`/`clearFile` above (Step 50) remain the only way to
// attach/replace/remove the Cloudinary asset — these add the plain-metadata
// record lifecycle that never existed before (only seeded data had a
// `StudyMaterial` document at all until now).

export function create(data: Partial<IStudyMaterial>): Promise<StudyMaterialDocument> {
  return StudyMaterial.create(data)
}

export function findByIdForAdmin(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOne({ _id: id, ...notDeletedFilter })
}

export function findByIdIncludingArchived(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findById(id)
}

export async function updateById(
  id: Types.ObjectId | string,
  data: Partial<IStudyMaterial>,
): Promise<StudyMaterialDocument | null> {
  const material = await StudyMaterial.findOne({ _id: id, ...notDeletedFilter })
  if (!material) return null
  Object.assign(material, data)
  await material.save()
  return material
}

export function updateActiveStatus(
  id: Types.ObjectId | string,
  isActive: boolean,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { isActive } },
    { new: true },
  )
}

export function archive(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOneAndUpdate(
    { _id: id, ...notDeletedFilter },
    { $set: { deletedAt: new Date() } },
    { new: true },
  )
}

export function restore(
  id: Types.ObjectId | string,
): Promise<StudyMaterialDocument | null> {
  return StudyMaterial.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  )
}

export interface AdminStudyMaterialListFilter {
  search?: string
  subtopicId?: Types.ObjectId | string
  status?: 'active' | 'inactive' | 'archived'
}

function buildAdminQuery(filter: AdminStudyMaterialListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {}
  if (filter.status === 'archived') {
    query.deletedAt = { $ne: null }
  } else {
    query.deletedAt = null
    if (filter.status === 'active') query.isActive = true
    else if (filter.status === 'inactive') query.isActive = false
  }
  if (filter.subtopicId) query.subtopicId = filter.subtopicId
  if (filter.search) {
    const regex = { $regex: filter.search.trim(), $options: 'i' }
    query.$or = [{ 'title.en': regex }, { 'title.ta': regex }]
  }
  return query
}

export async function listForAdmin(
  filter: AdminStudyMaterialListFilter,
  page: number,
  limit: number,
): Promise<{ items: StudyMaterialDocument[]; total: number }> {
  const query = buildAdminQuery(filter)
  const [items, total] = await Promise.all([
    StudyMaterial.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    StudyMaterial.countDocuments(query),
  ])
  return { items, total }
}
