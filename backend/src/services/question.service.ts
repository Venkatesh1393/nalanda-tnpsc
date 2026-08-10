import type { QuestionDocument } from '../models/Question.model'
import * as questionRepository from '../repositories/question.repository'
import * as cloudinaryUploadService from './media/cloudinaryUpload.service'
import { ApiError } from '../utils/ApiError'

const QUESTION_IMAGE_FOLDER = 'nalanda/questions'

async function requireQuestion(id: string): Promise<QuestionDocument> {
  const question = await questionRepository.findById(id)
  if (!question) throw ApiError.notFound('Question not found')
  return question
}

/** Content-editor/admin only (see `routes/questions.routes.ts`'s
 * `authorizeRoles`) — uploads/replaces the question's illustrative image.
 * No deterministic `public_id` here (unlike avatars): a question can be
 * re-imaged by different editors at different times, so the old asset is
 * looked up and deleted explicitly rather than relying on an overwrite. */
export async function attachImage(
  id: string,
  file: Express.Multer.File,
): Promise<QuestionDocument> {
  const question = await requireQuestion(id)
  const previousPublicId = question.questionImagePublicId

  const uploaded = await cloudinaryUploadService.uploadBuffer(file.buffer, {
    folder: QUESTION_IMAGE_FOLDER,
    resourceType: 'image',
  })

  const updated = await questionRepository.updateImage(id, {
    questionImageUrl: uploaded.secureUrl,
    questionImagePublicId: uploaded.publicId,
  })
  if (!updated) throw ApiError.notFound('Question not found')

  if (previousPublicId) {
    await cloudinaryUploadService.deleteAsset(previousPublicId, 'image')
  }

  return updated
}

export async function removeImage(id: string): Promise<QuestionDocument> {
  const question = await requireQuestion(id)

  if (question.questionImagePublicId) {
    await cloudinaryUploadService.deleteAsset(question.questionImagePublicId, 'image')
  }

  const updated = await questionRepository.clearImage(id)
  if (!updated) throw ApiError.notFound('Question not found')
  return updated
}
