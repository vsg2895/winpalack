/**
 * The GA4 measurement ID, resolved once at BUILD time.
 *
 * `NEXT_PUBLIC_*` is inlined by `next build`, so a value supplied only to the
 * running container never reaches the browser. The literal fallback exists for
 * exactly that case: without it a missing env var renders `G-undefined` into
 * every page, which looks like a working tag and silently collects nothing.
 *
 * There is no NODE_ENV guard. The tag loads in development too — that is
 * deliberate, so "does analytics work?" is answerable before deploying rather
 * than only after.
 */
export const GA_MEASUREMENT_ID: string = process.env.NEXT_PUBLIC_GA_ID || 'G-VSQ3RW8F7H'

declare global {
  interface Window {
    // Optional: the inline bootstrap defines it during parse, but a component
    // must not assume the script ran (an extension or a blocker can remove it).
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Carries a banner choice to Consent Mode mid-session, so "Accept All" starts
 * measuring on the current page and a later "Reject Non-Essential" stops it
 * without a reload. Only `analytics_storage` moves: the ad_* types stay denied
 * whatever the choice (see ConsentModeScript).
 *
 * Withdrawing also deletes the `_ga` cookies already set — denied storage only
 * stops new writes, and the Cookie Policy says rejecting removes them.
 */
export function updateAnalyticsConsent(granted: boolean): void {
  window.gtag?.('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' })
  if (!granted) clearAnalyticsCookies()
}

function clearAnalyticsCookies(): void {
  // GA writes on the widest domain it can (".winpalack.com"); expire every
  // form a cookie of that name could have been set with.
  const host = location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0]
    if (!/^_ga(_|$)/.test(name)) continue
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ''}`
    }
  }
}

/**
 * A GA4 event, when the tag is present. A blocker or a failed load leaves
 * `gtag` undefined, and measurement must never break the action it measures.
 */
export function trackEvent(name: string, params: Record<string, string> = {}): void {
  window.gtag?.('event', name, params)
}

// Build-time warning, not an error: the fallback keeps the build correct, but a
// missing variable usually means the deploy pipeline lost it, and that is worth
// seeing in the build log. `typeof window === 'undefined'` keeps it off the
// client bundle's execution path.
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_GA_ID) {
  console.warn(
    `[analytics] NEXT_PUBLIC_GA_ID is not set — falling back to the built-in ${GA_MEASUREMENT_ID}. ` +
      'NEXT_PUBLIC_* is inlined at build time, so pass it as a Docker --build-arg, not a runtime env var.',
  )
}
