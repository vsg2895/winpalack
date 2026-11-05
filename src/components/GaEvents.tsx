'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/ga'

/**
 * `affiliate_click` for every outbound affiliate link — the site's conversion.
 *
 * ONE delegated listener instead of an onClick per link: the links live in
 * Server Components (CasinoCard, the review and bonus pages, lib/affiliate.ts),
 * which cannot take handlers, and any link added later is counted without
 * touching this file. Every affiliate link goes through `/go/<casino>` (the
 * redirect route), so that path is what identifies one.
 *
 * `auxclick` catches the middle-button "open in new tab" a `click` misses. The
 * links open in a new tab, so this page stays and the hit is not cut off.
 */
export default function GaEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.type === 'auxclick' && event.button !== 1) return
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return

      const url = new URL(link.href, location.href)
      const match = url.origin === location.origin ? url.pathname.match(/^\/go\/([^/]+)\/?$/) : null
      if (!match) return

      trackEvent('affiliate_click', {
        casino: decodeURIComponent(match[1]),
        ...(url.searchParams.get('offer') ? { offer: url.searchParams.get('offer')! } : {}),
        page_path: location.pathname,
      })
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('auxclick', onClick, true)
    }
  }, [])

  return null
}
