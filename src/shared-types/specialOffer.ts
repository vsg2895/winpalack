import type { Casino } from './casino'

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
}
