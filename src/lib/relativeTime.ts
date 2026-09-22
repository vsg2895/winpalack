/**
 * "17 minutes ago", computed ONCE on the server.
 *
 * ── Why this is not a client component ──────────────────────────────────────
 *
 * The obvious implementation — render the difference from `Date.now()` — is a
 * guaranteed hydration mismatch. The server renders at one instant, the browser
 * hydrates at a later one, and "2 minutes ago" vs "3 minutes ago" is React
 * error #418 on a page that otherwise works.
 *
 * The fix is not `suppressHydrationWarning`, which hides the symptom and leaves
 * the text stale anyway. It is to accept that the string is a SERVER-RENDERED
 * FACT with a known staleness: the page is ISR-cached for an hour, so "17
 * minutes ago" means "17 minutes before this page was generated". The <time>
 * element carries the exact timestamp for anything that needs precision, and
 * the visible text degrades to an absolute date as soon as relative time stops
 * being useful.
 *
 * That last part matters on its own: "14 months ago" tells a reader strictly
 * less than "June 2025" does.
 */
export function relativeTime(value: string | null | undefined, now: number = Date.now()): string {
  if (!value) return ''

  const then = new Date(value).getTime()

  if (Number.isNaN(then)) return ''

  const seconds = Math.floor((now - then) / 1000)

  // A clock skew between the API host and the web host can put a timestamp a
  // few seconds in the future. "in -3 seconds" is worse than "just now".
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`

  return absoluteDate(value)
}

export function absoluteDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** The machine-readable value for a <time dateTime=…> attribute. */
export function isoOrUndefined(value: string | null | undefined): string | undefined {
  return value ?? undefined
}
