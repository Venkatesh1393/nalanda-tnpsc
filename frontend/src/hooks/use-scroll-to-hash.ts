import { useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router's plain `<BrowserRouter>` (used in providers/app-providers.tsx)
 * does not scroll to an in-page hash on navigation the way a full page load
 * does — clicking a `ROUTES.homeSection('learn')`-style link only updates
 * `location.hash`, it never moves the viewport. This hook is what actually
 * performs that scroll, for every `id="..."` anchor target across the
 * Landing Page (Hero's "See How It Works", the Navbar/Footer's section
 * links). Respects `prefers-reduced-motion` (docs/UI_Design_System.md §31).
 * Mount once, near the router root (see routes/app-routes.tsx).
 */
export function useScrollToHash() {
  const { hash } = useLocation()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!hash) return

    const id = decodeURIComponent(hash.slice(1))
    const element = document.getElementById(id)
    if (!element) return

    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [hash, prefersReducedMotion])
}
