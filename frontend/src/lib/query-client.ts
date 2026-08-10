import { QueryClient } from '@tanstack/react-query'

/**
 * Single, shared React Query client for the whole app. Server-side data
 * (anything from docs/API.md) is cached here — do not duplicate it into
 * `store/` (see store/README.md for that boundary).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute — a sensible default; override per-query as needed
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
