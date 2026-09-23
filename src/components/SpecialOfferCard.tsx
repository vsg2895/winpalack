import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

// Idev Affiliation design: light glass offer card with emerald accents.
//
// `compact` is the home-page strip: four across on desktop, so the type and
// padding step down one size. The full offers listing keeps the default.
export default function SpecialOfferCard({ offer, compact = false }: { offer: SpecialOffer; compact?: boolean }) {
  // Full-bleed banner across the top of the card (prefer the wide banner image).
  const preview = resolveImageUrl(offer.banner_image ?? offer.image_path)

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(79,70,229,0.35)]">
      <Link href={`/special-offers/${offer.slug}`} className="relative block aspect-video overflow-hidden bg-slate-100">
        {preview && <Image src={preview} alt={offer.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes={compact ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 340px' : '(max-width: 768px) 100vw, 400px'} />}
      </Link>
      <div className={`flex flex-1 flex-col gap-2 ${compact ? 'p-4' : 'p-5'}`}>
        <h3 className={`font-display font-semibold leading-tight text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>{offer.title}</h3>
        {offer.bonuses && <p className={`inline-block rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ${compact ? 'text-xs' : 'text-sm'}`}>{offer.bonuses}</p>}
        <span className="text-xs text-amber-400" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}<span className="text-slate-200">{'★'.repeat(5 - offer.rating)}</span></span>
        {/* An offer with no affiliate URL has nothing to claim, so the card
            offers only its details — and that link takes the primary treatment
            rather than sitting alone as a pale outline button, which reads as
            a disabled CTA rather than the one thing there is to do. */}
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            href={`/special-offers/${offer.slug}`}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors ${
              offer.affiliate_url
                ? 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            Details
          </Link>
          {offer.affiliate_url && (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03]">Claim</a>
          )}
        </div>
      </div>
    </article>
  )
}
