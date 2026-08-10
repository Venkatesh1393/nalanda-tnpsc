import { apiClient } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import {
  getPlatformStats as getPlatformStatsMock,
  getSuccessStories as getSuccessStoriesMock,
  getTestimonials as getTestimonialsMock,
} from '@/services/mock/publicMockService'
import type {
  PlatformStats,
  SuccessStory,
  Testimonial,
  TopRanker,
} from '@/types/marketing'

/**
 * Domain calls for the public/marketing backend module (docs/API.md §17).
 * This is the stable facade every Landing Page section imports from.
 * `getPlatformStats`/`getTestimonials`/`getSuccessStories` stay mocked (out
 * of the Leaderboard step's scope) — `getTopRankers` is real as of that
 * step, calling the same `leaderboard.service.ts` the authenticated
 * Leaderboard reads, per its explicit "connect Landing Page Top Rankers to
 * the same real backend source" requirement.
 */

export async function getPlatformStats(): Promise<PlatformStats> {
  return getPlatformStatsMock()
}

export async function getTestimonials(limit = 12): Promise<Testimonial[]> {
  return getTestimonialsMock(limit)
}

export async function getSuccessStories(limit = 4): Promise<SuccessStory[]> {
  return getSuccessStoriesMock(limit)
}

export async function getTopRankers(limit = 6): Promise<TopRanker[]> {
  const response = await apiClient.get<{ data: TopRanker[] }>(
    endpoints.public.topRankers,
    {
      params: { limit },
    },
  )
  return response.data.data
}
