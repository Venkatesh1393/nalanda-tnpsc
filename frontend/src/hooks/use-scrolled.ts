import { useEffect, useState } from 'react'

/**
 * True once the page has scrolled past `thresholdPx` — drives the Navbar's
 * transparent-over-Hero → solid transition (docs/Landing_Page_Design.md §2,
 * "after ~80px of scroll"). A plain scroll listener rather than an
 * IntersectionObserver since the threshold is a fixed pixel value, not tied
 * to any particular element's position.
 */
export function useScrolled(thresholdPx = 80) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > thresholdPx)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > thresholdPx)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [thresholdPx])

  return scrolled
}
