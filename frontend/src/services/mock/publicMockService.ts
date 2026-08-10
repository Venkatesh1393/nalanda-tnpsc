import type { PlatformStats, SuccessStory, Testimonial } from '@/types/marketing'

/**
 * Mock implementation of the public/marketing backend module (docs/API.md
 * §17) — Stats Counters/Testimonials/Success Stories read realistic,
 * hand-authored TNPSC mock data instead of a live `apiClient` call; Top
 * Rankers is real as of the Leaderboard step (`services/publicService.ts`
 * now calls `endpoints.public.topRankers` directly) — its old mock
 * implementation here was removed once nothing imported it anymore.
 * `services/publicService.ts` is the stable facade every Landing Page
 * section imports from — previously these were real (but always-failing,
 * since no backend exists) `apiClient` calls, shown as a deliberate
 * Skeleton -> ErrorState demonstration; now mocked like every other module,
 * per this session's "the UI should function exactly as if a backend
 * exists" requirement.
 */

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return delay(
    {
      questionsCount: 15200,
      currentAffairsDaysCount: 730,
      mockTestsCount: 420,
      studentsCount: 52000,
    },
    450,
  )
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Priya Ramamoorthy',
    examCategory: 'group-4',
    quote:
      'The 100 Questions mode became my daily habit — I could feel my Aptitude accuracy climbing week over week.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-2',
    name: 'Karthik Subramanian',
    examCategory: 'group-2',
    quote:
      "Studying between shifts used to mean falling behind. Nalanda's mobile-first practice sessions fit into my lunch breaks perfectly.",
    avatarUrl: null,
  },
  {
    id: 'testimonial-3',
    name: 'Divya Chandrasekaran',
    examCategory: 'group-1',
    quote:
      'The AI Mains evaluation gave me structure-level feedback no coaching centre ever bothered to give me.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-4',
    name: 'Selvam Murugesan',
    examCategory: 'group-2a',
    quote:
      'I switched between Tamil and English mid-session without losing my place — that alone saved me hours of confusion.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-5',
    name: 'Anitha Krishnamurthy',
    examCategory: 'vao',
    quote:
      'The Weak Areas chart told me exactly where I was bleeding marks. I stopped guessing what to study next.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-6',
    name: 'Rajesh Palanisamy',
    examCategory: 'police',
    quote:
      'Daily Current Affairs quizzes kept me consistent — by exam day, that section felt like the easiest part of the paper.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-7',
    name: 'Meena Gopalakrishnan',
    examCategory: 'forest',
    quote:
      "Nalanda's PYQ archive is the most organized I've used — filtered by year and topic, not just dumped in one file.",
    avatarUrl: null,
  },
  {
    id: 'testimonial-8',
    name: 'Naveen Kumaraswamy',
    examCategory: 'trb',
    quote:
      'The rank prediction chart kept my expectations realistic instead of either panicking or getting overconfident.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-9',
    name: 'Swathi Balasubramanian',
    examCategory: 'group-4',
    quote:
      'I bookmark a question, and it shows up again in my revision queue automatically. No more losing track of what I got wrong.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-10',
    name: 'Arun Velayutham',
    examCategory: 'group-2',
    quote:
      'The Memory Tricks for Polity articles stuck with me far better than plain notes ever did.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-11',
    name: 'Kavya Natarajan',
    examCategory: 'group-1',
    quote:
      'Transparent pricing meant I could plan my budget properly instead of getting upsold mid-course like other platforms.',
    avatarUrl: null,
  },
  {
    id: 'testimonial-12',
    name: 'Bala Manikandan',
    examCategory: 'group-2a',
    quote:
      'Sectional tests under real exam timing conditions made the actual exam day feel completely familiar.',
    avatarUrl: null,
  },
]

export async function getTestimonials(limit = 12): Promise<Testimonial[]> {
  return delay(TESTIMONIALS.slice(0, limit), 500)
}

const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: 'success-1',
    name: 'Lakshmi Venkataraman',
    examCategory: 'group-4',
    examCleared: 'TNPSC Group 4 (2026)',
    headline: 'From three failed attempts to a confirmed Group 4 posting',
    story:
      "I'd attempted Group 4 three times before finding Nalanda. What changed wasn't just more practice — it was practice that adapted to what I was actually getting wrong. The Weak Areas dashboard forced me to stop avoiding Aptitude, and six months later I cleared prelims with my best score yet.",
    photoUrl: null,
  },
  {
    id: 'success-2',
    name: 'Gokul Ramasubramanian',
    examCategory: 'group-2',
    examCleared: 'TNPSC Group 2 (2025)',
    headline: 'Balanced a full-time job with a Group 2 clearance',
    story:
      'Working full-time meant I had maybe 90 minutes a day to study. The daily study goal and streak system kept me honest even on the days I wanted to skip. The 100 Questions mode fit exactly into my commute.',
    photoUrl: null,
  },
  {
    id: 'success-3',
    name: 'Revathi Sundaramoorthy',
    examCategory: 'group-1',
    examCleared: 'TNPSC Group 1 Mains (2026)',
    headline: 'AI Mains evaluation closed the gap coaching centres missed',
    story:
      "My prelims scores were always solid, but Mains felt like a black box — I never knew why my answers weren't scoring higher. The rubric-based AI evaluation broke down structure, relevance, and coverage separately, and that specificity is what finally moved my scores.",
    photoUrl: null,
  },
  {
    id: 'success-4',
    name: 'Dinesh Kanagasabapathy',
    examCategory: 'vao',
    examCleared: 'VAO (2025)',
    headline: 'Rural aspirant, low bandwidth, no problem',
    story:
      "I study on a shared phone with patchy network in my village. Nalanda's lightweight practice sessions loaded even on my worst days, and the Tamil-first explanations meant I never had to double-translate a concept in my head before understanding it.",
    photoUrl: null,
  },
]

export async function getSuccessStories(limit = 4): Promise<SuccessStory[]> {
  return delay(SUCCESS_STORIES.slice(0, limit), 500)
}
