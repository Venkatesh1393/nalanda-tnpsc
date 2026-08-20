/**
 * Previous Year Question Papers — real, admin-uploaded PDFs per exam+year,
 * distinct from the per-Question `isPreviousYear`/`pyqYear` tags Practice's
 * PYQ mode already uses. Mirrors the backend's `QuestionPaperDTO`
 * (`backend/src/services/questionPaper.service.ts`) — note `fileUrl` is
 * deliberately absent here: it's only ever returned by the gated
 * `downloadPaper()` call, never the list.
 */

export type TnpscExamStage = 'prelims' | 'mains' | 'interview'

export type QuestionPaper = {
  id: string
  examId: string
  year: number
  title: { en?: string; ta?: string }
  tnpscExamType?: TnpscExamStage
  fileBytes?: number
  /** Whether the signed-in student can download this right now — already
   * unlocked, already free-accessed before, or a free slot remains. `false`
   * means the UI should show a locked state and route "Download" to the
   * paywall instead of calling `downloadPaper()`. */
  isAccessible: boolean
  createdAt: string | null
}

export type QuestionPaperListFilter = {
  examId?: string
  year?: number
  tnpscExamType?: TnpscExamStage
  page?: number
  limit?: number
}

export type DownloadResult = {
  fileUrl: string
}
