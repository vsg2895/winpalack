import type { ApiResponse, PaginatedResponse } from '@shared/types/api'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { Category } from '@shared/types/category'
import type { Continent, Country } from '@shared/types/country'
import type { PublicCasinoReviewsResponse, PublicReviewFeedResponse } from '@shared/types/casinoReview'
import type { CmsPage } from '@shared/types/cmsPage'
import type { SpecialOffer } from '@shared/types/specialOffer'
import type { SocialLink } from '@shared/types/socialLink'
import type { SiteNavigation } from '@shared/types/navItem'
import type { Facet } from '@shared/types/facet'
import type { SiteEditorial } from '@shared/types/editorial'
import type { Article } from '@shared/types/article'
import { API_URL } from './config'

const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

if (!KEY) {
  throw new Error('API_SITE_KEY is required (server-side env)')
}

if (!SITE) {
  throw new Error('NEXT_PUBLIC_SITE_SLUG is required')
}

if (!API) {
  throw new Error('API_URL is required')
}

async function publicFetch<T>(path: string, tags: string[] = []): Promise<T> {
  const res = await fetch(`${API}/sites/${SITE}${path}`, {
    headers: {
      'X-Site-Key': KEY as string,
      Accept: 'application/json',
    },
    next: { revalidate: 3600, tags: [`site:${SITE}`, ...tags] },
  })

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Casinos ──────────────────────────────────────────────────────────────────
export const getCasinos = (): Promise<ApiResponse<CasinoWithAttachment[]>> =>
  publicFetch('/casinos', ['casinos'])

export const getCasino = (slug: string): Promise<ApiResponse<CasinoWithAttachment>> =>
  publicFetch(`/casinos/${slug}`, [`casino:${slug}`])

// ── Categories ───────────────────────────────────────────────────────────────
/**
 * Categories with their per-site casino counts.
 *
 * `country` NESTS the categories inside the country filter: omitted, the counts
 * cover every casino on the site; supplied, they cover only that country's — so
 * the number on a chip always matches what clicking it shows.
 */
export const getCategories = (country?: string): Promise<ApiResponse<Category[]>> =>
  publicFetch(
    country ? `/categories?country=${encodeURIComponent(country)}` : '/categories',
    ['categories'],
  )

export interface CategoryCasinosMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface CategoryWithCasinos {
  category: Category
  casinos: CasinoWithAttachment[]
  meta: CategoryCasinosMeta
}

export const getCategory = (
  slug: string,
  page = 1,
  country?: string,
): Promise<ApiResponse<CategoryWithCasinos>> =>
  publicFetch(
    `/categories/${slug}?page=${page}${country ? `&country=${encodeURIComponent(country)}` : ''}`,
    [`category:${slug}`],
  )

/**
 * A fetch that tolerates a 404.
 *
 * The countries and reviews endpoints 404 when the SITE has that feature
 * switched off, which is a normal state rather than an error — so those callers
 * need "not available" instead of a thrown exception.
 */
async function optionalFetch<T>(path: string, tags: string[] = []): Promise<T | null> {
  const res = await fetch(`${API}/sites/${SITE}${path}`, {
    headers: { 'X-Site-Key': KEY as string, Accept: 'application/json' },
    next: { revalidate: 3600, tags: [`site:${SITE}`, ...tags] },
  })

  if (res.status === 404) return null

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Site feature switches ────────────────────────────────────────────────────

export interface SiteFeatures {
  countries_enabled: boolean
  reviews_enabled: boolean
  /** Whether the casino page renders the factual operator profile. */
  operator_profile_enabled: boolean
  /** Whether this site publishes editorial guides. */
  guides_enabled: boolean
  /**
   * Whether the combined forum page is published.
   *
   * The API already ANDs this with `reviews_enabled` — a site that stopped
   * collecting reviews has no forum — so the front end can treat it as the
   * single answer for "does /forum exist".
   */
  forum_enabled: boolean
}

/**
 * Which optional surfaces this site publishes.
 *
 * Advisory: the endpoints enforce their own switches, so this only decides what
 * to RENDER — the nav link, the section, the form.
 *
 * Fails CLOSED, unlike hasSpecialOffers() which fails open. The difference is
 * what a wrong guess costs: a missing "Special Offers" link is a cosmetic loss,
 * whereas wrongly showing a reviews form on a site with reviews off would render
 * a form whose every submission 404s. Silence beats a broken control.
 */
export const getSiteFeatures = async (): Promise<SiteFeatures> => {
  try {
    const res = await publicFetch<ApiResponse<SiteFeatures>>('/features', ['features'])
    return res.data
  } catch {
    return {
      countries_enabled: false,
      reviews_enabled: false,
      operator_profile_enabled: false,
      guides_enabled: false,
      forum_enabled: false,
    }
  }
}

// ── Countries ────────────────────────────────────────────────────────────────
// The whole grid arrives in ONE response: continents in order, each with its
// countries. Null means this site has the feature switched off.

export const getCountries = (): Promise<ApiResponse<Continent[]> | null> =>
  optionalFetch('/countries', ['countries'])

export interface CountryWithCasinos {
  country: Country
  casinos: CasinoWithAttachment[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export const getCountry = (
  slug: string,
  page = 1,
): Promise<ApiResponse<CountryWithCasinos> | null> =>
  optionalFetch(`/countries/${slug}?page=${page}`, [`country:${slug}`, 'countries'])

// ── Casino reviews ───────────────────────────────────────────────────────────
// Published reviews only — anything awaiting moderation never reaches the API.
// Null means this site has reviews switched off.

export const getCasinoReviews = (
  casinoSlug: string,
  page = 1,
): Promise<ApiResponse<PublicCasinoReviewsResponse> | null> =>
  optionalFetch(`/casinos/${casinoSlug}/reviews?page=${page}`, ['reviews', `casino:${casinoSlug}`])

/**
 * The forum index: every published review on this site, grouped by casino.
 *
 * Paginates CASINOS rather than reviews, so a page is a set of complete-looking
 * threads instead of an arbitrary slice through unrelated operators.
 *
 * Shares the `reviews` tag with the per-casino endpoint, so publishing a single
 * review in the admin rebuilds both this page and that casino's page from the
 * one invalidation the moderation screen already sends.
 */
export const getReviewFeed = (
  page = 1,
): Promise<ApiResponse<PublicReviewFeedResponse> | null> =>
  optionalFetch(`/reviews?page=${page}`, ['reviews', 'casinos'])

// ── Special Offers ───────────────────────────────────────────────────────────
export const getSpecialOffers = (
  category?: string,
  limit?: number,
): Promise<ApiResponse<SpecialOffer[]>> => {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (limit && limit > 0) params.set('limit', String(limit))
  const qs = params.toString()
  return publicFetch(`/special-offers${qs ? `?${qs}` : ''}`, ['special-offers'])
}

export const getSpecialOffer = (slug: string): Promise<ApiResponse<SpecialOffer>> =>
  publicFetch(`/special-offers/${slug}`, [`special-offer:${slug}`])

/**
 * Does this site have at least one visible special offer?
 *
 * Drives the "Special Offers" nav item: with nothing to show, the link would
 * lead to an empty page, so the layout drops it from the header and footer.
 * Asks for a single row and shares the `special-offers` cache tag, so it costs
 * next to nothing and flips back the moment an offer is published.
 *
 * Fails open — a transient API error must not silently strip navigation.
 */
export const hasSpecialOffers = async (): Promise<boolean> => {
  try {
    return (await getSpecialOffers(undefined, 1)).data.length > 0
  } catch {
    return true
  }
}

// ── Social links (footer) ────────────────────────────────────────────────────
export const getSocialLinks = (): Promise<ApiResponse<SocialLink[]>> =>
  publicFetch('/social-links', ['social-links'])

// ── Newsletter unsubscribe (RFC 8058 one-click, token-based) ──────────────────
// Server-side only; never cached. Hits the keyless one-click endpoint, so it
// needs no site key and works no matter which site serves this page — the opaque
// token is the credential. The backend is idempotent (unknown tokens resolve ok).
export const unsubscribe = async (token: string): Promise<boolean> => {
  // API is e.g. http://localhost:8000/api/v1/public → drop the trailing /public.
  const base = API.replace(/\/public\/?$/, '')
  const res = await fetch(`${base}/unsubscribe/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  return res.ok
}

// ── Newsletter double opt-in verify (token-based) ─────────────────────────────
// Server-side only; never cached. Keyless like unsubscribe — the opaque token is
// the credential, so it works from any site. Marks the subscriber verified; the
// backend is idempotent (unknown/already-verified tokens still resolve ok).
export interface VerifyResult {
  /** Whether the request reached the API at all. */
  ok: boolean
  /**
   * Whether a bonus email is genuinely on its way to this subscriber.
   *
   * The API returns true ONLY when this click is the one that verified them AND
   * the post-verification promotion is switched on — so the landing page never
   * promises an email that will not arrive, on a second visit or while the
   * feature is disabled.
   */
  bonusEmailExpected: boolean
}

export const verifyEmail = async (token: string): Promise<VerifyResult> => {
  const base = API.replace(/\/public\/?$/, '')
  const res = await fetch(`${base}/verify/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) return { ok: false, bonusEmailExpected: false }

  // A body that will not parse must not promise a bonus.
  const data = (await res.json().catch(() => ({}))) as { bonus_email_expected?: unknown }

  return { ok: true, bonusEmailExpected: data.bonus_email_expected === true }
}

// ── CMS / Legal pages (site-scoped, published only) ──────────────────
export const getPage = async (slug: string): Promise<CmsPage | null> => {
  const res = await fetch(`${API}/sites/${SITE}/pages/${slug}`, {
    headers: { 'X-Site-Key': KEY as string, Accept: 'application/json' },
    next: { revalidate: 3600, tags: [`site:${SITE}`, `page:${slug}`] },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`API /pages/${slug} failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: CmsPage }
  return json.data
}

export type { PaginatedResponse }

// ── Navigation ───────────────────────────────────────────────────────────────

/**
 * This site's header and footer menus, or null when it has none configured.
 *
 * Null is the "fall back to the links in code" signal, and it covers BOTH the
 * "no rows yet" case and an API failure. Fails closed the same way
 * getSiteFeatures() does: a menu is structural, and rendering a header with no
 * links at all would be worse than rendering the built-in ones.
 */
export const getNavigation = async (): Promise<SiteNavigation | null> => {
  try {
    const res = await publicFetch<ApiResponse<SiteNavigation>>('/navigation', ['navigation'])
    const nav = res.data
    return nav.header.length === 0 && nav.footer.length === 0 ? null : nav
  } catch {
    return null
  }
}

// ── Casino facets ────────────────────────────────────────────────────────────

/**
 * Filters this site should render, with their available values.
 *
 * Returns [] on failure rather than throwing: a listing that loses its filters
 * is degraded, one that fails to render is broken.
 */
export const getCasinoFacets = async (): Promise<Facet[]> => {
  try {
    const res = await publicFetch<ApiResponse<Facet[]>>('/casinos/facets', ['casinos'])
    return res.data
  } catch {
    return []
  }
}

/**
 * Casinos, optionally filtered.
 *
 * With no filters this is the same request `getCasinos()` makes, and hits the
 * same cache entry.
 */
export const getFilteredCasinos = (
  filters: Record<string, string>,
): Promise<ApiResponse<CasinoWithAttachment[]>> => {
  const entries = Object.entries(filters).filter(([, v]) => v !== '')
  const qs = entries.length > 0 ? `?${new URLSearchParams(entries).toString()}` : ''
  return publicFetch(`/casinos${qs}`, ['casinos'])
}

// ── Editorial identity ───────────────────────────────────────────────────────

/**
 * Who stands behind this site's reviews.
 *
 * Fails CLOSED — an unreachable endpoint yields no author rather than a partial
 * byline. Asserting that a named person checked something is exactly the claim
 * that must never be made by accident.
 */
export const getEditorial = async (): Promise<SiteEditorial> => {
  try {
    const res = await publicFetch<ApiResponse<SiteEditorial>>('/editorial', ['editorial'])
    return res.data
  } catch {
    return { author: null, methodology_page_slug: null }
  }
}

// ── Guides ───────────────────────────────────────────────────────────────────
// Both endpoints 404 when the site has guides switched off, so null is the
// "this site has no guides" signal and the routes render nothing rather than
// erroring.

export const getArticles = async (): Promise<Article[]> => {
  try {
    const res = await publicFetch<ApiResponse<Article[]>>('/articles', ['articles'])
    return res.data
  } catch {
    return []
  }
}

export const getArticle = async (slug: string): Promise<Article | null> => {
  try {
    const res = await publicFetch<ApiResponse<Article>>(`/articles/${slug}`, [
      'articles',
      `article:${slug}`,
    ])
    return res.data
  } catch {
    return null
  }
}
