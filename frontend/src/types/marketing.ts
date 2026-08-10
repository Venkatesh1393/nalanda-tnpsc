import type { ExamCategoryId, SubscriptionTier } from '@/constants/exam'

/**
 * Response DTOs for the public, unauthenticated marketing endpoints
 * (docs/API.md §17) plus the two existing public endpoints the Landing Page
 * also consumes (`GET /current-affairs`, `GET /payments/plans`). Field names
 * match those docs exactly — this file has no opinion beyond the wire shape.
 */

export type PlatformStats = {
  questionsCount: number
  currentAffairsDaysCount: number
  mockTestsCount: number
  studentsCount: number
}

export type Testimonial = {
  id: string
  name: string
  examCategory: ExamCategoryId
  quote: string
  avatarUrl: string | null
}

export type SuccessStory = {
  id: string
  name: string
  examCategory: ExamCategoryId
  examCleared: string
  headline: string
  story: string
  photoUrl: string | null
}

export type TopRanker = {
  rank: number
  displayName: string
  examCategory: ExamCategoryId
  percentile: number
}

export type CurrentAffairsPreviewItem = {
  id: string
  date: string
  title: string
  excerpt: string
  tags: string[]
}

export type PricingPlan = {
  tier: SubscriptionTier
  monthlyPrice: number
  annualPrice: number
  features: string[]
}
