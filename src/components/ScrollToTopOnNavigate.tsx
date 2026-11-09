'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * A link to another page always opens that page at its top.
 *
 * Next 16 keeps the scroll position on navigation "as long as the Page is
 * visible in the viewport" (docs: Link → scroll). A link low on a page — the
 * footer's Bonuses and Casinos categories above all — therefore opened a short
 * destination page scrolled to its end, because the bottom of the new page was
 * still in view.
 *
 * Runs on a PATHNAME change only, so:
 *  - back/forward keep the browser's restored position (popstate is skipped);
 *  - a `#hash` link still lands on its anchor;
 *  - a query change on the same page (pagination, filters) is left to the
 *    page, as before.
 *
 * `behavior: 'instant'` overrides any `scroll-smooth` on <html>, which Next 16
 * no longer suspends during navigation by itself.
 *
 * Identical on every site; mounted first thing in each `app/layout.tsx` body.
 */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname()
  const previous = useRef(pathname)
  const fromHistory = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname

    if (fromHistory.current) {
      fromHistory.current = false
      return
    }

    if (window.location.hash) return

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
