import type { ApiResponse, PaginatedResponse } from '@shared/types/api'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { Category } from '@shared/types/category'
import type { CmsPage } from '@shared/types/cmsPage'
import type { SpecialOffer } from '@shared/types/specialOffer'
import type { SocialLink } from '@shared/types/socialLink'
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
export const getCategories = (): Promise<ApiResponse<Category[]>> =>
  publicFetch('/categories', ['categories'])

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

export const getCategory = (slug: string, page = 1): Promise<ApiResponse<CategoryWithCasinos>> =>
  publicFetch(`/categories/${slug}?page=${page}`, [`category:${slug}`])

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
export const verifyEmail = async (token: string): Promise<boolean> => {
  const base = API.replace(/\/public\/?$/, '')
  const res = await fetch(`${base}/verify/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  return res.ok
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
