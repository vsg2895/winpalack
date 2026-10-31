import type { NextRequest } from 'next/server'
import { SITE_URL } from '../config'
import { PAGE_PARAM } from './canonical'

/**
 * Edge-side enforcement of the canonical URL rules in ./canonical.ts.
 *
 * Every non-canonical form we have ever linked, or that Search Console has
 * reported crawling, resolves to its canonical form with a 301 — so a crawler
 * that finds an old URL in its index, a backlink, or a bookmark is told once
 * where the page actually lives instead of being served a duplicate that
 * canonical-tags elsewhere.
 *
 * ONE HOP, ALWAYS. Every rule below mutates the same cloned URL and the caller
 * issues a single redirect at the end, so `www.site.com/casinos?page=1` costs
 * the visitor exactly one round trip rather than one per rule. That is also why
 * this is a pure function returning a URL-or-null instead of a chain of
 * middleware returns.
 *
 * WHY MIDDLEWARE AND NOT `next.config.ts` REDIRECTS: a config redirect appends
 * every query parameter the destination did not consume. A rule that strips
 * `page=1` would therefore have `page=1` re-appended to its own destination and
 * redirect to itself, forever. Middleware is the only layer that can REMOVE a
 * query parameter.
 *
 * Returns the absolute redirect TARGET, or `null` when the request is already
 * canonical — which is the common case and must stay allocation-cheap.
 *
 * ALWAYS ABSOLUTE. Next's middleware runtime parses the `Location` of a
 * redirect returned from here and rejects a relative one outright
 * (`ERR_INVALID_URL`, i.e. a 500 on every single `?page=1`); it then
 * RELATIVISES a target whose origin matches its own view of the request. Both
 * behaviours were measured, not assumed. The second one is load-bearing: a
 * path-only fix comes back out as a relative Location and so keeps whatever
 * host served the request (staging included), while a host or scheme fix
 * genuinely changes the origin and therefore goes out absolute.
 */

/** Authoritative host for this site — the same single source as every canonical tag. */
const CANONICAL = new URL(SITE_URL)

/**
 * Shape of a category slug, matching the backend's own slug rules.
 *
 * A `?category=` value that is not slug-shaped is left in place rather than
 * redirected: it cannot be a real category, so the only thing a redirect would
 * achieve is turning somebody's mangled link into a 404 at a URL we invented.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Pages rendered whole, so a `page` parameter can only make a copy: two listings,
 * and every single offer, casino review, guide, news article and forum thread.
 * The item pattern is ONE segment deep on purpose: `/casinos` itself is
 * paginated, and winpalack's `/casinos/<slug>/bonuses` handles its own `page`
 * (it 404s past page one). `/news/most-popular` is a paginated listing, not an
 * article. A thread pages by `?after=` (rule 2d), never by `page`.
 */
const UNPAGINATED = new Set(['/categories', '/special-offers'])
const UNPAGINATED_ITEM =
  /^\/(?:(?:special-offers|casinos|guides)\/[^/]+|news\/(?!most-popular$)[^/]+|forum\/[^/]+\/[^/]+)$/

/** A forum thread, `/forum/<board>/<thread>` — the one route keyset-paginated by `?after=`. */
const FORUM_THREAD = /^\/forum\/[^/]+\/[^/]+$/

export function canonicalRedirect(request: NextRequest): string | null {
  const url = request.nextUrl.clone()
  let changed = false

  /*
   * ── 1. HOST AND SCHEME ────────────────────────────────────────────────────
   *
   * `www.` → apex, and http → https, decided HERE rather than in nginx — which
   * is the whole reason this block looks the way it does.
   *
   * WHY NOT NGINX. It was in nginx, and it produced a chain. nginx knows the
   * host but nothing about `?category=`; this module knows the paths but was
   * not allowed to touch the host. So
   * `http://www.site.com/casinos?category=most-popular&page=1` cost TWO hops:
   * nginx to `https://site.com/casinos?category=most-popular&page=1`, then this
   * module to `/categories/most-popular`. Whichever layer owns only half the
   * rules cannot avoid that. One layer has to own all of them, and it has to be
   * this one, because the path rules can only live here (see the note above on
   * why `next.config.ts` cannot remove a query parameter).
   *
   * nginx therefore PROXIES the `www.` host and port 80 instead of redirecting
   * them, forwarding `Host` and `X-Forwarded-Proto` so this code can see what
   * the visitor actually asked for. See deploy/nginx-canonical-host.conf.
   *
   * WHY THE HEADERS AND NOT `url.host`. `request.nextUrl` is built from the URL
   * the Node process received, so behind a proxy its host is the INTERNAL one
   * (localhost:3002) and its scheme is always http. Reading the host from
   * `nextUrl` — which is what this did before — meant the rule could only fire
   * when Next itself saw the public host, i.e. never in production.
   *
   * LOOP SAFETY, which is the thing to get right. The target origin is pinned
   * ONLY when the forwarded host is this site's own apex or `www.` form. Any
   * other host — a preview deployment, a bare IP, localhost, a misconfigured
   * proxy that forwards nothing — falls through with the origin untouched, so
   * the response is a same-origin (therefore relative) Location that cannot
   * bounce the visitor back to where they came from. A missing
   * `X-Forwarded-Proto` likewise disables only the scheme half: unknown is
   * treated as "already correct", never as "redirect and hope".
   */
  const forwardedHost = request.headers.get('x-forwarded-host')
  // A header may legitimately arrive comma-joined through two proxies; the
  // FIRST value is the one the client sent.
  const host = (forwardedHost ?? request.headers.get('host') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  const proto = (request.headers.get('x-forwarded-proto') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()

  const isApex = host === CANONICAL.host
  const isWww = host === `www.${CANONICAL.host}`
  // Only meaningful when the proxy actually told us; '' means "no opinion".
  const wrongScheme = proto !== '' && `${proto}:` !== CANONICAL.protocol

  if (isWww || (isApex && wrongScheme)) {
    // Both fields come from SITE_URL, never from the request, so one rewrite
    // settles host AND scheme — `http://www.site.com/x` reaches
    // `https://site.com/x` without an intermediate `http://site.com/x`.
    url.protocol = CANONICAL.protocol
    url.host = CANONICAL.host
    url.port = CANONICAL.port
    changed = true
  }

  // ── 2. any `page` that MEANS page one → no page parameter ──────────────────
  // `/casinos` and `/casinos?page=1` are one document, and page 1 was linked
  // explicitly by every paginator on the site until this landed.
  //
  // Not just the literal `1`: every page in this app clamps its page number
  // with `Math.max(1, Number(raw) || 1)`, so `?page=0`, `?page=-3`, `?page=abc`
  // and `?page=01` all render page one too — each at its own URL, each with a
  // self-referencing canonical, each therefore its own indexable copy of the
  // same list. One crawled link with a typo in it was enough to mint one. The
  // test below mirrors that clamp exactly, so the set of URLs this collapses is
  // precisely the set the app cannot tell apart.
  const page = url.searchParams.get(PAGE_PARAM)
  if (page !== null && Math.max(1, Number(page) || 1) === 1) {
    url.searchParams.delete(PAGE_PARAM)
    changed = true
  }

  // ── 2b. any other spelling of page N → `?page=N` ───────────────────────────
  // The same clamp lets `?page=02`, `?page=2.0` and `?page=2.5` reach a page,
  // and each rendered a 200 at its own URL: `02` a copy of page 2, `2.5` a page
  // titled "Page 2.5", and on a listing that floors the number (the forum
  // boards), `?page=1.5` a copy of page 1. Every one of them asks to be indexed.
  // Truncating here gives each one the single address the paginator links.
  // Non-finite values are left alone: no page renders them, they 404.
  else if (page !== null) {
    const whole = Math.trunc(Number(page))
    if (Number.isFinite(whole) && String(whole) !== page) {
      if (whole <= 1) url.searchParams.delete(PAGE_PARAM)
      else url.searchParams.set(PAGE_PARAM, String(whole))
      changed = true
    }
  }

  // ── 2c. a page number on a page that has no pages → that page ─────────────
  // `/categories` and `/special-offers` list everything on one page, and an
  // offer, a casino review, a guide, a news article or a forum thread is one
  // page, but the clamp above let `?page=2` (or `?page=999`) render each again
  // at its own URL: HTTP 200, the same content, an index robots tag. The
  // canonical already named the bare path, so this is the redirect that
  // canonical was asking for. Done here rather than with a 404 in
  // the page because on most sites the two hubs are prerendered, and reading
  // `searchParams` there would make them render on every request.
  if (
    (UNPAGINATED.has(url.pathname) || UNPAGINATED_ITEM.test(url.pathname)) &&
    url.searchParams.has(PAGE_PARAM)
  ) {
    url.searchParams.delete(PAGE_PARAM)
    changed = true
  }

  // ── 2d. a forum cursor the API would ignore → no cursor ────────────────────
  // The API reads `?after=` only as a positive integer and treats anything
  // else as no cursor at all (ForumController::cursor), so `?after=`,
  // `?after=abc` and `?after=-5` each rendered the thread's FIRST page at a URL
  // of its own; the empty one even as `index`. A cursor that only spells a
  // real one differently (`?after=042`) goes to its single spelling.
  const after = url.searchParams.get('after')
  if (after !== null && FORUM_THREAD.test(url.pathname)) {
    if (!/^\d+$/.test(after) || Number(after) === 0) {
      url.searchParams.delete('after')
      changed = true
    } else if (String(Number(after)) !== after) {
      url.searchParams.set('after', String(Number(after)))
      changed = true
    }
  }

  // ── 3. /?category=<slug> → /categories/<slug> ──────────────────────────────
  // The home page's category chips used to be in-page filters, so the home page
  // existed once per category with a canonical pointing back at `/`. The
  // category route is the canonical home of a filtered list; send the query
  // form there and keep any other filter (`country`) along for the ride.
  const category = url.searchParams.get('category')
  if (url.pathname === '/' && category !== null && SLUG.test(category)) {
    url.pathname = `/categories/${category}`
    url.searchParams.delete('category')
    changed = true
  }

  // ── 4. a redundant ?category= on a route that IS that category ─────────────
  // `/categories/betting?category=betting` and `/casinos?category=betting` both
  // say the same thing twice. The first is a self-duplicate; the second is the
  // query form of the route in rule 3 (also covered by the build-time redirect
  // in next.config.ts — this one exists so it can be folded into the SAME hop
  // as rules 1 and 2 instead of chaining after them).
  if (url.searchParams.has('category')) {
    const slug = url.searchParams.get('category') ?? ''

    if (url.pathname.startsWith('/categories/')) {
      url.searchParams.delete('category')
      changed = true
    } else if (url.pathname === '/casinos' && SLUG.test(slug)) {
      url.pathname = `/categories/${slug}`
      url.searchParams.delete('category')
      changed = true
    }
  }

  /*
   * NO trailing-slash rule here. Measured, not assumed: `/casinos/` already
   * gets a 308 to `/casinos` from Next's own `trailingSlash: false` handling,
   * which is evaluated BEFORE middleware — a rule here would be unreachable
   * code pretending to be a safeguard.
   */
  if (!changed) return null

  // Absolute, per the note at the top of this function. Next relativises it
  // again when the origin matches its own, which is correct for every rule but
  // the host one — and the host rule only fires when the origin really differs.
  return url.toString()
}
