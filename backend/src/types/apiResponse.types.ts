/**
 * The response envelope every endpoint must use — `{ success, data, error, meta }`,
 * per docs/API.md's REST conventions. Build instances via utils/ApiResponse.ts
 * rather than constructing this shape by hand in a controller.
 */
export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  [key: string]: unknown
}

export interface ApiSuccessBody<T> {
  success: true
  data: T
  error: null
  meta?: ApiMeta
}

export interface ApiErrorBody {
  success: false
  data: null
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta?: ApiMeta
}

export type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody
