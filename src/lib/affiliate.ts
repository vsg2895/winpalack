import type { SpecialOffer } from '@shared/types/specialOffer'

/**
 * Where an offer's Claim button points: through /go, never at the operator.
 *
 * /go/<casino>?offer=<slug> resolves the offer's own link server-side, counts
 * the click and keeps the destination editable in the admin — the same route
 * every casino CTA already used. The offer pages and the offer cards linked
 * `affiliate_url` directly, so those clicks went uncounted and a changed link
 * needed a regeneration to reach the page.
 *
 * Falls back to the stored URL only when the offer arrives without its casino,
 * which /go needs to find it; the button then still works rather than vanishing.
 */
export function offerClaimHref(offer: Pick<SpecialOffer, 'slug' | 'affiliate_url' | 'casino'>): string | null {
  const casinoSlug = offer.casino?.slug

  if (casinoSlug) {
    return `/go/${encodeURIComponent(casinoSlug)}?offer=${encodeURIComponent(offer.slug)}`
  }

  return offer.affiliate_url
}
