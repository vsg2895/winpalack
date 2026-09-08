import type { Casino } from './casino'
import type { ResolvedSeo } from './seo'

// Fields match SpecialOfferResource.php. A Special Offer belongs to a Casino.
export interface SpecialOffer {
  id: number
  casino_id: number
  casino?: Casino
  title: string
  slug: string
  image_path: string | null
  banner_image: string | null
  bonuses: string | null
  affiliate_url: string | null
  description: string | null
  rating: number
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
  /** Server-resolved SEO. Offers have no meta columns, so title comes from the site pattern. */
  seo?: ResolvedSeo
  /** Structured bonus terms. Additive — `bonuses` stays the scannable headline. */
  terms?: SpecialOfferTerms
}

/**
 * The terms a player needs before depositing.
 *
 * Every field is nullable — an offer with none renders exactly as it always did.
 *
 * The money fields are STRINGS, not numbers: a decimal carries no currency and
 * these offers run in EUR, USD and crypto, so "20" beside a bonus is either
 * meaningless or read as the wrong currency. Operators also state ranges
 * ("€20, €50 by wire"), which a number cannot hold.
 */
export interface SpecialOfferTerms {
  /** e.g. "35x (D+B)" — the multiplier and its base are one statement. */
  wagering_requirement: string | null
  min_deposit: string | null
  max_cashout: string | null
  bonus_code: string | null
  /** The operator's own full terms. Rendered beside the CTA, never as fine print. */
  terms_url: string | null
  /** ISO date (YYYY-MM-DD), or null when the offer has no stated end. */
  expires_at: string | null
  /**
   * Resolved server-side so every site agrees on what "expired" means instead of
   * each comparing dates in its own timezone. An expired offer is already
   * excluded from every listing; this flag is for the detail page, which still
   * resolves by direct link and must render it as not claimable.
   */
  expired: boolean
}
