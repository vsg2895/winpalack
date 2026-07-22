import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

// Idev Affiliation design: light glass offer card with emerald accents.
export default function SpecialOfferCard({ offer }: { offer: SpecialOffer }) {
  // Full-bleed banner across the top of the card (prefer the wide banner image).
  const preview = resolveImageUrl(offer.banner_image ?? offer.image_path)

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(79,70,229,0.35)]">
      <Link href={`/special-offers/${offer.slug}`} className="relative block aspect-video overflow-hidden bg-slate-100">
        {preview && <Image src={preview} alt={offer.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 400px" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-semibold leading-tight text-slate-900">{offer.title}</h3>
        {offer.bonuses && <p className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">{offer.bonuses}</p>}
        <span className="text-xs text-amber-400" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}<span className="text-slate-200">{'★'.repeat(5 - offer.rating)}</span></span>
        <div className="mt-auto flex gap-2 pt-2">
          <Link href={`/special-offers/${offer.slug}`} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700">Details</Link>
          {offer.affiliate_url && (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03]">Claim</a>
          )}
        </div>
      </div>
    </article>
  )
}
