/**
 * Env-aware base URLs for the public site.
 *
 * Under `next dev` (NODE_ENV !== 'production') everything is localhost; a
 * production build uses the live domains. Explicit env vars (API_URL /
 * API_IMAGE / NEXT_PUBLIC_SITE_URL) still override — e.g. a Docker build passing
 * them as build args. The shared backend + admin serve every site.
 */
const PROD = process.env.NODE_ENV === 'production'

// Shared backend origin (one API for all sites).
const API_ORIGIN = PROD ? 'https://api.idevaffiliation.com' : 'http://localhost:8000'

// This site's own public URL, resolved from its slug.
const SLUG = process.env.NEXT_PUBLIC_SITE_SLUG ?? 'winpalack'
const SITE_DOMAINS: Record<string, string> = {
  idevaffiliation: 'https://idevaffiliation.com',
  winpalack: 'https://winpalack.com',
  roulettingo: 'https://roulettingo.com',
  viglinksi: 'https://viglinksi.com',
}
// Ports each site's dev server actually runs on. Kept in step with the
// revalidation URLs registered against each site in the admin — if these drift,
// a dev-mode canonical points at a DIFFERENT site's server.
const SITE_DEV_PORTS: Record<string, string> = {
  idevaffiliation: '3001',
  winpalack: '3002',
  roulettingo: '3003',
  viglinksi: '3004',
}

export const API_URL: string = process.env.API_URL ?? `${API_ORIGIN}/api/v1/public`

export const API_IMAGE: string = process.env.API_IMAGE ?? API_ORIGIN

/**
 * THE canonical origin for this site — the single place the host is decided.
 *
 * Everything public-facing derives from this and nothing else: `metadataBase`
 * in the root layout (which resolves every page's relative canonical and
 * og:url), the sitemap, robots.txt and every absolute URL in the JSON-LD. A
 * page that builds its own base URL from `process.env` is a bug: that is how
 * the two drifted apart before, and how a missing env var silently produced
 * RELATIVE canonicals that Next then resolved against a different fallback.
 *
 * Normalised with any trailing slash removed, so `${SITE_URL}/casinos` can
 * never become `//casinos` when the env var is written with one.
 */
function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (PROD
      ? (SITE_DOMAINS[SLUG] ?? `https://${SLUG}.com`)
      : `http://localhost:${SITE_DEV_PORTS[SLUG] ?? '3000'}`)

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    // Thrown at module load, so `next build` FAILS rather than shipping a site
    // whose canonical tags point at a relative path. Failing loudly here is the
    // whole point: the previous behaviour was to degrade quietly.
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL; received ${JSON.stringify(raw)}. ` +
        'NEXT_PUBLIC_* values are inlined by `next build`, so it has to be set at BUILD time, ' +
        'not only in the runtime environment.',
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use http or https; received ${JSON.stringify(raw)}.`,
    )
  }

  return raw.replace(/\/+$/, '')
}

export const SITE_URL: string = resolveSiteUrl()
