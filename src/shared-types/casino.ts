import type { Category } from './category'
import type { CasinoDetail } from './casinoDetail'
import type { ResolvedSeo } from './seo'
import type { Country } from './country'
import type { SpecialOffer } from './specialOffer'

// Per-site row in the casinos list shown in the admin (CasinoResource "sites").
export interface CasinoSiteRow {
  site_id: number
  site_name: string
  site_slug: string
  site_domain: string
  site_url: string
  affiliate_url: string
  position: number
  featured: boolean
  active: boolean
}

// Fields match CasinoResource.php (admin-facing).
export interface Casino {
  id: number
  name: string
  slug: string
  image_path: string | null
  banner_image: string | null
  bonuses: string | null
  affiliate_url: string | null
  description: string | null
  rating: number
  sort_order: number
  featured_special_offer_id: number | null
  /** Intro copy that publishes the operator's bonuses sub-page. */
  bonuses_intro?: string | null
  /**
   * The date a PERSON re-checked this operator. Distinct from `updated_at`,
   * which any field change bumps — null means nobody has recorded a review, and
   * the site must not imply one happened.
   */
  reviewed_at?: string | null
  meta_title: string | null
  meta_description: string | null
  active: boolean
  category_ids?: number[]
  categories?: Category[]
  /** Countries this casino accepts players from. Loaded on show/store/update, not on the list. */
  country_ids?: number[]
  countries?: Country[]
  special_offers?: SpecialOffer[]
  sites?: CasinoSiteRow[]
  created_at: string
  updated_at: string
}

// Pivot override fields set per-site in casino_site (the per-site affiliate URL wins).
export interface CasinoSiteAttachment {
  affiliate_url: string
  position: number
  featured: boolean
}

// Returned by the public API — casino merged with the site's attachment overrides.
// Matches CasinoWithAttachmentResource.php.
export interface CasinoWithAttachment {
  id: number
  name: string
  slug: string
  image_path: string | null
  banner_image: string | null
  bonuses: string | null
  description: string | null
  rating: number
  meta_title: string | null
  meta_description: string | null
  categories?: Category[]
  countries?: Country[]
  special_offers?: SpecialOffer[]
  featured_special_offer?: SpecialOffer | null
  /**
   * The factual profile. ABSENT (not an empty object) when nothing has been
   * filled in, so `detail` being undefined is the "no profile" signal.
   */
  detail?: CasinoDetail
  /**
   * Intro copy for /casinos/{slug}/bonuses. Null means that page is not
   * published — the sub-page requires real copy or it is a thin duplicate.
   */
  bonuses_intro?: string | null
  /**
   * The date a PERSON re-checked this operator. Distinct from `updated_at`,
   * which any field change bumps. Null means no review was recorded, and the
   * site must not imply one happened.
   */
  reviewed_at?: string | null
  /** Server-resolved SEO. Additive — meta_title/meta_description are unchanged. */
  seo?: ResolvedSeo
  updated_at: string
  attachment: CasinoSiteAttachment
}
