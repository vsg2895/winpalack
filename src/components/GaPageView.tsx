'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { GA_MEASUREMENT_ID } from '@/lib/ga'

/**
 * Sends a `page_view` on App Router client-side navigation.
 *
 * WHY THIS IS NEEDED: the inline `gtag('config', …)` in the layout fires one
 * page_view when the tag loads. After that the App Router changes routes
 * without a document load, so nothing else would ever be recorded — every
 * client-side navigation would be invisible and the whole site would look like
 * a one-page bounce.
 *
 * THE DUPLICATE-ON-FIRST-LOAD GUARD is the fiddly part. This effect also runs
 * on mount, and on mount the `config` call has already counted that same view.
 * Sending again would double every entry page: inflated sessions, halved bounce
 * rate, numbers that quietly disagree with reality. `firstRun` skips exactly one
 * send — the mount — and every later pathname/query change reports normally.
 *
 * `useSearchParams()` opts a component into client-side rendering, which is why
 * the caller wraps this in <Suspense>: without it the whole route tree below
 * would be forced dynamic and lose static generation.
 */
export default function GaPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      // The gtag('config') call already reported this one.
      firstRun.current = false

      return
    }

    const query = searchParams.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname

    window.gtag?.('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    })
  }, [pathname, searchParams])

  return null
}
