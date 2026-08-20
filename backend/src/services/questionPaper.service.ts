import { QUESTION_PAPER_FREE_LIMIT } from '../constants/questionPapers'
import type { QuestionPaperDocument } from '../models/QuestionPaper.model'
import type { BilingualText } from '../models/shared/bilingualText'
import * as profileRepository from '../repositories/profile.repository'
import * as questionPaperRepository from '../repositories/questionPaper.repository'
import type { PublicListFilter } from '../repositories/questionPaper.repository'
import * as questionPaperAccessRepository from '../repositories/questionPaperAccess.repository'
import { ApiError } from '../utils/ApiError'

/**
 * Student-facing reads + the download gate. The gate itself
 * (`getDownloadUrl`) is the only place `fileUrl` is ever returned to a
 * student — `listPapers` deliberately never includes it, so a caller can't
 * bypass the free-limit/purchase check by just reading the list response
 * (closing the gap `StudyMaterial`'s current ungated download endpoint has).
 */

export interface QuestionPaperDTO {
  id: string
  examId: string
  year: number
  title: BilingualText
  tnpscExamType?: string
  fileBytes?: number
  /** Whether *this* student can download it right now — already unlocked
   * (purchased), already free-accessed before, or a free slot is still
   * available. `false` means the client should show the paywall CTA. */
  isAccessible: boolean
  createdAt: Date | null
}

async function toDTO(
  paper: QuestionPaperDocument,
  unlocked: boolean,
  accessedPaperIds: Set<string>,
  freeSlotsRemaining: number,
): Promise<QuestionPaperDTO> {
  const isAccessible =
    unlocked || accessedPaperIds.has(paper.id) || freeSlotsRemaining > 0

  return {
    id: paper.id,
    examId: paper.examId.toString(),
    year: paper.year,
    title: paper.title,
    tnpscExamType: paper.tnpscExamType,
    fileBytes: paper.fileBytes,
    isAccessible,
    createdAt: paper.createdAt ?? null,
  }
}

export async function listPapers(
  userId: string,
  filter: PublicListFilter,
  page: number,
  limit: number,
): Promise<{
  items: QuestionPaperDTO[]
  total: number
  page: number
  limit: number
  /** Surfaced so the client can render "N free downloads remaining" without
   * re-deriving it from individual `isAccessible` flags, which alone can't
   * distinguish "0 remaining, still unlocked via purchase" from "0
   * remaining, genuinely paywalled." */
  freeSlotsRemaining: number
  freeLimit: number
  isUnlocked: boolean
}> {
  const [{ items, total }, profile, freeAccessCount] = await Promise.all([
    questionPaperRepository.listPublic(filter, page, limit),
    profileRepository.findByUserId(userId),
    questionPaperAccessRepository.countForUser(userId),
  ])

  const unlocked = profile?.previousYearPapersUnlocked ?? false
  const freeSlotsRemaining = Math.max(0, QUESTION_PAPER_FREE_LIMIT - freeAccessCount)

  // Only fetch the per-paper "already free-accessed" set when it can change
  // the answer (unlocked users don't need it; nobody needs it once the free
  // limit is fully spent, since a not-yet-accessed paper is never
  // accessible in that case either).
  const accessedPaperIds = new Set<string>()
  if (!unlocked && freeAccessCount > 0) {
    await Promise.all(
      items.map(async (paper) => {
        if (await questionPaperAccessRepository.hasAccess(userId, paper.id)) {
          accessedPaperIds.add(paper.id)
        }
      }),
    )
  }

  const dtoItems = await Promise.all(
    items.map((paper) => toDTO(paper, unlocked, accessedPaperIds, freeSlotsRemaining)),
  )
  return {
    items: dtoItems,
    total,
    page,
    limit,
    freeSlotsRemaining,
    freeLimit: QUESTION_PAPER_FREE_LIMIT,
    isUnlocked: unlocked,
  }
}

export interface DownloadResultDTO {
  fileUrl: string
}

export async function getDownloadUrl(
  userId: string,
  paperId: string,
): Promise<DownloadResultDTO> {
  const paper = await questionPaperRepository.findById(paperId)
  if (!paper) throw ApiError.notFound('Question paper not found')
  if (!paper.fileUrl) throw ApiError.notFound('This paper has no file uploaded yet')

  const profile = await profileRepository.findByUserId(userId)
  if (profile?.previousYearPapersUnlocked) {
    return { fileUrl: paper.fileUrl }
  }

  if (await questionPaperAccessRepository.hasAccess(userId, paperId)) {
    return { fileUrl: paper.fileUrl }
  }

  const freeAccessCount = await questionPaperAccessRepository.countForUser(userId)
  if (freeAccessCount < QUESTION_PAPER_FREE_LIMIT) {
    await questionPaperAccessRepository.grant(userId, paperId)
    return { fileUrl: paper.fileUrl }
  }

  // Custom code (not the generic `ApiError.forbidden()` helper) so the
  // frontend can distinguish this specific, expected case and show the
  // upgrade/paywall CTA instead of a generic error toast.
  throw new ApiError(
    403,
    'You have used all your free question paper downloads. Unlock all papers for ₹29.',
    'PAPER_PAYWALL_REQUIRED',
  )
}
