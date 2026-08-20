import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type { CreateOrderResult, VerifyPaymentInput } from '@/types/payments'
import type {
  DownloadResult,
  QuestionPaper,
  QuestionPaperListFilter,
} from '@/types/questionPapers'

/**
 * Domain calls for Previous Year Question Papers
 * (`backend/src/routes/questionPapers.routes.ts`). `listPapers` never
 * returns a `fileUrl` — only `downloadPaper()` does, since that's the one
 * endpoint the backend actually enforces the free-limit/purchase gate on
 * (`backend/src/services/questionPaper.service.ts#getDownloadUrl`). A 403
 * with `error.code === 'PAPER_PAYWALL_REQUIRED'` is the expected "show the
 * paywall" signal, not a real failure — callers should check for it
 * explicitly rather than treating every rejected `downloadPaper()` call the
 * same way.
 */

interface ApiEnvelope<T> {
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    freeSlotsRemaining?: number
    freeLimit?: number
    isUnlocked?: boolean
  }
}

export interface QuestionPaperPage {
  items: QuestionPaper[]
  page: number
  limit: number
  total: number
  totalPages: number
  /** "N free downloads remaining" — 0 once either the free limit is spent
   * OR the student has purchased the unlock (distinguished by `isUnlocked`,
   * never derivable from `items[].isAccessible` alone). */
  freeSlotsRemaining: number
  freeLimit: number
  isUnlocked: boolean
}

export async function listPapers(
  filter: QuestionPaperListFilter,
): Promise<QuestionPaperPage> {
  const response = await apiClient.get<ApiEnvelope<QuestionPaper[]>>(
    endpoints.questionPapers.list,
    { params: filter },
  )
  return {
    items: response.data.data,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? response.data.data.length,
    total: response.data.meta?.total ?? response.data.data.length,
    totalPages: response.data.meta?.totalPages ?? 1,
    freeSlotsRemaining: response.data.meta?.freeSlotsRemaining ?? 0,
    freeLimit: response.data.meta?.freeLimit ?? 0,
    isUnlocked: response.data.meta?.isUnlocked ?? false,
  }
}

export async function downloadPaper(id: string): Promise<DownloadResult> {
  const response = await apiClient.get<ApiEnvelope<DownloadResult>>(
    endpoints.questionPapers.download(id),
  )
  return response.data.data
}

// --- Unlock-all purchase (flat ₹29 one-time, distinct from subscription
// checkout — reuses the same `CreateOrderResult`/`VerifyPaymentInput`
// shapes since the Razorpay order/verify contract is identical either way,
// see `backend/src/services/payment.service.ts`'s header comment) ---

export async function createPaperUnlockOrder(): Promise<CreateOrderResult> {
  const response = await apiClient.post<ApiEnvelope<CreateOrderResult>>(
    endpoints.payments.questionPapersOrder,
  )
  return response.data.data
}

export async function verifyPaperUnlockPayment(
  input: VerifyPaymentInput,
): Promise<{ status: 'processing' }> {
  const response = await apiClient.post<ApiEnvelope<{ status: 'processing' }>>(
    endpoints.payments.questionPapersVerify,
    input,
  )
  return response.data.data
}
