/**
 * THE definition of a canonical URL for this site.
 *
 * Google Search Console was reporting hundreds of "Alternate page with proper
 * canonical tag" URLs across every domain in the network. None of them were
 * canonical-tag bugs: the tags were right, and Google was telling us it had
 * crawled a pile of URLs we ourselves linked to and then thrown them away. The
 * waste was in the links and in nine separate re-implementations of the same
 * "page number only when past the first" rule, each of which could drift on its
 * own.
 *
 * So the rule lives in exactly one place, and it is deliberately strict:
 *
 *   1. `page` is the ONLY query parameter a canonical URL may carry. A filter
 *      (`category`, `country`) produces a different VIEW of the same list, not
 *      a different page — the canonical points at the unfiltered route and the
 *      filtered view is a facet of it.
 *   2. Page 1 is the bare path. `?page=1` and the path it decorates are the
 *      same document, and linking both is how a crawl budget gets spent twice
 *      for one page.
 *   3. Paths are returned WITHOUT a host. Next resolves `alternates.canonical`
 *      and `openGraph.url` against `metadataBase` (set once, in the root
 *      layout, from `SITE_URL`), so the host is named in one place per site and
 *      cannot drift per page. Use `canonicalUrl()` only where an absolute URL
 *      is genuinely required — JSON-LD and the sitemap.
 *
 * These three rules are also what `canonicalRedirect()` in ./redirects.ts
 * enforces at the edge. The pair has to agree: a page that declares a canonical
 * the redirect layer would bounce is a redirect loop, and a URL the redirect
 * layer leaves alone but no page claims is an orphan. Both read this module.
 */
import { SITE_URL } from '../config'

/** The one query parameter allowed in a canonical URL. */
export const PAGE_PARAM = 'page'

/**
 * A path in canonical FORM: leading slash, no query, no hash, no trailing
 * slash. The root is the single exception — it is `/`, not the empty string.
 *
 * Query and hash are stripped rather than rejected on purpose: callers pass
 * route paths they built themselves, and silently dropping a stray `?page=2`
 * here is what stops it being appended twice by `canonicalPath()` below.
 */
export function normalisePath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0]
  const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  const trimmed = withSlash.replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}

/**
 * The canonical path for a listing view.
 *
 * `canonicalPath('/casinos')` → `/casinos`
 * `canonicalPath('/casinos', 1)` → `/casinos`      ← NOT `/casinos?page=1`
 * `canonicalPath('/casinos', 3)` → `/casinos?page=3`
 */
export function canonicalPath(path: string, page: number = 1): string {
  const base = normalisePath(path)
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1

  return safePage > 1 ? `${base}?${PAGE_PARAM}=${safePage}` : base
}

/**
 * The same thing, absolute. For JSON-LD and the sitemap, which cannot use a
 * relative URL — nothing resolves `metadataBase` for them.
 */
export function canonicalUrl(path: string, page: number = 1): string {
  return `${SITE_URL}${canonicalPath(path, page)}`
}

/**
 * The href for one page of a paginator.
 *
 * Unlike `canonicalPath`, this one KEEPS the active filters: a paginator that
 * dropped `?country=de` would silently reset the visitor's filter on every page
 * change. It only ever normalises the `page` parameter itself — removing an
 * existing one so a base path that already carries `page` cannot accumulate a
 * second, and omitting it entirely for page 1.
 *
 * `pageHref('/casinos', 1)`              → `/casinos`
 * `pageHref('/casinos', 2)`              → `/casinos?page=2`
 * `pageHref('/?category=slots', 1)`      → `/?category=slots`
 * `pageHref('/?category=slots&page=9', 2)` → `/?category=slots&page=2`
 */
export function pageHref(basePath: string, page: number): string {
  const [rawPath = '/', rawQuery = ''] = basePath.split('?')
  const params = new URLSearchParams(rawQuery)
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1

  // Always dropped first: the incoming base path may already carry one, and the
  // old implementation appended regardless, producing `?page=1&page=2`.
  params.delete(PAGE_PARAM)
  if (safePage > 1) params.set(PAGE_PARAM, String(safePage))

  const query = params.toString()
  const path = normalisePath(rawPath)

  return query ? `${path}?${query}` : path
}
