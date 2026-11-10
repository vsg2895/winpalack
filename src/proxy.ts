import { NextResponse, type NextRequest } from 'next/server'
import { canonicalRedirect } from '@/lib/seo/redirects'
import { homeViewPublicPath, homeViewRewrite } from '@/lib/seo/homeView'

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

/**
 * A value held for TTL_MS, re-fetched when stale. Concurrent callers during a
 * refresh share one fetch, not N. A failed fetch FAILS OPEN: it serves whatever
 * was last loaded (or `empty()`) and stamps that as fresh, so the next attempt
 * waits a full TTL instead of hammering an API that just blinked.
 */
function ttlCache<T>(load: () => Promise<T>, empty: () => T): () => Promise<T> {
  let cache: { value: T; fetchedAt: number } | null = null
  let inFlight: Promise<T> | null = null

  return () => {
    if (cache !== null && Date.now() - cache.fetchedAt < TTL_MS) return Promise.resolve(cache.value)

    if (inFlight === null) {
      inFlight = load()
        .then((loaded) => {
          cache = { value: loaded, fetchedAt: Date.now() }
          return loaded
        })
        .catch(() => {
          cache = { value: cache?.value ?? empty(), fetchedAt: Date.now() }
          return cache.value
        })
        .finally(() => {
          inFlight = null
        })
    }

    return inFlight
  }
}

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

/**
 * Fail OPEN: a redirect list we cannot reach must never take the site down —
 * far better to serve the un-redirected URL than to 500 every request because
 * the API blinked.
 */
const rules = ttlCache(loadRules, () => new Map<string, Rule>())

export async function proxy(request: NextRequest) {
  /*
   * CANONICAL URL RULES FIRST, and before any network call.
   *
   * They are static, they cost nothing, and they must not depend on the
   * admin-managed table being reachable — a www. host or a `?page=1` has to
   * 301 even while the API is down. See lib/seo/redirects.ts for the rules and
   * for why they cannot live in next.config.ts.
   *
   * An admin rule for the same path still wins afterwards, because this layer
   * only ever rewrites a URL into its own canonical spelling: an editorial
   * redirect targets a path, and the canonical spelling of that path is what
   * gets looked up below.
   */
  const canonical = canonicalRedirect(request)
  if (canonical) return NextResponse.redirect(canonical, 301)

  // The home page's internal view route is not a URL of its own: send a direct
  // request for it to the `/?…` it stands for (lib/seo/homeView.ts).
  const homePublic = homeViewPublicPath(request.nextUrl.pathname)
  if (homePublic) return NextResponse.redirect(new URL(homePublic, request.nextUrl.origin), 301)

  // Missing configuration must not break routing — the site simply does no
  // redirecting until it is configured.
  if (!API || !SITE || !KEY) return pass(request)

  const path = normalise(request.nextUrl.pathname)
  const rule = (await rules()).get(path)

  if (!rule) {
    // A deleted news post: 410 Gone, not the page's 404 — see goneNews(). An
    // admin redirect for the same URL (above) still wins, so an editor can
    // send a removed story's links to its replacement instead.
    const goneSlug = newsSlug(path)
    if (goneSlug && (await goneNews()).has(goneSlug)) return gone()

    return pass(request)
  }

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

/**
 * DELETED NEWS POSTS answer 410 Gone.
 *
 * A Next page cannot send 410 (notFound() is a 404), so the proxy does it.
 * Search engines drop a 410 sooner than a 404, which they keep re-crawling in
 * case it comes back. The slugs come from the API's `news/gone` list (posts
 * deleted in the last NEWS_GONE_DAYS), held for TTL_MS like the redirect
 * rules, and fetched only when a `/news/<slug>` URL is requested.
 *
 * Fails OPEN like the redirects: with the list unreachable the page renders
 * and answers its usual 404.
 */
/** The slug of a `/news/<slug>` path, or null. Paths arrive normalised. */
function newsSlug(path: string): string | null {
  const match = /^\/news\/([a-z0-9-]+)$/.exec(path)
  return match && match[1] !== 'most-popular' ? match[1] : null
}

async function loadGone(): Promise<Set<string>> {
  const res = await fetch(`${API}/sites/${SITE}/news/gone`, {
    headers: { 'X-Site-Key': KEY as string, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`news/gone ${res.status}`)

  const body = (await res.json()) as { data: string[] }

  return new Set(body.data.map((slug) => slug.toLowerCase()))
}

const goneNews = ttlCache(loadGone, () => new Set<string>())

/** A small self-contained page: the proxy cannot render the app's layout. */
function gone(): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>This article has been removed</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}main{max-width:32rem;text-align:center}h1{font-size:1.75rem;margin:0 0 .75rem}p{color:#475569;line-height:1.6}a{color:#047857;font-weight:600}</style>
</head><body><main><h1>This article has been removed</h1>
<p>The story you are looking for is no longer available.</p>
<p><a href="/news">Read the latest news</a> &middot; <a href="/">Home</a></p></main></body></html>`

  return new NextResponse(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

/**
 * No redirect applies: serve the request, rewriting the home page's `?page=` /
 * `?country=` views to their cacheable internal route (SEO audit O4). The
 * address bar keeps the public URL.
 */
function pass(request: NextRequest): NextResponse {
  const internal = homeViewRewrite(request.nextUrl)

  return internal ? NextResponse.rewrite(new URL(internal, request.nextUrl.origin)) : NextResponse.next()
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
