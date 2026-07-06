import type { Category } from './category'
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
  meta_title: string | null
  meta_description: string | null
  active: boolean
  category_ids?: number[]
  categories?: Category[]
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
  special_offers?: SpecialOffer[]
  featured_special_offer?: SpecialOffer | null
  updated_at: string
  attachment: CasinoSiteAttachment
}
