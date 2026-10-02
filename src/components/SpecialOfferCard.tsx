import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

/**
 * The bonus type whose offers carry a "Claim" call to action.
 *
 * A SLUG, never an id: ids differ between environments and a hardcoded one
 * would pick the wrong type — or none — the moment this ships. The slug is
 * generated once and never regenerated on the server, so it survives an editor
 * renaming the category.
 *
 * WHY A TYPE AND NOT THE LINK. Claim used to appear on any offer that happened
 * to carry an affiliate URL, which made the card's primary action a property of
 * the data rather than an editorial decision: filing a bonus under "Free Spins"
 * or "Cashback" still produced a Claim button, because those offers have links
 * too. Claim now means one thing — this is a Special Offer — and whether the
 * offer has a link of its own no longer decides it.
 */
export const CLAIMABLE_BONUS_CATEGORY = 'special-offers'

// Idev Affiliation design: light glass offer card with emerald accents.
//
// `compact` is the home-page strip: four across on desktop, so the type and
// padding step down one size. The full offers listing keeps the default.
export default function SpecialOfferCard({ offer, compact = false }: { offer: SpecialOffer; compact?: boolean }) {
  // Full-bleed banner across the top of the card (prefer the wide banner image).
  const preview = resolveImageUrl(offer.banner_image ?? offer.image_path)
  // Claim is a property of the bonus TYPE, not of whether a link happens to be
  // filled in. See CLAIMABLE_BONUS_CATEGORY.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(79,70,229,0.35)]">
      {/* NO object-fit on the banner, deliberately.
          `fill` already stretches the image to the box, so the browser's own
          default — `fill` — is what applies: the whole banner is shown, edge to
          edge, with nothing cropped away. `object-cover` used to trim whatever
          did not match the 16:9 box, which took the edges off banners that were
          designed to be read whole. */}
      <Link href={`/special-offers/${offer.slug}`} className="relative block aspect-video overflow-hidden bg-slate-100">
        {preview && <Image src={preview} alt={offer.title} fill className="transition-transform duration-300 group-hover:scale-105" sizes={compact ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 340px' : '(max-width: 768px) 100vw, 400px'} />}
      </Link>
      <div className={`flex flex-1 flex-col gap-2 ${compact ? 'p-4' : 'p-5'}`}>
        {/* WHOSE bonus this is, above its name.
        The title says what the offer gives; a card in a grid of twenty does
        not say who gives it, which is the first thing someone comparing
        offers needs. Bold and in the brand accent so it reads as a byline
        rather than a second heading competing with the title below.
        Rendered only when the casino is loaded — the relation is eager
        loaded on every endpoint that feeds these cards, and a card without
        it simply omits the line rather than printing a blank. */}
        {offer.casino?.name && (
          <p className="text-sm font-bold text-emerald-700">{offer.casino.name}</p>
        )}
        <h3 className={`font-display font-semibold leading-tight text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>{offer.title}</h3>
        {offer.bonuses && <p className={`inline-block rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ${compact ? 'text-xs' : 'text-sm'}`}>{offer.bonuses}</p>}
        <span className="text-xs text-amber-400" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}<span className="text-slate-200">{'★'.repeat(5 - offer.rating)}</span></span>
        {/*
          * Claim belongs to the Special Offers bonus type and to nothing else.
          *
          * Three states, and the middle one is the reason the rule is written
          * this way rather than as `offer.affiliate_url &&`:
          *
          *   Special Offers + link  →  Details (secondary) · Claim → the casino
          *   Special Offers, NO link →  Claim alone, leading to the offer's own
          *                              page, where the terms and the operator
          *                              are. One button rather than two to the
          *                              same place.
          *   any other bonus type   →  Details alone, in the primary treatment,
          *                              because it is then the only thing to do
          *                              and a pale outline button on its own
          *                              reads as a disabled CTA.
          */}
        <div className="mt-auto flex gap-2 pt-2">
          {!(claimable && !offer.affiliate_url) && (
            <Link
              href={`/special-offers/${offer.slug}`}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors ${
                claimable
                  ? 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Details
            </Link>
          )}
          {claimable && (
            offer.affiliate_url ? (
              <a
                href={offer.affiliate_url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03]"
              >
                Claim
              </a>
            ) : (
              // No affiliate URL of its own: the offer's page is the only place
              // that can actually lead to the operator, so Claim goes there
              // rather than nowhere. An internal link, so no sponsored rel.
              <Link
                href={`/special-offers/${offer.slug}`}
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03]"
              >
                Claim
              </Link>
            )
          )}
        </div>
      </div>
    </article>
  )
}
