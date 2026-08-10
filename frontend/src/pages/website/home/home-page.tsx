import { CurrentAffairsPreview } from '@/pages/website/home/current-affairs-preview'
import { FaqSection } from '@/pages/website/home/faq-section'
import { FeatureCardsSection } from '@/pages/website/home/feature-cards-section'
import { HeroSection } from '@/pages/website/home/hero-section'
import { PricingSection } from '@/pages/website/home/pricing-section'
import { StatsBand } from '@/pages/website/home/stats-band'
import { SuccessStoriesSection } from '@/pages/website/home/success-stories-section'
import { TestimonialsSection } from '@/pages/website/home/testimonials-section'
import { TopRankersSection } from '@/pages/website/home/top-rankers-section'

/**
 * The public Website's home / landing page (docs/Landing_Page_Design.md) —
 * composes the full page-flow section-by-section, in the exact order the
 * doc specifies. Rendered inside `layouts/website-layout.tsx`, which
 * supplies the Navbar above and Footer below. Each section owns its own
 * data fetching and loading/error states — this file is intentionally just
 * composition, readable top-to-bottom as "what does this page show."
 */
export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <FeatureCardsSection />
      <CurrentAffairsPreview />
      <TopRankersSection />
      <SuccessStoriesSection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
    </>
  )
}
