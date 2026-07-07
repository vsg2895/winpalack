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
const SLUG = process.env.NEXT_PUBLIC_SITE_SLUG ?? 'idevaffiliation'
const SITE_DOMAINS: Record<string, string> = {
  idevaffiliation: 'https://idevaffiliation.com',
  winpalack: 'https://winpalack.com',
}
const SITE_DEV_PORTS: Record<string, string> = {
  idevaffiliation: '3000',
  winpalack: '3001',
}

export const API_URL: string = process.env.API_URL ?? `${API_ORIGIN}/api/v1/public`

export const API_IMAGE: string = process.env.API_IMAGE ?? API_ORIGIN

export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (PROD
    ? (SITE_DOMAINS[SLUG] ?? `https://${SLUG}.com`)
    : `http://localhost:${SITE_DEV_PORTS[SLUG] ?? '3000'}`)
