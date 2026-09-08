import { NextResponse, type NextRequest } from 'next/server'

/**
 * Applies admin-managed redirects.
 *
 * NAMED `proxy.ts`, not `middleware.ts`: Next 16 renamed the convention and the
 * old name logs a deprecation warning. The exported function must be named
 * `proxy` (or be the default export).
 *
 * WHY MIDDLEWARE AND NOT `next.config` REDIRECTS: config redirects are baked in
 * at build time, so adding one would be a deploy — exactly what
 * docs/admin-first.md rules out for an editorial action.
 *
 * WHY A MODULE-SCOPE CACHE AND NOT `next: { revalidate, tags }`: middleware does
 * not participate in the Data Cache, so the tag-based revalidation used
 * everywhere else in this app has no effect here. Instead the list is held in
 * the isolate for TTL_MS and re-fetched when stale. That means an admin change
 * takes up to a minute to apply, which is the honest trade for not putting an
 * API round trip on the critical path of every single request.
 *
 * The list is small by nature — a redirect table records URL changes, not
 * content — so fetching all of it and matching in memory beats a per-path lookup.
 *
 * CAVEAT the Next docs are explicit about: proxy code "should not attempt
 * relying on shared modules or globals", because in optimised deployments it can
 * be pushed to a CDN edge. The cache below is therefore a best-effort
 * optimisation, not a guarantee — if the isolate is recycled the list is simply
 * re-fetched. Correctness never depends on it surviving.
 */

type Rule = {
  source_path: string
  destination_path: string
  status_code: number
}

const API = process.env.API_URL
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const KEY = process.env.API_SITE_KEY

/** One minute. Long enough to be cheap, short enough that a fix lands quickly. */
const TTL_MS = 60_000

let cache: { rules: Map<string, Rule>; fetchedAt: number } | null = null
/** Shared so concurrent requests during a refresh await one fetch, not N. */
let inFlight: Promise<Map<string, Rule>> | null = null

/**
 * Canonical path form, matching `Redirect::normalisePath()` on the server.
 *
 * Both sides must agree or nothing ever matches: the server stores "/old" and a
 * visitor arriving at "/Old/" has to resolve to the same key.
 */
function normalise(path: string): string {
  if (path === '' || path === '/') return '/'
  const lowered = path.toLowerCase()
  const trimmed = lowered.endsWith('/') ? lowered.replace(/\/+$/, '') : lowered
  return trimmed === '' ? '/' : trimmed
}

async function loadRules(): Promise<Map<string, Rule>> {
  const res = await fetch(`${API}/sites/${SITE}/redirects`, {
    headers: { 'X-Site-Key': KEY as string, Accept: 'application/json' },
    // Middleware has no Data Cache; say so explicitly rather than relying on a
    // default that differs between runtimes.
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`redirects ${res.status}`)

  const body = (await res.json()) as { data: Rule[] }

  return new Map(body.data.map((rule) => [normalise(rule.source_path), rule]))
}

async function rules(): Promise<Map<string, Rule>> {
  const fresh = cache !== null && Date.now() - cache.fetchedAt < TTL_MS

  if (fresh) return cache!.rules

  if (inFlight === null) {
    inFlight = loadRules()
      .then((loaded) => {
        cache = { rules: loaded, fetchedAt: Date.now() }
        return loaded
      })
      .catch(() => {
        // Fail OPEN. A redirect list we cannot reach must never take the site
        // down — far better to serve the un-redirected URL than to 500 every
        // request because the API blinked. Serve whatever we last had, or
        // nothing, and try again on the next request.
        cache = { rules: cache?.rules ?? new Map(), fetchedAt: Date.now() }
        return cache.rules
      })
      .finally(() => {
        inFlight = null
      })
  }

  return inFlight
}

export async function proxy(request: NextRequest) {
  // Missing configuration must not break routing — the site simply does no
  // redirecting until it is configured.
  if (!API || !SITE || !KEY) return NextResponse.next()

  const path = normalise(request.nextUrl.pathname)
  const rule = (await rules()).get(path)

  if (!rule) return NextResponse.next()

  // ONE hop, deliberately. The destination is never re-resolved against the
  // rule set, so an A→B→C chain costs the visitor two requests and an A→B→A
  // pair that slipped past the server's cycle check simply cannot spin here.
  const destination = rule.destination_path.startsWith('http')
    ? new URL(rule.destination_path)
    : new URL(rule.destination_path, request.nextUrl.origin)

  // Query strings are carried over: a redirect must not silently drop the
  // campaign parameters that brought someone to the old URL.
  if (!rule.destination_path.startsWith('http')) {
    destination.search = request.nextUrl.search
  }

  return NextResponse.redirect(destination, rule.status_code === 302 ? 302 : 301)
}

export const config = {
  /**
   * Everything except Next's own internals, the site's API routes and anything
   * with a file extension.
   *
   * Without this the middleware would run for every image and script request,
   * which is pure overhead — a redirect rule only ever targets a page URL.
   */
  matcher: ['/((?!_next/|api/|.*\\.[\\w]+$).*)'],
}
