/**
 * Big Glow Day — perfume store types, shared by the admin section
 * (admin/src/perfume) and the storefront (sites/bigglowday). Mirrors
 * backend/app/Perfume/Http/Resources. Vendored by scripts/sync-shared-types.sh
 * like every other shared type.
 */

export type PerfumeGender = 'women' | 'men' | 'unisex'
export type PerfumeType = 'edp' | 'edt' | 'parfum' | 'edc' | 'extrait'
export type PerfumeNoteLayer = 'top' | 'heart' | 'base'
export type PerfumeSort = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest'

export const PERFUME_TYPES: Record<PerfumeType, string> = {
  edp: 'Eau de parfum',
  edt: 'Eau de toilette',
  parfum: 'Parfum',
  edc: 'Eau de cologne',
  extrait: 'Extrait de parfum',
}

export interface PerfumeSettings {
  site_name: string
  domain: string
  logo_path: string | null
  logo_url: string | null
  accent_color: string
  phone: string | null
  email: string | null
  hours: string | null
  whatsapp_url: string | null
  viber_url: string | null
  telegram_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  youtube_url: string | null
  topbar_sale_text: string | null
  sale_percent: number | null
  delivery_local_time: string | null
  delivery_free_from: number | null
  delivery_national_time: string | null
  bonus_percent: number | null
  samples_max_per_order: number | null
  payment_labels: string[]
  map_embed_url: string | null
  hero_eyebrow: string | null
  hero_title: string | null
  hero_text: string | null
  hero_cta_primary_label: string | null
  hero_cta_primary_url: string | null
  hero_cta_secondary_label: string | null
  hero_cta_secondary_url: string | null
  notes_title: string | null
  new_arrivals_title: string | null
  samples_title: string | null
  samples_text: string | null
  samples_steps: string[]
  samples_cta_label: string | null
  samples_cta_url: string | null
  brands_title: string | null
  stores_title: string | null
  meta_title: string | null
  meta_description: string | null
  updated_at: string | null
}

export interface PerfumeSeo {
  meta_title: string | null
  meta_description: string | null
}

export interface PerfumeBrand extends PerfumeSeo {
  id: number
  name: string
  slug: string
  description: string | null
  image_path: string | null
  image_url: string | null
  country: string | null
  featured: boolean
  active: boolean
  position: number
  products_count?: number
  updated_at: string | null
}

export interface PerfumeCategory extends PerfumeSeo {
  id: number
  name: string
  slug: string
  title: string | null
  description: string | null
  image_path: string | null
  image_url: string | null
  in_header: boolean
  active: boolean
  position: number
  products_count?: number
  updated_at: string | null
}

export interface PerfumeScentFamily {
  id: number
  name: string
  slug: string
  position: number
}

export interface PerfumeScentNote extends PerfumeSeo {
  id: number
  name: string
  slug: string
  description: string | null
  image_path: string | null
  image_url: string | null
  featured_on_home: boolean
  position: number
  products_count?: number
  updated_at: string | null
}

export interface PerfumePerfumer extends PerfumeSeo {
  id: number
  name: string
  slug: string
  description: string | null
  image_path: string | null
  image_url: string | null
  products_count?: number
  updated_at: string | null
}

export interface PerfumeVariant {
  id: number
  volume_ml: number
  label: string
  price: number | null
  old_price: number | null
  stock: number
  in_stock: boolean
  is_sample: boolean
  position: number
}

export interface PerfumeImage {
  id: number
  path: string
  url: string | null
  alt: string | null
  position: number
}

export interface PerfumeNoteRef {
  id: number
  name: string
  slug: string
}

/** A product as a catalog card (home, catalog, brand and note grids). */
export interface PerfumeProductCard {
  id: number
  slug: string
  name: string
  sku: string | null
  brand: string | null
  brand_slug: string | null
  gender: PerfumeGender
  type: PerfumeType
  type_label: string
  meta: string
  default_variant_id: number | null
  default_variant_label: string | null
  price: number | null
  old_price: number | null
  in_stock: boolean
  has_sample: boolean
  is_new: boolean
  is_on_sale: boolean
  tint: string | null
  image_url: string | null
  image_alt: string | null
  scent_family: string | null
}

export interface PerfumeProduct extends PerfumeSeo {
  id: number
  name: string
  slug: string
  sku: string | null
  gender: PerfumeGender
  type: PerfumeType
  type_label: string
  year: number | null
  country: string | null
  description: string | null
  tint: string | null
  rating: number | null
  reviews_count: number | null
  is_new: boolean
  is_on_sale: boolean
  active: boolean
  position: number
  brand_id: number
  brand: PerfumeNoteRef | null
  perfumer_id: number | null
  perfumer: PerfumeNoteRef | null
  scent_family_id: number | null
  scent_family: PerfumeNoteRef | null
  categories: (PerfumeNoteRef & { title: string | null })[]
  category_ids: number[]
  variants: PerfumeVariant[]
  images: PerfumeImage[]
  notes: Record<PerfumeNoteLayer, PerfumeNoteRef[]>
  updated_at: string | null
}

export interface PerfumeHomeCard {
  id: number
  kind: 'hero_tile' | 'service'
  number: string | null
  title: string
  text: string | null
  link_label: string | null
  url: string | null
  image_path: string | null
  image_url: string | null
  active: boolean
  position: number
}

export interface PerfumeNavItem {
  id: number
  location: 'header' | 'footer'
  group_label: string | null
  label: string
  url: string
  active: boolean
  position: number
}

export interface PerfumeStore {
  id: number
  name: string
  address: string
  hours: string | null
  map_url: string | null
  active: boolean
  position: number
}

export interface PerfumePage extends PerfumeSeo {
  id: number
  title: string
  slug: string
  body: string | null
  active: boolean
  position: number
  updated_at: string | null
}

// ── Storefront composite responses ──────────────────────────────────────────

export interface PerfumeNav {
  categories: PerfumeCategory[]
  header: PerfumeNavItem[]
  footer: { label: string; items: PerfumeNavItem[] }[]
  stores: PerfumeStore[]
}

export interface PerfumeHome {
  hero_tiles: PerfumeHomeCard[]
  services: PerfumeHomeCard[]
  note_chips: PerfumeScentNote[]
  new_arrivals: PerfumeProductCard[]
  featured_brands: PerfumeBrand[]
}

export interface PerfumeFacetOption {
  label: string
  value: string
}

export interface PerfumeFacets {
  brands: PerfumeFacetOption[]
  types: PerfumeFacetOption[]
  volumes: PerfumeFacetOption[]
  families: PerfumeFacetOption[]
  countries: PerfumeFacetOption[]
  price: { min: number | null; max: number | null }
}

export interface PerfumeFilters {
  in_stock: boolean
  on_sale: boolean
  sample: boolean
  price_min: number | null
  price_max: number | null
  brand: string[]
  type: string[]
  volume: number[]
  family: string[]
  country: string[]
  q: string
  sort: PerfumeSort
  page: number
}

export interface PerfumeListing {
  products: PerfumeProductCard[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  facets: PerfumeFacets
  filters: PerfumeFilters
}

export interface PerfumeSitemap {
  products: { slug: string; updated_at: string | null }[]
  categories: { slug: string; updated_at: string | null }[]
  brands: { slug: string; updated_at: string | null }[]
  notes: { slug: string; updated_at: string | null }[]
  perfumers: { slug: string; updated_at: string | null }[]
  pages: { slug: string; updated_at: string | null }[]
}

// ── Orders, subscribers and emails ──────────────────────────────────────────

/** The shop's workflow for an order. There is no payment step. */
export type PerfumeOrderStatus = 'new' | 'confirmed' | 'shipped' | 'done' | 'cancelled'

export const PERFUME_ORDER_STATUSES: { value: PerfumeOrderStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** A line of an order, snapshotted when it was placed. */
export interface PerfumeOrderItem {
  id: number
  brand_name: string | null
  product_name: string
  product_slug: string | null
  variant_label: string
  price: number | null
  qty: number
}

export interface PerfumeOrder {
  id: number
  reference: string
  customer_name: string
  phone: string
  email: string | null
  address: string | null
  comment: string | null
  status: PerfumeOrderStatus
  /** Sum of the priced lines in USD; null when nothing in the order had a price. */
  total: number | null
  items_count: number
  items?: PerfumeOrderItem[]
  created_at: string | null
  updated_at: string | null
}

/**
 * Somebody who used the subscribe box on the storefront.
 *
 * They receive ONE email — the confirmation, sent through SendGrid's Web API
 * with the key from the backend's .env. The shop runs no campaigns, so there
 * is no template library and no imported list.
 */
export interface PerfumeSubscriber {
  id: number
  email: string
  name: string | null
  active: boolean
  unsubscribed_at: string | null
  last_sent_at: string | null
  created_at: string | null
}

/** What the storefront posts to place an order. */
export interface PerfumeOrderPayload {
  customer_name: string
  phone: string
  email?: string | null
  address?: string | null
  comment?: string | null
  items: { variant_id: number; qty: number }[]
}
