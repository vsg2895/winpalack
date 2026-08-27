'use client'

import { useEffect, useRef } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { getConsentChoice, subscribeToConsent } from './CookieConsent'

/**
 * GA4, gated on the site's existing cookie banner.
 *
 * The tag itself always loads (that is what `@next/third-parties` is for), but
 * `ConsentModeScript` has already denied every storage type before it runs, so
 * with no consent it sets no cookies and sends no hits. Granting is a
 * `consent: update`, never a decision about whether to inject the script — which
 * is precisely what makes MID-SESSION consent work: the visitor clicks "Accept
 * all", the banner's listener set fires, this effect grants, and collection
 * begins without a reload.
 *
 * It subscribes to the BANNER'S OWN store rather than polling or duplicating the
 * storage read, so there is one source of truth for consent and no second,
 * competing consent UI.
 *
 * Nothing here passes user data to Google: the only value handed to the tag is
 * the measurement ID.
 */
type Props = { gaId: string }

const GRANTED = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
  functionality_storage: 'granted',
  personalization_storage: 'granted',
} as const

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function Analytics({ gaId }: Props) {
  // Granting twice is harmless but pointless; the banner's store also notifies
  // on "reopen settings", which is not a consent change at all.
  const granted = useRef(false)

  useEffect(() => {
    const sync = (): void => {
      if (granted.current || getConsentChoice() !== 'all') return

      window.gtag?.('consent', 'update', GRANTED)
      granted.current = true
    }

    // Run once on mount for the visitor who accepted on a previous visit. The
    // inline bootstrap has already granted for them; this is the belt to its
    // braces, and costs one localStorage read.
    sync()

    return subscribeToConsent(sync)
  }, [])

  return <GoogleAnalytics gaId={gaId} />
}
