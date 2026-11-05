/**
 * How the home page's query-string views reach a cacheable route.
 *
 * The home page varies by `?page=` and `?country=`. Reading `searchParams`
 * makes a route dynamic, so `/` was rendered on every request: no ISR, no edge
 * cache, TTFB ~0.9 s on mobile (SEO audit O4). Instead:
 *
 *   - `/` with neither parameter is `app/page.tsx`, a static page;
 *   - `/?page=N` and `/?country=X` are REWRITTEN by the proxy to
 *     `/home-view/<country|all>/<N>`, an ISR route rendered once per view;
 *   - a request for `/home-view/…` itself is 301'd to its public spelling, so
 *     the internal path never becomes a second URL for the same document.
 *
 * The public URLs do not change: the browser, the canonical tag, the paginator
 * and the sitemap only ever see `/?…`.
 *
 * Runs in the proxy, so it must stay free of server-only imports.
 */

export const HOME_VIEW_PREFIX = '/home-view'

/** The country segment when no country is chosen. Not a country slug. */
const ALL_COUNTRIES = 'all'

/** A page segment is a whole number from 1, spelled the canonical way. */
const PAGE_SEGMENT = /^[1-9]\d{0,5}$/

/**
 * The internal path for a home-page request that carries a view parameter, or
 * null when `/` should be served as it is (the static page).
 *
 * Runs AFTER canonicalRedirect(), so `page` is already either absent or a
 * canonical whole number above 1, and `category` has been redirected away.
 * Any other parameter (utm_*, gclid, …) does not change the view and is left
 * to the static page.
 */
export function homeViewRewrite(url: URL): string | null {
  if (url.pathname !== '/') return null

  const country = url.searchParams.get('country')
  const page = url.searchParams.get('page')

  if (!country && page === null) return null

  const countrySegment = country ? encodeURIComponent(country) : ALL_COUNTRIES

  return `${HOME_VIEW_PREFIX}/${countrySegment}/${encodeURIComponent(page ?? '1')}`
}

/**
 * The public URL for an internal `/home-view/…` path, or null when the path is
 * not one. Parameter order matches the paginator's (`?country=…&page=…`).
 */
export function homeViewPublicPath(pathname: string): string | null {
  if (pathname !== HOME_VIEW_PREFIX && !pathname.startsWith(`${HOME_VIEW_PREFIX}/`)) return null

  const [country, page] = pathname.slice(HOME_VIEW_PREFIX.length + 1).split('/')
  const params = new URLSearchParams()

  if (country && country !== ALL_COUNTRIES) params.set('country', safeDecode(country))
  if (page && PAGE_SEGMENT.test(page) && page !== '1') params.set('page', page)

  const search = params.toString()

  return search ? `/?${search}` : '/'
}

/**
 * The route's segments as a view, or null when they cannot name one (the route
 * answers 404). `/?page=abc` never gets here — canonicalRedirect() folds it to
 * `/` — but a non-finite value such as `?page=Infinity` does.
 */
export function parseHomeView(country: string, page: string): { country?: string; page: number } | null {
  if (!PAGE_SEGMENT.test(page)) return null

  // Route params arrive decoded; no second decode here.
  return { country: country === ALL_COUNTRIES ? undefined : country, page: Number(page) }
}

/** A malformed escape (`%E0`) is passed through rather than thrown. */
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
